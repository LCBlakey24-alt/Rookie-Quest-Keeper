"""Focused authentication routes for fast password and Google sign-in.

The legacy auth router retains registration, recovery and account management.
This module owns POST /auth/login and POST /auth/google so sign-in uses indexed
Mongo queries and keeps CPU/network-heavy verification outside the async loop.
"""
import os
import re
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from config import db
from models import UserLogin, TokenResponse
from utils.auth import create_token, hash_password, verify_password

router = APIRouter()
AUTH_LOGIN_ROUTE_KEY = ('POST', '/auth/login')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
SAFE_USERNAME_RE = re.compile(r'^[A-Za-z0-9_-]{3,24}$')


class GoogleLoginRequest(BaseModel):
    credential: str
    username: str | None = None


def remove_legacy_auth_login_route(legacy_router) -> int:
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) == AUTH_LOGIN_ROUTE_KEY for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


def login_lookup_query(user_data: UserLogin) -> dict:
    identifier = (user_data.username or user_data.email or '').strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    candidates = []
    if '@' in identifier:
        lower_identifier = identifier.lower()
        candidates.extend([
            {'email': lower_identifier},
            {'username': identifier},
        ])
        if lower_identifier != identifier:
            candidates.append({'username': lower_identifier})
    else:
        candidates.extend([
            {'username': identifier},
            {'email': identifier.lower()},
        ])

    # Preserve the legacy fallbacks while issuing one indexed $or query.
    unique = []
    seen = set()
    for candidate in candidates:
        marker = tuple(candidate.items())
        if marker not in seen:
            seen.add(marker)
            unique.append(candidate)
    return {'$or': unique}


def normalize_google_username(username: str) -> str:
    normalized = (username or '').strip()
    if not SAFE_USERNAME_RE.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Username must be 3-24 characters and use only letters, numbers, underscores, or hyphens',
        )
    return normalized


def suggest_google_username(email: str) -> str:
    local = (email or '').split('@', 1)[0]
    cleaned = re.sub(r'[^A-Za-z0-9_-]', '', local)[:24]
    if len(cleaned) >= 3:
        return cleaned
    return 'Rookie'


def verify_google_credential(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise RuntimeError('Google sign-in is not configured')
    return google_id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        GOOGLE_CLIENT_ID,
    )


def is_google_authoritative_email(claims: dict) -> bool:
    email = str(claims.get('email') or '').lower()
    return email.endswith('@gmail.com') or bool(claims.get('hd'))


def token_payload(user: dict) -> dict:
    return {
        'token': create_token(user['username']),
        'username': user['username'],
        'email': user.get('email'),
        'requires_username': False,
    }


@router.post('/auth/login', response_model=TokenResponse)
async def login_fast(user_data: UserLogin):
    user = await db.users.find_one(login_lookup_query(user_data))
    password_hash = (user or {}).get('password_hash')
    if not user or not password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    password_ok = await run_in_threadpool(verify_password, user_data.password, password_hash)
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    token = create_token(user['username'])
    return TokenResponse(token=token, username=user['username'], email=user.get('email'))


@router.post('/auth/google')
async def login_google(request: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Google sign-in is not configured yet',
        )

    credential = (request.credential or '').strip()
    if not credential:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Google credential is required')

    try:
        claims = await run_in_threadpool(verify_google_credential, credential)
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Google sign-in could not be verified')

    google_sub = str(claims.get('sub') or '').strip()
    google_email = str(claims.get('email') or '').strip().lower()
    email_verified = claims.get('email_verified') is True

    if not google_sub or not google_email or not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Google sign-in could not be verified')

    # The stable Google subject is the primary external identity. Email is only
    # used to link an existing Rookie account when Google is authoritative for it.
    existing_google_user = await db.users.find_one({'google_sub': google_sub})
    if existing_google_user:
        return token_payload(existing_google_user)

    authoritative_email = is_google_authoritative_email(claims)
    existing_email_user = await db.users.find_one({'email': google_email})
    if existing_email_user:
        linked_sub = str(existing_email_user.get('google_sub') or '').strip()
        if linked_sub and linked_sub != google_sub:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='This Rookie Quest account is already linked to another Google account',
            )

        if not authoritative_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='This email already belongs to a Rookie Quest account. Sign in with your password first.',
            )

        await db.users.update_one(
            {'_id': existing_email_user['_id']},
            {'$set': {
                'google_sub': google_sub,
                'google_email': google_email,
                'google_linked_at': datetime.now(timezone.utc).isoformat(),
            }},
        )
        existing_email_user['google_sub'] = google_sub
        existing_email_user['google_email'] = google_email
        return token_payload(existing_email_user)

    if not request.username:
        return {
            'requires_username': True,
            'email': google_email if authoritative_email else None,
            'suggested_username': suggest_google_username(google_email),
        }

    username = normalize_google_username(request.username)
    existing_username = await db.users.find_one({'username': username})
    if existing_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Username already taken')

    # Keep a random, unknown password hash so existing account-management code
    # remains safe for a Google-only account. A trusted recovery email can still
    # establish a password later through the normal reset flow.
    generated_password = secrets.token_urlsafe(32)
    password_hash = await run_in_threadpool(hash_password, generated_password)

    user_doc = {
        'id': str(uuid.uuid4()),
        'username': username,
        'password_hash': password_hash,
        'google_sub': google_sub,
        'google_email': google_email,
        'auth_provider': 'google',
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    if authoritative_email:
        user_doc['email'] = google_email

    await db.users.insert_one(user_doc)
    return token_payload(user_doc)

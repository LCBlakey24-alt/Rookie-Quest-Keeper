"""Focused fast-path login route.

The legacy auth router retains registration, recovery and account management.
This module owns only POST /auth/login so sign-in uses one indexed Mongo query
and does CPU-heavy password verification outside the async event loop.
"""
from fastapi import APIRouter, HTTPException, status
from starlette.concurrency import run_in_threadpool

from config import db
from models import UserLogin, TokenResponse
from utils.auth import create_token, verify_password

router = APIRouter()
AUTH_LOGIN_ROUTE_KEY = ('POST', '/auth/login')


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


@router.post('/auth/login', response_model=TokenResponse)
async def login_fast(user_data: UserLogin):
    user = await db.users.find_one(login_lookup_query(user_data))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    password_ok = await run_in_threadpool(verify_password, user_data.password, user['password_hash'])
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    token = create_token(user['username'])
    return TokenResponse(token=token, username=user['username'], email=user.get('email'))

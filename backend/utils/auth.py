"""Authentication and access utilities."""
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, security, ADMIN_USERNAMES, AI_MONTHLY_LIMIT


def create_token(username: str) -> str:
    payload = {
        'sub': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['sub']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get('sub')
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = await db.users.find_one({'username': username}, {'_id': 0})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


async def verify_campaign_ownership(campaign_id: str, username: str) -> None:
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 1})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found or access denied")


async def verify_campaign_membership(campaign_id: str, username: str) -> dict:
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.get('dm_user_id') == username:
        return campaign
    player_character = await db.player_characters.find_one({
        'user_id': username, 'campaign_id': campaign_id
    }, {'_id': 1})
    if player_character:
        return campaign
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this campaign")


async def is_admin(username: str) -> bool:
    if not username:
        return False
    # Case-insensitive match so capitalized usernames (e.g. "LCBlakey24") still grant admin
    admins = {a.lower() for a in ADMIN_USERNAMES}
    return username.lower() in admins


async def check_ai_access(username: str, feature: str = 'ai') -> bool:
    """Return whether this user is under their monthly AI request cap.

    Admins are always allowed. If AI_MONTHLY_LIMIT is 0 the cap is disabled.
    The counter is stored in the `ai_usage` collection, one document per request.
    """
    if AI_MONTHLY_LIMIT == 0:
        return True
    if await is_admin(username):
        return True
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    count = await db.ai_usage.count_documents({"username": username, "month": current_month})
    return count < AI_MONTHLY_LIMIT


async def record_ai_usage(username: str):
    """Insert one usage record for the current month."""
    now = datetime.now(timezone.utc)
    await db.ai_usage.insert_one({
        "username": username,
        "month": now.strftime("%Y-%m"),
        "timestamp": now.isoformat(),
    })


async def get_campaign_rule_system(campaign_id: str) -> Dict[str, Any]:
    """Get the rule system for a campaign."""
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        return None
    system_name = campaign.get('system', 'Fantasy d20')
    system = await db.rule_systems.find_one({'name': {'$regex': system_name, '$options': 'i'}}, {'_id': 0})
    if not system:
        system = await db.rule_systems.find_one({'short_code': {'$regex': system_name.replace(' ', '_').lower(), '$options': 'i'}}, {'_id': 0})
    return system

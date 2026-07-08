"""Authentication routes: register, login, password reset, account management."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, RESEND_API_KEY, SENDER_EMAIL, APP_URL, logger
from utils.auth import (
    get_current_user, hash_password, verify_password, create_token,
)
from models import (
    UserRegister, UserLogin, TokenResponse, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest, UpdateAccountRequest
)
import uuid
import secrets
import re
from datetime import datetime, timezone, timedelta
import resend

if RESEND_API_KEY and RESEND_API_KEY != 'your_resend_api_key_here':
    resend.api_key = RESEND_API_KEY

router = APIRouter()

SAFE_USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,24}$")


def normalize_username_for_auth(username: str) -> str:
    """Trim and validate usernames for kid-friendly, email-free auth."""
    normalized = (username or "").strip()
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")
    if "@" in normalized or not SAFE_USERNAME_RE.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-24 characters and use only letters, numbers, underscores, or hyphens",
        )
    return normalized


async def cleanup_user_account(username: str) -> dict:
    """Delete user-owned and campaign-owned records for account deletion.

    This intentionally covers the common ownership field names used across the
    app. Missing collections are harmless in MongoDB; this keeps the cleanup
    future-friendly as features are added.
    """
    user = await db.users.find_one({'username': username}, {'_id': 0})
    email = (user or {}).get('email', '').lower()

    owned_campaigns = await db.campaigns.find({
        '$or': [
            {'dm_user_id': username},
            {'user_id': username},
            {'created_by': username},
        ]
    }, {'_id': 0, 'id': 1}).to_list(None)
    campaign_ids = [c.get('id') for c in owned_campaigns if c.get('id')]

    deleted = {}

    async def delete_many(collection_name: str, query: dict):
        result = await getattr(db, collection_name).delete_many(query)
        deleted[collection_name] = deleted.get(collection_name, 0) + result.deleted_count

    # User-owned records.
    user_owned_collections = [
        'player_characters',
        'player_journal',
        'custom_creatures',
        'reviews',
        'user_rulesets',
        'user_playtest_packs',
        'user_playtest_content',
        'user_races',
        'user_classes',
        'user_subclasses',
        'user_backgrounds',
        'user_feats',
        'user_spells',
        'user_magic_items',
        'homebrew_items',
        'character_templates',
        'campaign_invites',
        'ai_usage',
    ]
    user_query = {
        '$or': [
            {'user_id': username},
            {'username': username},
            {'created_by': username},
            {'owner_id': username},
            {'dm_user_id': username},
        ]
    }
    for collection in user_owned_collections:
        await delete_many(collection, user_query)

    # Password reset records can be keyed by email rather than username.
    if email:
        await delete_many('password_resets', {'email': email})

    # Campaign membership records where this user is a player (not the owner).
    # These are indexed by user_id rather than campaign_id so they need a separate pass.
    await delete_many('campaign_members', {
        '$or': [{'user_id': username}, {'username': username}]
    })

    # Campaign-owned records for campaigns created by this user.
    if campaign_ids:
        campaign_query = {'campaign_id': {'$in': campaign_ids}}
        campaign_owned_collections = [
            'campaigns',
            'campaign_settings',
            'locations',
            'gods',
            'calendars',
            'calendar_events',
            'npcs',
            'notes',
            'combat_encounters',
            'combat_sessions',
            'maps',
            'world_maps',
            'local_maps',
            'campaign_maps',
            'campaign_uploads',
            'campaign_races',
            'campaign_classes',
            'campaign_subclasses',
            'campaign_backgrounds',
            'campaign_feats',
            'campaign_rulesets',
            'campaign_items',
            'inventory_items',
            'events',
            'event_results',
            'session_recaps',
            'campaign_tokens',
            'handouts',
        ]
        for collection in campaign_owned_collections:
            if collection == 'campaigns':
                await delete_many(collection, {'id': {'$in': campaign_ids}})
            else:
                await delete_many(collection, campaign_query)

        # Unlink any remaining player characters from deleted campaigns.
        await db.player_characters.update_many(
            {'campaign_id': {'$in': campaign_ids}},
            {'$set': {'campaign_id': None, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )

    # Finally delete the user record.
    await delete_many('users', {'username': username})

    return {
        'username': username,
        'campaign_ids': campaign_ids,
        'deleted': deleted,
    }


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    normalized_username = normalize_username_for_auth(user_data.username)
    normalized_email = user_data.email.lower() if user_data.email else None

    if normalized_email:
        existing_email = await db.users.find_one({'email': normalized_email})
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Check if username already exists
    existing_user = await db.users.find_one({'username': normalized_username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    user_doc = {
        'id': str(uuid.uuid4()),
        'username': normalized_username,
        'password_hash': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    if normalized_email:
        user_doc['email'] = normalized_email
    
    await db.users.insert_one(user_doc)

    token = create_token(normalized_username)
    
    return TokenResponse(token=token, username=normalized_username, email=normalized_email)

@router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    identifier = (user_data.username or user_data.email or '').strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    lookup_candidates = []
    if '@' in identifier:
        lower_identifier = identifier.lower()
        lookup_candidates.append({'email': lower_identifier})
        # Legacy accounts may have been created before optional recovery email
        # support, with the email address stored directly as username.
        lookup_candidates.append({'username': identifier})
        if lower_identifier != identifier:
            lookup_candidates.append({'username': lower_identifier})
    else:
        lookup_candidates.append({'username': identifier})
        # Compatibility for older clients that may still send an email in a generic field.
        lookup_candidates.append({'email': identifier.lower()})

    user = None
    for lookup in lookup_candidates:
        user = await db.users.find_one(lookup)
        if user:
            break

    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_token(user['username'])
    return TokenResponse(token=token, username=user['username'], email=user.get('email'))

# ==================== PASSWORD RESET ====================

@router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({'email': request.email.lower()})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token in database
    await db.password_resets.delete_many({'email': request.email.lower()})  # Remove old tokens
    await db.password_resets.insert_one({
        'email': request.email.lower(),
        'token': reset_token,
        'expires_at': expires_at.isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Send email
    reset_link = f"{APP_URL}/reset-password?token={reset_token}"
    
    if RESEND_API_KEY and RESEND_API_KEY != 'your_resend_api_key_here':
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": [request.email.lower()],
                "subject": "Reset Your Rookie Quest Keeper Password",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #14b8a6;">Rookie Quest Keeper</h1>
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the button below to set a new password:</p>
                    <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0d9488); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">{reset_link}</p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
                """
            })
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            # Don't reveal email sending failures
    
    return {"message": "If an account exists with this email, a reset link has been sent"}

@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    reset_record = await db.password_resets.find_one({'token': request.token})
    
    if not reset_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    
    # Check if token expired
    expires_at = datetime.fromisoformat(reset_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({'token': request.token})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")
    
    # Update password
    password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {'email': reset_record['email']},
        {'$set': {'password_hash': password_hash}}
    )
    
    # Delete reset token
    await db.password_resets.delete_one({'token': request.token})
    
    return {"message": "Password reset successful"}

@router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_username: str = Depends(get_current_user)):
    """Change password for authenticated user"""
    user = await db.users.find_one({'username': current_username})
    if not user or not verify_password(request.current_password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {'username': current_username},
        {'$set': {'password_hash': new_hash}}
    )
    
    return {"message": "Password changed successfully"}

@router.get("/auth/me")
async def get_me(current_username: str = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({'username': current_username}, {'password_hash': 0, '_id': 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"username": user['username'], "email": user.get('email'), "created_at": user.get('created_at')}

@router.patch("/auth/me")
async def update_me(request: UpdateAccountRequest, current_username: str = Depends(get_current_user)):
    """Update current user's account details."""
    updates = {}
    if request.email is not None:
        email = request.email.lower().strip() if request.email else None
        if email:
            existing = await db.users.find_one({'email': email, 'username': {'$ne': current_username}})
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        updates['email'] = email

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid updates provided")

    await db.users.update_one({'username': current_username}, {'$set': updates})
    return {"message": "Account updated successfully", **updates}

@router.delete("/auth/me")
async def delete_me(current_username: str = Depends(get_current_user)):
    """Delete the authenticated user's account and owned content."""
    result = await cleanup_user_account(current_username)
    return {"message": "Account deleted", **result}

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
from datetime import datetime, timezone, timedelta
import resend

if RESEND_API_KEY and RESEND_API_KEY != 'your_resend_api_key_here':
    resend.api_key = RESEND_API_KEY

router = APIRouter()


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
        'user_races',
        'user_classes',
        'user_subclasses',
        'user_backgrounds',
        'user_feats',
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
    # Check if email already exists
    existing_email = await db.users.find_one({'email': user_data.email.lower()})
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Check if username already exists
    existing_user = await db.users.find_one({'username': user_data.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    user_doc = {
        'id': str(uuid.uuid4()),
        'email': user_data.email.lower(),
        'username': user_data.username,
        'password_hash': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)

    token = create_token(user_data.username)
    
    return TokenResponse(token=token, username=user_data.username, email=user_data.email.lower())

@router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({'email': user_data.email.lower()})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_token(user['username'])
    return TokenResponse(token=token, username=user['username'], email=user['email'])

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
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Rookie Quest Keeper - Your Ultimate GM Companion</p>
                </div>
                """
            })
            logger.info(f"Password reset email sent to {request.email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            # Still return success to prevent enumeration
    else:
        logger.warning(f"Resend not configured. Reset token: {reset_token}")
    
    return {"message": "If an account exists with this email, a reset link has been sent"}

@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    reset_record = await db.password_resets.find_one({'token': request.token})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record['expires_at'].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({'token': request.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    await db.users.update_one(
        {'email': reset_record['email']},
        {'$set': {'password_hash': hash_password(request.new_password)}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({'token': request.token})
    
    return {"message": "Password reset successfully"}

# ==================== ACCOUNT MANAGEMENT ====================

@router.post("/account/change-password")
async def change_password(request: ChangePasswordRequest, username: str = Depends(get_current_user)):
    """Change password for logged-in user"""
    user = await db.users.find_one({'username': username})
    
    if not verify_password(request.current_password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one(
        {'username': username},
        {'$set': {'password_hash': hash_password(request.new_password)}}
    )
    
    return {"message": "Password changed successfully"}

@router.put("/account/update")
async def update_account(request: UpdateAccountRequest, username: str = Depends(get_current_user)):
    """Update username or email"""
    updates = {}
    
    if request.username and request.username != username:
        # Check if new username is taken
        existing = await db.users.find_one({'username': request.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        updates['username'] = request.username
        
        # Also update username in campaigns
        await db.campaigns.update_many(
            {'user_id': username},
            {'$set': {'user_id': request.username}}
        )
        await db.campaigns.update_many(
            {'dm_user_id': username},
            {'$set': {'dm_user_id': request.username}}
        )
    
    if request.email:
        # Check if new email is taken
        existing = await db.users.find_one({'email': request.email.lower()})
        if existing and existing['username'] != username:
            raise HTTPException(status_code=400, detail="Email already registered")
        updates['email'] = request.email.lower()
    
    if updates:
        await db.users.update_one({'username': username}, {'$set': updates})
    
    # Get updated user
    new_username = updates.get('username', username)
    user = await db.users.find_one({'username': new_username})
    
    # Generate new token if username changed
    token = create_token(new_username)
    
    return {
        "message": "Account updated successfully",
        "token": token,
        "username": new_username,
        "email": user['email']
    }

@router.get("/account/profile")
async def get_account_profile(username: str = Depends(get_current_user)):
    """Get current user's account details"""
    user = await db.users.find_one({'username': username}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/account/delete")
async def delete_account(username: str = Depends(get_current_user)):
    """Delete user account and associated owned data."""
    summary = await cleanup_user_account(username)
    logger.info(f"Deleted account {username}: {summary}")
    return {"message": "Account deleted successfully"}

@router.get("/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    user = await db.users.find_one({'username': username}, {'_id': 0, 'password_hash': 0})
    return user

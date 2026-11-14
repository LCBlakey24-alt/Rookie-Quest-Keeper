"""Authentication routes: register, login, password reset, account management."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import (
    db, RESEND_API_KEY, SENDER_EMAIL, APP_URL, logger,
    AI_CONSENT_POLICY_VERSION,
)
from utils.account_profile import public_account_profile
from utils.admin_identity import USERNAME_UNAVAILABLE, username_is_available
from utils.site_settings import require_signups_enabled
from utils.auth import (
    get_current_user, hash_password, verify_password, create_token, session_version,
    get_ai_consent_status,
)
from models import (
    UserRegister, UserLogin, TokenResponse, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest, UpdateAccountRequest,
    RookAiConsentUpdate,
)
import uuid
import secrets
import re
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone, timedelta
import resend
from utils.ws_session import end_live_sessions
from utils.campaign_cleanup_scope import (
    CAMPAIGN_SWEEP_EXCLUSIONS,
    USER_HOMEBREW_CAMPAIGN_REFERENCES,
    USER_PLAYTEST_CAMPAIGN_REFERENCES,
)
from starlette.concurrency import run_in_threadpool

EMAIL_DELIVERY_CONFIGURED = bool(RESEND_API_KEY) and RESEND_API_KEY != 'your_resend_api_key_here'

if EMAIL_DELIVERY_CONFIGURED:
    resend.api_key = RESEND_API_KEY
else:
    # Without this warning a misconfigured deployment looks healthy: password
    # recovery still answers "a reset link has been sent", the token is still
    # stored, and nothing anywhere records that no email left the building.
    # The first sign of trouble is a locked-out player, which is exactly the
    # failure this is meant to surface early.
    logger.warning(
        "RESEND_API_KEY is not configured: password reset emails cannot be sent. "
        "Password recovery will accept requests and silently deliver nothing."
    )

router = APIRouter()

SAFE_USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,24}$")


@router.get("/auth/ai-consent")
async def get_rook_ai_consent(username: str = Depends(get_current_user)):
    """Read only the signed-in account's current Rook AI choice."""
    return await get_ai_consent_status(username)


@router.put("/auth/ai-consent")
async def update_rook_ai_consent(
    request: RookAiConsentUpdate,
    username: str = Depends(get_current_user),
):
    """Grant or withdraw optional Rook AI permission for this account."""
    now = datetime.now(timezone.utc).isoformat()
    consent = {
        'granted': request.granted,
        'policy_version': AI_CONSENT_POLICY_VERSION,
        'updated_at': now,
    }
    result = await db.users.update_one(
        {'username': username},
        {'$set': {'rook_ai_consent': consent}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return await get_ai_consent_status(username)

# These collections can reference an owned campaign but contain records that
# belong to another person. Keep them, then unlink them explicitly below.
# Personal records that should be removed when the account itself is deleted,
# even when they belong to a campaign owned by somebody else.
USER_OWNED_COLLECTIONS = [
    'player_characters',
    'player_journal',
    'player_notes',
    'player_handouts',
    'session_recaps',
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
    'user_npcs',
    'user_monsters',
    'user_custom_rules',
    'homebrew_items',
    'character_templates',
    'improvement_feedback',
    'players',
    'campaign_invites',
    'combat_initiative_submissions',
    'roll_events',
    'ai_usage',
]


def normalize_username_for_auth(username: str) -> str:
    """Trim and validate a stable internal username."""
    normalized = (username or "").strip()
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required")
    if "@" in normalized or not SAFE_USERNAME_RE.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-24 characters and use only letters, numbers, underscores, or hyphens",
        )
    return normalized


def username_stem_from_email(email: str) -> str:
    """Make a safe, non-secret handle from the email local part."""
    stem = re.sub(r'[^A-Za-z0-9_-]+', '', email.split('@', 1)[0]).lower()[:24]
    return (stem or 'player').ljust(3, '0')


async def cleanup_user_account(username: str) -> dict:
    """Delete the account, its personal records, and all data owned by its campaigns.

    Campaign data is swept by campaign_id across the live database rather than
    relying on a brittle hand-written feature list. This keeps account deletion
    correct when new campaign collections are added. Other users' character
    sheets and personal notes are protected from the sweep and unlinked instead.
    """
    # Keep Mongo's stable _id as well as the email. Older custom_rulesets
    # reference str(_id), whereas the rest of Keeper usually uses username.
    user = await db.users.find_one({'username': username}, {'email': 1})
    email = (user or {}).get('email', '').lower()
    mongo_user_id = str(user['_id']) if user and user.get('_id') is not None else None

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
        result = await db[collection_name].delete_many(query)
        deleted[collection_name] = deleted.get(collection_name, 0) + result.deleted_count

    user_query = {
        '$or': [
            {'user_id': username},
            {'username': username},
            {'created_by': username},
            {'owner_id': username},
            {'dm_user_id': username},
        ]
    }
    for collection in USER_OWNED_COLLECTIONS:
        await delete_many(collection, user_query)

    if email:
        await delete_many('password_resets', {'email': email})

    if mongo_user_id:
        # Legacy custom rulesets store Mongo user IDs, not the JWT username.
        # Delete the user's own uploads and unlink them from other users' shares.
        await delete_many('custom_rulesets', {'owner_id': mongo_user_id})
        await db.custom_rulesets.update_many(
            {'shared_with': mongo_user_id},
            {'$pull': {'shared_with': mongo_user_id}},
        )

    # Remove this user's membership records even for campaigns they do not own.
    await delete_many('campaign_members', {
        '$or': [{'user_id': username}, {'username': username}]
    })

    if campaign_ids:
        campaign_query = {'campaign_id': {'$in': campaign_ids}}

        # Remove every campaign-scoped record, including newer features such as
        # quests, story arcs, tables, display/live state, roll events, event
        # economy, current inventory and future campaign-scoped collections.
        collection_names = await db.list_collection_names()
        for collection_name in collection_names:
            if collection_name in CAMPAIGN_SWEEP_EXCLUSIONS:
                continue
            await delete_many(collection_name, campaign_query)

        # Other players own their character sheets. Detach them instead of
        # deleting them when the GM removes their account/campaign.
        await db.player_characters.update_many(
            {'campaign_id': {'$in': campaign_ids}},
            {
                '$set': {
                    'campaign_id': None,
                    'campaign_name': None,
                    'campaign_join_status': 'removed',
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
            }
        )

        # Personal player notes and journals remain personal; only their live
        # campaign link is removed so they cannot point at a deleted campaign id.
        now = datetime.now(timezone.utc).isoformat()
        for collection_name in ('player_notes', 'player_journal'):
            await db[collection_name].update_many(
                {'campaign_id': {'$in': campaign_ids}},
                {'$set': {'campaign_id': None, 'updated_at': now}}
            )

        # Other users' homebrew and playtest content only references these
        # campaigns: it stays theirs. Homebrew becomes private and unscoped,
        # playtest content is unlinked -- exactly as campaign deletion does.
        # (This account's own copies were already deleted above.)
        for collection_name in USER_HOMEBREW_CAMPAIGN_REFERENCES:
            await db[collection_name].update_many(
                {'campaign_id': {'$in': campaign_ids}},
                {'$set': {'campaign_id': None, 'visibility': 'private', 'updated_at': now}}
            )
        for collection_name in USER_PLAYTEST_CAMPAIGN_REFERENCES:
            await db[collection_name].update_many(
                {'campaign_id': {'$in': campaign_ids}},
                {'$set': {'campaign_id': None, 'updated_at': now}}
            )

        await delete_many('campaigns', {'id': {'$in': campaign_ids}})

    await delete_many('users', {'username': username})

    return {
        'username': username,
        'campaign_ids': campaign_ids,
        'deleted': deleted,
    }


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    await require_signups_enabled()
    normalized_email = str(user_data.email).lower()
    requested_username = normalize_username_for_auth(user_data.username) if user_data.username else None

    if await db.users.find_one({'email': normalized_email}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    stem = requested_username or username_stem_from_email(normalized_email)
    user_doc = {
        'id': str(uuid.uuid4()),
        'email': normalized_email,
        'password_hash': hash_password(user_data.password),
        'password_login_enabled': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    # Username remains the JWT subject and ownership key. The unique indexes
    # also protect against concurrent registrations choosing the same handle.
    for suffix in range(0, 10000):
        suffix_text = str(suffix + 1) if suffix else ''
        normalized_username = stem[:24 - len(suffix_text)] + suffix_text
        if not await username_is_available(normalized_username):
            if requested_username:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_UNAVAILABLE)
            continue
        try:
            await db.users.insert_one({**user_doc, 'username': normalized_username})
            break
        except DuplicateKeyError:
            if await db.users.find_one({'email': normalized_email}):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            if requested_username:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_UNAVAILABLE)
    else:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not create an account handle")

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
        lookup_candidates.append({'username': identifier})
        if lower_identifier != identifier:
            lookup_candidates.append({'username': lower_identifier})
    else:
        lookup_candidates.append({'username': identifier})
        lookup_candidates.append({'email': identifier.lower()})

    user = None
    for lookup in lookup_candidates:
        user = await db.users.find_one(lookup)
        if user:
            break

    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_token(user['username'], session_version(user))
    return TokenResponse(token=token, username=user['username'], email=user.get('email'))


# ==================== PASSWORD RESET ====================

def _email_domain(address: str) -> str:
    """The domain of an address, for logs. Never log the full address."""
    _, _, domain = (address or "").partition("@")
    return domain.lower() or "unknown"


@router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request a recovery link without exposing whether the address belongs to an account.

    Store a fresh token before handing the message to Resend, but do not
    invalidate earlier delivered links until the new send is accepted.
    """
    generic_response = {"message": "If an account exists with this email, a reset link will be sent"}

    # This outage affects *all* addresses, so reporting it is not enumeration.
    # Never imply delivery when the service has no usable sending credentials.
    if not EMAIL_DELIVERY_CONFIGURED:
        logger.error("Password recovery unavailable: RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery is temporarily unavailable. Please try again later.",
        )

    email = str(request.email).strip().lower()
    user = await db.users.find_one({'email': email})
    if not user:
        return generic_response

    reset_token = secrets.token_urlsafe(32)
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(hours=1)

    await db.password_resets.insert_one({
        'email': email,
        'token': reset_token,
        'expires_at': expires_at.isoformat(),
        'created_at': created_at.isoformat(),
    })
    reset_link = f"{APP_URL.rstrip('/')}/reset-password?token={reset_token}"

    try:
        # The pinned Resend Python SDK's send method is synchronous; run it
        # off the FastAPI event loop so a slow provider does not block requests.
        provider_result = await run_in_threadpool(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Reset Your Rookie Quest Keeper Password",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0B1B2B;">Rookie Quest Keeper</h1>
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password. Click below to choose a new password:</p>
                <a href="{reset_link}" style="display: inline-block; background: #0B1B2B; color: #EADFC8; padding: 12px 24px; border-radius: 8px 8px 0 0; text-decoration: none; font-weight: bold; margin: 20px 0 0;">Reset Password</a>
                <div aria-hidden="true" style="height: 3px; width: 155px; background: #FF8A1F; background: linear-gradient(90deg, #FF8A1F 0%, #FF8A1F 28%, #F4551F 50%, #E03A2F 72%, #E03A2F 100%); margin-bottom: 20px;"></div>
                <p>Or paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_link}</p>
                <p><strong>This link expires in 1 hour.</strong></p>
                <p>If you didn't request this, you can ignore this email.</p>
            </div>
            """,
        })
        # The Python Resend SDK reports successful submission with an email ID.
        # Treat an empty/invalid response as a failed handoff, not success.
        if not isinstance(provider_result, dict) or not provider_result.get('id'):
            raise RuntimeError("Resend did not confirm an email ID")
    except Exception as exc:
        # Avoid invalidating a previously delivered, still-valid reset link.
        await db.password_resets.delete_one({'token': reset_token})
        # Never log the full address, token or reset URL.
        logger.error(
            "Password recovery email handoff failed (%s address, error type: %s)",
            _email_domain(email), type(exc).__name__,
        )
        # Keep the same public response for unknown addresses and failed
        # sends: provider errors must not become an account-enumeration oracle.
        return generic_response

    # Only retire requests that existed before this one. Two sends can overlap:
    # deleting every other token would let each successful send delete the
    # other's token, leaving neither email usable. Legacy records without a
    # creation timestamp predate this request and can also be retired.
    await db.password_resets.delete_many({
        'email': email,
        '$or': [
            {'created_at': {'$lt': created_at.isoformat()}},
            {'created_at': {'$exists': False}},
        ],
    })
    logger.info("Password recovery email accepted by provider for a %s address", _email_domain(email))
    return generic_response


@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    # Consume the token atomically: overlapping requests cannot both reset it.
    reset_record = await db.password_resets.find_one_and_delete({'token': request.token})
    
    if not reset_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    
    expires_at = datetime.fromisoformat(reset_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")
    
    password_hash = hash_password(request.new_password)
    # Bumping token_version signs out every existing session for this account.
    # Older accounts may store it as a string (or omit it). Convert and bump
    # in one atomic update so concurrent password changes cannot reuse a
    # session version, and an otherwise valid reset link is not lost to $inc
    # failing on a legacy value.
    result = await db.users.update_one(
        {'email': reset_record['email']},
        [{
            '$set': {
                # Password hashes start with '$'; keep MongoDB from treating
                # the hash as an aggregation field reference.
                'password_hash': {'$literal': password_hash},
                'password_login_enabled': True,
                'token_version': {'$add': [
                    {'$convert': {'input': '$token_version', 'to': 'long', 'onError': 0, 'onNull': 0}},
                    1,
                ]},
            }
        }]
    )
    
    if result.matched_count != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link is no longer valid")
    # Every token was just retired; end the live sockets that used them.
    # Best effort: the reset has already succeeded, and the periodic socket
    # recheck ends these sessions anyway if this lookup cannot run.
    try:
        reset_user = await db.users.find_one({'email': reset_record['email']}, {'_id': 0, 'username': 1})
        await end_live_sessions((reset_user or {}).get('username'))
    except Exception:
        pass
    return {"message": "Password reset successful"}


@router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_username: str = Depends(get_current_user)):
    """Change password for authenticated user"""
    user = await db.users.find_one({'username': current_username})
    if not user or not verify_password(request.current_password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    
    new_hash = hash_password(request.new_password)
    # Sign out every other session (stolen or forgotten devices) by bumping the
    # session version, and hand this device a fresh token so it stays signed in.
    new_version = session_version(user) + 1
    # Only update the exact credentials and session version we verified. A
    # concurrent reset or change must not be overwritten by this stale read,
    # nor may two changes mint tokens with the same new version. Preserve
    # compatibility with legacy missing or string-valued versions.
    version_match = user['token_version'] if 'token_version' in user else {'$exists': False}
    result = await db.users.update_one(
        {'username': current_username, 'password_hash': user['password_hash'], 'token_version': version_match},
        {'$set': {'password_hash': new_hash, 'token_version': new_version}}
    )
    if result.matched_count != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    # Older tokens are retired, including the one this device's socket was
    # opened with; it reconnects with the fresh token returned below.
    await end_live_sessions(current_username)

    return {
        "message": "Password changed successfully",
        "token": create_token(current_username, new_version),
    }


@router.get("/auth/me")
async def get_me(current_username: str = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({'username': current_username}, {'password_hash': 0, '_id': 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return public_account_profile(user)


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

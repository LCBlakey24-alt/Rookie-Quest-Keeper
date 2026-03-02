from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import base64
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRegister(BaseModel):
    username: str
    password: str
    referral_code: Optional[str] = None  # Optional referral code from friend

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dm_user_id: str
    name: str
    description: str = ""
    system: str = "D&D 5e 2024"  # TTRPG system
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    system: str = "D&D 5e 2024"

class CampaignSetting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    content: str = ""
    dm_rules: str = ""  # Custom DM rules reference
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignSettingUpdate(BaseModel):
    content: Optional[str] = None
    dm_rules: Optional[str] = None

class God(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    domain: str = ""
    description: str = ""
    symbol: str = ""
    alignment: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GodCreate(BaseModel):
    name: str
    domain: str = ""
    description: str = ""
    symbol: str = ""
    alignment: str = ""
    notes: str = ""

class GodUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    symbol: Optional[str] = None
    alignment: Optional[str] = None
    notes: Optional[str] = None

class PlaceOfInterest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    place_type: str = ""  # shop, tavern, temple, blacksmith, inn, guild, etc
    description: str = ""
    owner: str = ""  # NPC who runs the place
    services: str = ""  # What services/items they offer
    notes: str = ""

class PlaceOfInterestCreate(BaseModel):
    name: str
    place_type: str = ""
    description: str = ""
    owner: str = ""
    services: str = ""
    notes: str = ""

class PlaceOfInterestUpdate(BaseModel):
    name: Optional[str] = None
    place_type: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    services: Optional[str] = None
    notes: Optional[str] = None

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    location_type: str = ""  # city, dungeon, wilderness, etc
    description: str = ""
    notable_npcs: str = ""
    notes: str = ""
    places_of_interest: List[Dict[str, Any]] = []  # List of places within this location
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocationCreate(BaseModel):
    name: str
    location_type: str = ""
    description: str = ""
    notable_npcs: str = ""
    notes: str = ""
    places_of_interest: List[Dict[str, Any]] = []

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[str] = None
    description: Optional[str] = None
    notable_npcs: Optional[str] = None
    notes: Optional[str] = None
    places_of_interest: Optional[List[Dict[str, Any]]] = None

class Calendar(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    calendar_type: str = "custom"  # custom, gregorian, forgotten_realms
    current_day: int = 1
    current_month: int = 1
    current_year: int = 1
    custom_months: List[Dict[str, Any]] = []  # [{"name": "January", "days": 31}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CalendarUpdate(BaseModel):
    calendar_type: Optional[str] = None
    current_day: Optional[int] = None
    current_month: Optional[int] = None
    current_year: Optional[int] = None
    custom_months: Optional[List[Dict[str, Any]]] = None

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    description: str = ""
    day: int
    month: int
    year: int
    is_recurring: bool = False
    recurrence_type: str = "none"  # none, annual, monthly, weekly
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CalendarEventCreate(BaseModel):
    name: str
    description: str = ""
    day: int
    month: int
    year: int
    is_recurring: bool = False
    recurrence_type: str = "none"

class CalendarEventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    day: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None

class CombatScenario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    description: str = ""
    combatants: List[Dict[str, Any]] = []  # Pre-configured combatant list
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CombatScenarioCreate(BaseModel):
    name: str
    description: str = ""
    combatants: List[Dict[str, Any]] = []

class CombatScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    combatants: Optional[List[Dict[str, Any]]] = None

class InGameNote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    content: str
    session_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ai_processed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InGameNoteCreate(BaseModel):
    content: str
    session_date: Optional[str] = None

class PlayerStats(BaseModel):
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    character_class: str = ""
    level: int = 1
    hp: int = 10
    max_hp: int = 10
    ac: int = 10
    stats: PlayerStats = Field(default_factory=PlayerStats)
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerCreate(BaseModel):
    name: str
    character_class: str = ""
    level: int = 1
    hp: int = 10
    max_hp: int = 10
    ac: int = 10
    stats: Optional[PlayerStats] = None
    notes: str = ""

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    character_class: Optional[str] = None
    level: Optional[int] = None
    hp: Optional[int] = None
    max_hp: Optional[int] = None
    ac: Optional[int] = None
    stats: Optional[PlayerStats] = None
    notes: Optional[str] = None

class NPC(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    description: str = ""
    hp: int = 10
    ac: int = 10
    location: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NPCCreate(BaseModel):
    name: str
    description: str = ""
    hp: int = 10
    ac: int = 10
    location: str = ""
    notes: str = ""

class NPCUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hp: Optional[int] = None
    ac: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class InitiativeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # "player", "npc", "monster"
    entity_id: str
    name: str
    initiative_value: int
    hp: int
    max_hp: int
    ac: int
    notes: str = ""

class Initiative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    entries: List[InitiativeEntry] = []
    current_turn: int = 0
    round_number: int = 1
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InitiativeCreate(BaseModel):
    entries: List[InitiativeEntry] = []

class InitiativeUpdate(BaseModel):
    entries: Optional[List[InitiativeEntry]] = None
    current_turn: Optional[int] = None
    round_number: Optional[int] = None
    is_active: Optional[bool] = None

class Token(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_type: str  # "player", "npc", "monster"
    name: str
    x: float
    y: float
    color: str = "#ff0000"

class GameMap(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    image_data: str = ""  # Base64 encoded image
    tokens: List[Token] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameMapCreate(BaseModel):
    name: str
    image_data: str = ""

class GameMapUpdate(BaseModel):
    name: Optional[str] = None
    image_data: Optional[str] = None
    tokens: Optional[List[Token]] = None

class AIGenerationRequest(BaseModel):
    prompt: str
    generation_type: str  # "encounter", "trap", "npc", "world"

class AIGenerationResponse(BaseModel):
    content: str
    generation_type: str

# Party Inventory Models
class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    quantity: int = 1
    item_type: str = "misc"  # weapon, armor, potion, scroll, misc, currency, magic_item
    description: str = ""
    value: str = ""  # e.g., "50 gp"
    weight: float = 0.0
    is_magical: bool = False
    attunement_required: bool = False
    attuned_to: str = ""  # Player name if attuned
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InventoryItemCreate(BaseModel):
    name: str
    quantity: int = 1
    item_type: str = "misc"
    description: str = ""
    value: str = ""
    weight: float = 0.0
    is_magical: bool = False
    attunement_required: bool = False
    attuned_to: str = ""
    notes: str = ""

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    item_type: Optional[str] = None
    description: Optional[str] = None
    value: Optional[str] = None
    weight: Optional[float] = None
    is_magical: Optional[bool] = None
    attunement_required: Optional[bool] = None
    attuned_to: Optional[str] = None
    notes: Optional[str] = None

class PartyCurrency(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    copper: int = 0
    silver: int = 0
    electrum: int = 0
    gold: int = 0
    platinum: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PartyCurrencyUpdate(BaseModel):
    copper: Optional[int] = None
    silver: Optional[int] = None
    electrum: Optional[int] = None
    gold: Optional[int] = None
    platinum: Optional[int] = None

# Custom Item Models
class CustomItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    item_type: str = "weapon"
    rarity: str = "common"
    description: str = ""
    properties: str = ""
    attunement: bool = False
    value: str = ""
    weight: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomItemCreate(BaseModel):
    name: str
    item_type: str = "weapon"
    rarity: str = "common"
    description: str = ""
    properties: str = ""
    attunement: bool = False
    value: str = ""
    weight: float = 0.0

class CustomItemUpdate(BaseModel):
    name: Optional[str] = None
    item_type: Optional[str] = None
    rarity: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[str] = None
    attunement: Optional[bool] = None
    value: Optional[str] = None
    weight: Optional[float] = None

# ==================== SUBSCRIPTION MODELS ====================

# Subscription pricing - affordable for users going through tough times
SUBSCRIPTION_PLANS = {
    'free': {'name': 'Free', 'price': 0.0, 'campaigns': 2, 'ai_calls_per_month': 5},
    'adventurer': {'name': 'Adventurer', 'price': 3.99, 'campaigns': -1, 'ai_calls_per_month': -1},  # -1 = unlimited
}

class SubscriptionTier(BaseModel):
    tier: str = 'free'
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: str = 'active'  # active, cancelled, past_due
    ai_calls_this_month: int = 0
    ai_calls_reset_date: Optional[str] = None
    promo_code_used: Optional[str] = None
    # Referral system
    referral_code: Optional[str] = None  # User's unique referral code
    referred_by: Optional[str] = None  # Who referred this user
    referral_count: int = 0  # How many people they've referred
    free_months_earned: int = 0  # Months earned from referrals
    free_months_used: int = 0  # Months already consumed
    premium_expires_at: Optional[str] = None  # When referral premium expires

class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    tier_granted: str = 'adventurer'
    duration_days: int = 30  # How many days of premium the code grants (default 30 days = 1 month)
    uses_remaining: int = -1  # -1 = unlimited
    expires_at: Optional[str] = None  # When the code itself expires (not the premium it grants)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PromoCodeCreate(BaseModel):
    code: str
    tier_granted: str = 'adventurer'
    duration_days: int = 30  # Days of premium access granted
    uses_remaining: int = -1
    expires_at: Optional[str] = None

class ApplyPromoCodeRequest(BaseModel):
    code: str

class ApplyReferralCodeRequest(BaseModel):
    referral_code: str

class CreateCheckoutRequest(BaseModel):
    origin_url: str
    plan: str = 'adventurer'

class SubscriptionResponse(BaseModel):
    tier: str
    tier_name: str
    campaigns_limit: int
    ai_calls_limit: int
    ai_calls_used: int
    is_premium: bool
    subscription_status: str
    # Referral info
    referral_code: Optional[str] = None
    referral_count: int = 0
    free_months_earned: int = 0
    free_months_remaining: int = 0
    premium_expires_at: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(username: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'sub': username,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

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

# ==================== AUTH ROUTES ====================

def generate_referral_code(username: str) -> str:
    """Generate a unique referral code for a user"""
    import hashlib
    # Create a short, memorable code based on username + random
    base = f"{username}-{uuid.uuid4().hex[:4]}"
    return base.upper()[:12]

@api_router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({'username': user_data.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    # Generate unique referral code for new user
    referral_code = generate_referral_code(user_data.username)
    
    # Check if they were referred by someone
    referred_by = None
    if user_data.referral_code:
        referrer = await db.users.find_one({'subscription.referral_code': user_data.referral_code.upper()})
        if referrer:
            referred_by = referrer['username']
    
    # Create subscription with referral code
    subscription = SubscriptionTier(referral_code=referral_code, referred_by=referred_by)
    
    user_doc = {
        'id': str(uuid.uuid4()),
        'username': user_data.username,
        'password_hash': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'subscription': subscription.model_dump()
    }
    
    await db.users.insert_one(user_doc)
    
    # If referred, give the referrer 1 free month!
    if referred_by:
        # Calculate new expiration date for referrer
        referrer_user = await db.users.find_one({'username': referred_by})
        referrer_sub = referrer_user.get('subscription', {})
        
        current_expires = referrer_sub.get('premium_expires_at')
        if current_expires:
            expires_dt = datetime.fromisoformat(current_expires.replace('Z', '+00:00'))
            if expires_dt < datetime.now(timezone.utc):
                expires_dt = datetime.now(timezone.utc)
        else:
            expires_dt = datetime.now(timezone.utc)
        
        # Add 30 days
        new_expires = expires_dt + timedelta(days=30)
        
        await db.users.update_one(
            {'username': referred_by},
            {
                '$inc': {
                    'subscription.referral_count': 1,
                    'subscription.free_months_earned': 1
                },
                '$set': {
                    'subscription.tier': 'adventurer',
                    'subscription.subscription_status': 'active',
                    'subscription.premium_expires_at': new_expires.isoformat()
                }
            }
        )
    
    token = create_token(user_data.username)
    
    return TokenResponse(token=token, username=user_data.username)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({'username': user_data.username})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_token(user_data.username)
    return TokenResponse(token=token, username=user_data.username)

@api_router.get("/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    user = await db.users.find_one({'username': username}, {'_id': 0, 'password_hash': 0})
    return user

# ==================== SUBSCRIPTION ROUTES ====================

async def get_user_subscription(username: str) -> dict:
    """Helper to get user's subscription status"""
    user = await db.users.find_one({'username': username})
    if not user:
        return None
    
    subscription = user.get('subscription', SubscriptionTier().model_dump())
    
    # Check if referral premium has expired
    premium_expires = subscription.get('premium_expires_at')
    if premium_expires and subscription.get('tier') == 'adventurer':
        expires_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= expires_dt:
            # Premium expired, revert to free
            subscription['tier'] = 'free'
            subscription['subscription_status'] = 'expired'
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': 'free',
                    'subscription.subscription_status': 'expired'
                }}
            )
    
    # Reset AI calls monthly
    reset_date = subscription.get('ai_calls_reset_date')
    if reset_date:
        reset_dt = datetime.fromisoformat(reset_date.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= reset_dt:
            subscription['ai_calls_this_month'] = 0
            next_reset = datetime.now(timezone.utc) + timedelta(days=30)
            subscription['ai_calls_reset_date'] = next_reset.isoformat()
            await db.users.update_one(
                {'username': username},
                {'$set': {'subscription': subscription}}
            )
    else:
        next_reset = datetime.now(timezone.utc) + timedelta(days=30)
        subscription['ai_calls_reset_date'] = next_reset.isoformat()
        await db.users.update_one(
            {'username': username},
            {'$set': {'subscription': subscription}}
        )
    
    return subscription

async def check_premium_feature(username: str, feature: str = 'ai') -> bool:
    """Check if user can access premium features"""
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free')
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    if tier == 'adventurer' and subscription.get('subscription_status') == 'active':
        return True
    
    if feature == 'ai':
        limit = plan.get('ai_calls_per_month', 5)
        used = subscription.get('ai_calls_this_month', 0)
        return limit == -1 or used < limit
    
    return False

async def increment_ai_usage(username: str):
    """Increment AI call counter for free tier users"""
    subscription = await get_user_subscription(username)
    if subscription.get('tier') == 'free':
        await db.users.update_one(
            {'username': username},
            {'$inc': {'subscription.ai_calls_this_month': 1}}
        )

@api_router.get("/subscription/status", response_model=SubscriptionResponse)
async def get_subscription_status(username: str = Depends(get_current_user)):
    """Get current user's subscription status"""
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free')
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Calculate free months remaining
    free_months_earned = subscription.get('free_months_earned', 0)
    free_months_used = subscription.get('free_months_used', 0)
    free_months_remaining = max(0, free_months_earned - free_months_used)
    
    return SubscriptionResponse(
        tier=tier,
        tier_name=plan['name'],
        campaigns_limit=plan['campaigns'],
        ai_calls_limit=plan['ai_calls_per_month'],
        ai_calls_used=subscription.get('ai_calls_this_month', 0),
        is_premium=tier != 'free',
        subscription_status=subscription.get('subscription_status', 'active'),
        referral_code=subscription.get('referral_code'),
        referral_count=subscription.get('referral_count', 0),
        free_months_earned=free_months_earned,
        free_months_remaining=free_months_remaining,
        premium_expires_at=subscription.get('premium_expires_at')
    )

@api_router.post("/subscription/checkout")
async def create_checkout_session(request: CreateCheckoutRequest, http_request: Request, username: str = Depends(get_current_user)):
    """Create Stripe checkout session for subscription"""
    try:
        api_key = os.environ.get('STRIPE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        plan = SUBSCRIPTION_PLANS.get(request.plan)
        if not plan or plan['price'] == 0:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        # Build success/cancel URLs from frontend origin
        success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/subscription/cancel"
        
        checkout_request = CheckoutSessionRequest(
            amount=float(plan['price']),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "username": username,
                "plan": request.plan,
                "type": "subscription"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            'id': str(uuid.uuid4()),
            'session_id': session.session_id,
            'username': username,
            'amount': plan['price'],
            'currency': 'usd',
            'plan': request.plan,
            'payment_status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@api_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, http_request: Request, username: str = Depends(get_current_user)):
    """Check payment status and activate subscription if paid"""
    try:
        api_key = os.environ.get('STRIPE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        transaction = await db.payment_transactions.find_one({'session_id': session_id})
        
        if status.payment_status == 'paid' and transaction and transaction.get('payment_status') != 'paid':
            # Activate subscription
            plan = transaction.get('plan', 'adventurer')
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': plan,
                    'subscription.subscription_status': 'active',
                    'subscription.stripe_subscription_id': session_id
                }}
            )
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {'session_id': session_id},
                {'$set': {'payment_status': 'paid', 'completed_at': datetime.now(timezone.utc).isoformat()}}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert from cents
            "currency": status.currency
        }
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        api_key = os.environ.get('STRIPE_API_KEY')
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            metadata = webhook_response.metadata
            username = metadata.get('username')
            plan = metadata.get('plan', 'adventurer')
            
            if username:
                await db.users.update_one(
                    {'username': username},
                    {'$set': {
                        'subscription.tier': plan,
                        'subscription.subscription_status': 'active'
                    }}
                )
                
                await db.payment_transactions.update_one(
                    {'session_id': webhook_response.session_id},
                    {'$set': {'payment_status': 'paid'}}
                )
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== PROMO CODE ROUTES ====================

# Admin username - only this user can access admin features
ADMIN_USERNAME = "Trigger24"

async def verify_admin(username: str):
    """Check if user is admin"""
    if username != ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return True

@api_router.post("/promo-codes", status_code=status.HTTP_201_CREATED)
async def create_promo_code(promo_data: PromoCodeCreate, username: str = Depends(get_current_user)):
    """Create a new promo code (admin only)"""
    await verify_admin(username)
    
    # Check if code already exists
    existing = await db.promo_codes.find_one({'code': promo_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    promo = PromoCode(
        code=promo_data.code.upper(),
        tier_granted=promo_data.tier_granted,
        duration_days=promo_data.duration_days,
        uses_remaining=promo_data.uses_remaining,
        expires_at=promo_data.expires_at
    )
    await db.promo_codes.insert_one(promo.model_dump())
    return {"message": "Promo code created", "code": promo.code, "duration_days": promo.duration_days}

@api_router.post("/promo-codes/apply")
async def apply_promo_code(request: ApplyPromoCodeRequest, username: str = Depends(get_current_user)):
    """Apply a promo code to get free premium access"""
    code = request.code.upper().strip()
    
    # Find promo code
    promo = await db.promo_codes.find_one({'code': code})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    # Check if expired
    if promo.get('expires_at'):
        expires = datetime.fromisoformat(promo['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Promo code has expired")
    
    # Check uses remaining
    uses = promo.get('uses_remaining', -1)
    if uses == 0:
        raise HTTPException(status_code=400, detail="Promo code has no uses remaining")
    
    # Check if user already used a promo
    user = await db.users.find_one({'username': username})
    if user and user.get('subscription', {}).get('promo_code_used'):
        raise HTTPException(status_code=400, detail="You have already used a promo code")
    
    # Apply promo code with duration
    tier = promo.get('tier_granted', 'adventurer')
    duration_days = promo.get('duration_days', 30)  # Default to 30 days if not specified
    
    # Handle lifetime codes (-1 means no expiration)
    if duration_days == -1:
        premium_expires_at = None  # No expiration for lifetime codes
    else:
        premium_expires_at = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()
    
    update_data = {
        'subscription.tier': tier,
        'subscription.subscription_status': 'active',
        'subscription.promo_code_used': code
    }
    
    if premium_expires_at:
        update_data['subscription.premium_expires_at'] = premium_expires_at
    else:
        # For lifetime, remove any existing expiration
        update_data['subscription.premium_expires_at'] = None
        update_data['subscription.lifetime_access'] = True
    
    await db.users.update_one(
        {'username': username},
        {'$set': update_data}
    )
    
    # Decrement uses if not unlimited
    if uses > 0:
        await db.promo_codes.update_one(
            {'code': code},
            {'$inc': {'uses_remaining': -1}}
        )
    
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Format duration for message
    if duration_days == 7:
        duration_text = "1 week"
    elif duration_days == 14:
        duration_text = "2 weeks"
    elif duration_days == 30:
        duration_text = "1 month"
    elif duration_days == 90:
        duration_text = "3 months"
    elif duration_days == 365:
        duration_text = "1 year"
    else:
        duration_text = f"{duration_days} days"
    
    return {
        "message": f"Promo code applied! You now have {plan['name']} access for {duration_text}.",
        "tier": tier,
        "tier_name": plan['name'],
        "duration_days": duration_days,
        "expires_at": premium_expires_at
    }

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        'plans': [
            {
                'id': 'free',
                'name': 'Free',
                'price': 0,
                'features': [
                    'Up to 2 campaigns',
                    '5 AI generations per month',
                    'Basic DM Screen features',
                    'Dice roller & initiative tracker'
                ]
            },
            {
                'id': 'adventurer',
                'name': 'Adventurer',
                'price': 3.99,
                'features': [
                    'Unlimited campaigns',
                    'Unlimited AI generations',
                    'All DM Screen features',
                    'Priority support',
                    'Early access to new features'
                ]
            }
        ]
    }

@api_router.get("/referral/code")
async def get_referral_code(username: str = Depends(get_current_user)):
    """Get or generate user's referral code"""
    user = await db.users.find_one({'username': username})
    subscription = user.get('subscription', {})
    referral_code = subscription.get('referral_code')
    
    # Generate one if doesn't exist (for existing users)
    if not referral_code:
        referral_code = generate_referral_code(username)
        await db.users.update_one(
            {'username': username},
            {'$set': {'subscription.referral_code': referral_code}}
        )
    
    return {
        'referral_code': referral_code,
        'referral_count': subscription.get('referral_count', 0),
        'free_months_earned': subscription.get('free_months_earned', 0),
        'share_url': f'?ref={referral_code}'
    }

@api_router.get("/referral/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers"""
    top_referrers = await db.users.find(
        {'subscription.referral_count': {'$gt': 0}},
        {'_id': 0, 'username': 1, 'subscription.referral_count': 1}
    ).sort('subscription.referral_count', -1).limit(10).to_list(10)
    
    return {
        'leaderboard': [
            {
                'username': u['username'][:3] + '***',  # Privacy
                'referrals': u.get('subscription', {}).get('referral_count', 0)
            }
            for u in top_referrers
        ]
    }

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/check")
async def check_admin_status(username: str = Depends(get_current_user)):
    """Check if current user is admin"""
    return {"is_admin": username == ADMIN_USERNAME}

@api_router.get("/admin/promo-codes")
async def get_all_promo_codes(username: str = Depends(get_current_user)):
    """Get all promo codes (admin only)"""
    await verify_admin(username)
    
    codes = await db.promo_codes.find({}, {'_id': 0}).to_list(100)
    
    # Get stats
    total_users = await db.users.count_documents({})
    total_referrals = await db.users.aggregate([
        {'$group': {'_id': None, 'total': {'$sum': '$subscription.referral_count'}}}
    ]).to_list(1)
    
    return {
        'codes': codes,
        'stats': {
            'total_users': total_users,
            'total_referrals': total_referrals[0]['total'] if total_referrals else 0
        }
    }

@api_router.delete("/admin/promo-codes/{code_id}")
async def delete_promo_code(code_id: str, username: str = Depends(get_current_user)):
    """Delete a promo code (admin only)"""
    await verify_admin(username)
    
    result = await db.promo_codes.delete_one({'id': code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"message": "Promo code deleted"}

# ==================== CAMPAIGN ROUTES ====================

@api_router.post("/campaigns", response_model=Campaign, status_code=status.HTTP_201_CREATED)
async def create_campaign(campaign_data: CampaignCreate, username: str = Depends(get_current_user)):
    campaign_dict = campaign_data.model_dump()
    campaign_obj = Campaign(dm_user_id=username, **campaign_dict)
    doc = campaign_obj.model_dump()
    await db.campaigns.insert_one(doc)
    return campaign_obj

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(username: str = Depends(get_current_user)):
    campaigns = await db.campaigns.find({'dm_user_id': username}, {'_id': 0}).to_list(1000)
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_data: CampaignCreate, username: str = Depends(get_current_user)):
    result = await db.campaigns.update_one(
        {'id': campaign_id, 'dm_user_id': username},
        {'$set': campaign_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    return campaign

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    result = await db.campaigns.delete_one({'id': campaign_id, 'dm_user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return {'message': 'Campaign deleted successfully'}

# ==================== CAMPAIGN SETTING ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/setting", response_model=Optional[CampaignSetting])
async def get_campaign_setting(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not setting:
        # Create default setting
        setting_obj = CampaignSetting(campaign_id=campaign_id, content="")
        doc = setting_obj.model_dump()
        await db.campaign_settings.insert_one(doc)
        return setting_obj
    # Ensure dm_rules has a default value if null in DB (for backward compatibility)
    if setting.get('dm_rules') is None:
        setting['dm_rules'] = ""
    if setting.get('content') is None:
        setting['content'] = ""
    return setting

@api_router.put("/campaigns/{campaign_id}/setting", response_model=CampaignSetting)
async def update_campaign_setting(campaign_id: str, setting_data: CampaignSettingUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.campaign_settings.update_one(
        {'campaign_id': campaign_id},
        {'$set': setting_data.model_dump()},
        upsert=True
    )
    
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0})
    # Ensure dm_rules and content have default values if null in DB
    if setting:
        if setting.get('dm_rules') is None:
            setting['dm_rules'] = ""
        if setting.get('content') is None:
            setting['content'] = ""
    return setting

# ==================== GODS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/gods", response_model=God, status_code=status.HTTP_201_CREATED)
async def create_god(campaign_id: str, god_data: GodCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    god_dict = god_data.model_dump()
    god_obj = God(campaign_id=campaign_id, **god_dict)
    doc = god_obj.model_dump()
    await db.gods.insert_one(doc)
    return god_obj

@api_router.get("/campaigns/{campaign_id}/gods", response_model=List[God])
async def get_gods(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return gods

@api_router.put("/campaigns/{campaign_id}/gods/{god_id}", response_model=God)
async def update_god(campaign_id: str, god_id: str, god_data: GodUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in god_data.model_dump().items() if v is not None}
    result = await db.gods.update_one(
        {'id': god_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="God not found")
    
    god = await db.gods.find_one({'id': god_id}, {'_id': 0})
    return god

@api_router.delete("/campaigns/{campaign_id}/gods/{god_id}")
async def delete_god(campaign_id: str, god_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.gods.delete_one({'id': god_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="God not found")
    return {'message': 'God deleted successfully'}

# ==================== CALENDAR ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/calendar", response_model=Optional[Calendar])
async def get_calendar(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    calendar = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not calendar:
        # Create default calendar
        default_months = [
            {"name": "January", "days": 31}, {"name": "February", "days": 28},
            {"name": "March", "days": 31}, {"name": "April", "days": 30},
            {"name": "May", "days": 31}, {"name": "June", "days": 30},
            {"name": "July", "days": 31}, {"name": "August", "days": 31},
            {"name": "September", "days": 30}, {"name": "October", "days": 31},
            {"name": "November", "days": 30}, {"name": "December", "days": 31}
        ]
        calendar_obj = Calendar(campaign_id=campaign_id, calendar_type="gregorian", custom_months=default_months)
        doc = calendar_obj.model_dump()
        await db.calendars.insert_one(doc)
        return calendar_obj
    return calendar

@api_router.put("/campaigns/{campaign_id}/calendar", response_model=Calendar)
async def update_calendar(campaign_id: str, calendar_data: CalendarUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in calendar_data.model_dump().items() if v is not None}
    result = await db.calendars.update_one(
        {'campaign_id': campaign_id},
        {'$set': update_dict},
        upsert=True
    )
    
    calendar = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return calendar

@api_router.post("/campaigns/{campaign_id}/calendar/advance")
async def advance_calendar(campaign_id: str, days: int, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    calendar = await db.calendars.find_one({'campaign_id': campaign_id})
    if not calendar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar not found")
    
    # Calculate new date
    current_day = calendar['current_day']
    current_month = calendar['current_month']
    current_year = calendar['current_year']
    months = calendar['custom_months']
    
    days_to_add = days
    while days_to_add > 0:
        month_index = current_month - 1
        days_in_month = months[month_index]['days']
        days_left_in_month = days_in_month - current_day
        
        if days_to_add <= days_left_in_month:
            current_day += days_to_add
            days_to_add = 0
        else:
            days_to_add -= (days_left_in_month + 1)
            current_day = 1
            current_month += 1
            if current_month > len(months):
                current_month = 1
                current_year += 1
    
    await db.calendars.update_one(
        {'campaign_id': campaign_id},
        {'$set': {'current_day': current_day, 'current_month': current_month, 'current_year': current_year}}
    )
    
    calendar = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return calendar

# ==================== CALENDAR EVENT ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/calendar-events", response_model=CalendarEvent)
async def create_calendar_event(campaign_id: str, event_data: CalendarEventCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    event_dict = event_data.model_dump()
    event_obj = CalendarEvent(campaign_id=campaign_id, **event_dict)
    doc = event_obj.model_dump()
    await db.calendar_events.insert_one(doc)
    return event_obj

@api_router.get("/campaigns/{campaign_id}/calendar-events", response_model=List[CalendarEvent])
async def get_calendar_events(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    events = await db.calendar_events.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return events

@api_router.put("/campaigns/{campaign_id}/calendar-events/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(campaign_id: str, event_id: str, event_data: CalendarEventUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in event_data.model_dump().items() if v is not None}
    result = await db.calendar_events.update_one(
        {'id': event_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    event = await db.calendar_events.find_one({'id': event_id}, {'_id': 0})
    return event

@api_router.delete("/campaigns/{campaign_id}/calendar-events/{event_id}")
async def delete_calendar_event(campaign_id: str, event_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.calendar_events.delete_one({'id': event_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return {'message': 'Event deleted successfully'}

# ==================== COMBAT SCENARIO ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/combat-scenarios", response_model=CombatScenario)
async def create_combat_scenario(campaign_id: str, scenario_data: CombatScenarioCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    scenario_dict = scenario_data.model_dump()
    scenario_obj = CombatScenario(campaign_id=campaign_id, **scenario_dict)
    doc = scenario_obj.model_dump()
    await db.combat_scenarios.insert_one(doc)
    return scenario_obj

@api_router.get("/campaigns/{campaign_id}/combat-scenarios", response_model=List[CombatScenario])
async def get_combat_scenarios(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    scenarios = await db.combat_scenarios.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return scenarios

@api_router.get("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def get_combat_scenario(campaign_id: str, scenario_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    scenario = await db.combat_scenarios.find_one({'id': scenario_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return scenario

@api_router.put("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def update_combat_scenario(campaign_id: str, scenario_id: str, scenario_data: CombatScenarioUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in scenario_data.model_dump().items() if v is not None}
    result = await db.combat_scenarios.update_one(
        {'id': scenario_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    
    scenario = await db.combat_scenarios.find_one({'id': scenario_id}, {'_id': 0})
    return scenario

@api_router.delete("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}")
async def delete_combat_scenario(campaign_id: str, scenario_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.combat_scenarios.delete_one({'id': scenario_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return {'message': 'Combat scenario deleted successfully'}

# ==================== LOCATIONS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/locations", response_model=Location, status_code=status.HTTP_201_CREATED)
async def create_location(campaign_id: str, location_data: LocationCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    location_dict = location_data.model_dump()
    location_obj = Location(campaign_id=campaign_id, **location_dict)
    doc = location_obj.model_dump()
    await db.locations.insert_one(doc)
    return location_obj

@api_router.get("/campaigns/{campaign_id}/locations", response_model=List[Location])
async def get_locations(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return locations

@api_router.put("/campaigns/{campaign_id}/locations/{location_id}", response_model=Location)
async def update_location(campaign_id: str, location_id: str, location_data: LocationUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in location_data.model_dump().items() if v is not None}
    result = await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    location = await db.locations.find_one({'id': location_id}, {'_id': 0})
    return location

@api_router.delete("/campaigns/{campaign_id}/locations/{location_id}")
async def delete_location(campaign_id: str, location_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.locations.delete_one({'id': location_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return {'message': 'Location deleted successfully'}

# ==================== PLACES OF INTEREST ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/locations/{location_id}/places")
async def add_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_data: PlaceOfInterestCreate, 
    username: str = Depends(get_current_user)
):
    """Add a place of interest to a location (shop, tavern, temple, etc.)"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    # Create new place
    new_place = PlaceOfInterest(**place_data.model_dump())
    place_dict = new_place.model_dump()
    
    # Add to location's places_of_interest array
    places = location.get('places_of_interest', [])
    places.append(place_dict)
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return place_dict

@api_router.get("/campaigns/{campaign_id}/locations/{location_id}/places")
async def get_places_of_interest(
    campaign_id: str, 
    location_id: str, 
    username: str = Depends(get_current_user)
):
    """Get all places of interest within a location"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    return location.get('places_of_interest', [])

@api_router.put("/campaigns/{campaign_id}/locations/{location_id}/places/{place_id}")
async def update_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_id: str,
    place_data: PlaceOfInterestUpdate,
    username: str = Depends(get_current_user)
):
    """Update a place of interest"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    places = location.get('places_of_interest', [])
    place_index = next((i for i, p in enumerate(places) if p.get('id') == place_id), None)
    
    if place_index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    
    # Update the place with new data
    update_dict = {k: v for k, v in place_data.model_dump().items() if v is not None}
    places[place_index].update(update_dict)
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return places[place_index]

@api_router.delete("/campaigns/{campaign_id}/locations/{location_id}/places/{place_id}")
async def delete_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a place of interest"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    places = location.get('places_of_interest', [])
    original_length = len(places)
    places = [p for p in places if p.get('id') != place_id]
    
    if len(places) == original_length:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return {'message': 'Place deleted successfully'}

# ==================== WORLD BUILDER ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/world")
async def get_world_data(campaign_id: str, username: str = Depends(get_current_user)):
    """Get complete world hierarchy for a campaign"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    # Get all continents
    continents = await db.world_continents.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
    
    # Build hierarchy
    for continent in continents:
        regions = await db.world_regions.find({'parent_id': continent['id']}, {'_id': 0}).to_list(100)
        for region in regions:
            settlements = await db.world_settlements.find({'parent_id': region['id']}, {'_id': 0}).to_list(100)
            for settlement in settlements:
                places = await db.world_places.find({'parent_id': settlement['id']}, {'_id': 0}).to_list(100)
                settlement['places'] = places
            region['settlements'] = settlements
        continent['regions'] = regions
    
    return {'continents': continents}

@api_router.post("/campaigns/{campaign_id}/world/continent")
async def create_continent(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new continent/landmass"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    continent = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': data.get('name', 'New Continent'),
        'continent_type': data.get('type', 'continent'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_continents.insert_one(continent)
    continent.pop('_id', None)
    return continent

@api_router.put("/campaigns/{campaign_id}/world/continent/{continent_id}")
async def update_continent(campaign_id: str, continent_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a continent"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_data = {
        'name': data.get('name'),
        'continent_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    await db.world_continents.update_one({'id': continent_id}, {'$set': update_data})
    continent = await db.world_continents.find_one({'id': continent_id}, {'_id': 0})
    return continent

@api_router.delete("/campaigns/{campaign_id}/world/continent/{continent_id}")
async def delete_continent(campaign_id: str, continent_id: str, username: str = Depends(get_current_user)):
    """Delete a continent and all nested items"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    # Delete nested items
    regions = await db.world_regions.find({'parent_id': continent_id}, {'id': 1}).to_list(100)
    for region in regions:
        settlements = await db.world_settlements.find({'parent_id': region['id']}, {'id': 1}).to_list(100)
        for settlement in settlements:
            await db.world_places.delete_many({'parent_id': settlement['id']})
        await db.world_settlements.delete_many({'parent_id': region['id']})
    await db.world_regions.delete_many({'parent_id': continent_id})
    await db.world_continents.delete_one({'id': continent_id})
    
    return {'message': 'Continent deleted'}

@api_router.post("/campaigns/{campaign_id}/world/region")
async def create_region(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new country/region"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    region = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Continent ID
        'name': data.get('name', 'New Region'),
        'region_type': data.get('type', 'kingdom'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_regions.insert_one(region)
    return {k: v for k, v in region.items() if k != '_id'}

@api_router.put("/campaigns/{campaign_id}/world/region/{region_id}")
async def update_region(campaign_id: str, region_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a region"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'region_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_regions.update_one({'id': region_id}, {'$set': update_data})
    return await db.world_regions.find_one({'id': region_id}, {'_id': 0})

@api_router.delete("/campaigns/{campaign_id}/world/region/{region_id}")
async def delete_region(campaign_id: str, region_id: str, username: str = Depends(get_current_user)):
    """Delete a region and all nested items"""
    settlements = await db.world_settlements.find({'parent_id': region_id}, {'id': 1}).to_list(100)
    for settlement in settlements:
        await db.world_places.delete_many({'parent_id': settlement['id']})
    await db.world_settlements.delete_many({'parent_id': region_id})
    await db.world_regions.delete_one({'id': region_id})
    return {'message': 'Region deleted'}

@api_router.post("/campaigns/{campaign_id}/world/settlement")
async def create_settlement(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new city/town/village"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    settlement = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Region ID
        'name': data.get('name', 'New Settlement'),
        'settlement_type': data.get('type', 'town'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_settlements.insert_one(settlement)
    return {k: v for k, v in settlement.items() if k != '_id'}

@api_router.put("/campaigns/{campaign_id}/world/settlement/{settlement_id}")
async def update_settlement(campaign_id: str, settlement_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a settlement"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'settlement_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_settlements.update_one({'id': settlement_id}, {'$set': update_data})
    return await db.world_settlements.find_one({'id': settlement_id}, {'_id': 0})

@api_router.delete("/campaigns/{campaign_id}/world/settlement/{settlement_id}")
async def delete_settlement(campaign_id: str, settlement_id: str, username: str = Depends(get_current_user)):
    """Delete a settlement and all places"""
    await db.world_places.delete_many({'parent_id': settlement_id})
    await db.world_settlements.delete_one({'id': settlement_id})
    return {'message': 'Settlement deleted'}

@api_router.post("/campaigns/{campaign_id}/world/place")
async def create_world_place(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new place of interest"""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    place = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Settlement ID
        'name': data.get('name', 'New Place'),
        'place_type': data.get('type', 'shop'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_places.insert_one(place)
    return {k: v for k, v in place.items() if k != '_id'}

@api_router.put("/campaigns/{campaign_id}/world/place/{place_id}")
async def update_world_place(campaign_id: str, place_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a place"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'place_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_places.update_one({'id': place_id}, {'$set': update_data})
    return await db.world_places.find_one({'id': place_id}, {'_id': 0})

@api_router.delete("/campaigns/{campaign_id}/world/place/{place_id}")
async def delete_world_place(campaign_id: str, place_id: str, username: str = Depends(get_current_user)):
    """Delete a place"""
    await db.world_places.delete_one({'id': place_id})
    return {'message': 'Place deleted'}

# ==================== IN-GAME NOTES ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/ingame-notes", response_model=InGameNote, status_code=status.HTTP_201_CREATED)
async def create_ingame_note(campaign_id: str, note_data: InGameNoteCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    note_dict = note_data.model_dump()
    if not note_dict.get('session_date'):
        note_dict['session_date'] = datetime.now(timezone.utc).isoformat()
    
    note_obj = InGameNote(campaign_id=campaign_id, **note_dict)
    doc = note_obj.model_dump()
    await db.ingame_notes.insert_one(doc)
    return note_obj

@api_router.get("/campaigns/{campaign_id}/ingame-notes", response_model=List[InGameNote])
async def get_ingame_notes(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return notes

@api_router.delete("/campaigns/{campaign_id}/ingame-notes/{note_id}")
async def delete_ingame_note(campaign_id: str, note_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.ingame_notes.delete_one({'id': note_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return {'message': 'Note deleted successfully'}

# ==================== PLAYER ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/players", response_model=Player, status_code=status.HTTP_201_CREATED)
async def create_player(campaign_id: str, player_data: PlayerCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    player_dict = player_data.model_dump()
    if player_dict.get('stats') is None:
        player_dict['stats'] = PlayerStats().model_dump()
    player_obj = Player(campaign_id=campaign_id, **player_dict)
    doc = player_obj.model_dump()
    await db.players.insert_one(doc)
    return player_obj

@api_router.get("/campaigns/{campaign_id}/players", response_model=List[Player])
async def get_players(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    players = await db.players.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return players

@api_router.put("/campaigns/{campaign_id}/players/{player_id}", response_model=Player)
async def update_player(campaign_id: str, player_id: str, player_data: PlayerUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in player_data.model_dump().items() if v is not None}
    result = await db.players.update_one(
        {'id': player_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    
    player = await db.players.find_one({'id': player_id}, {'_id': 0})
    return player

@api_router.delete("/campaigns/{campaign_id}/players/{player_id}")
async def delete_player(campaign_id: str, player_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.players.delete_one({'id': player_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return {'message': 'Player deleted successfully'}

# ==================== NPC ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/npcs", response_model=NPC, status_code=status.HTTP_201_CREATED)
async def create_npc(campaign_id: str, npc_data: NPCCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    npc_dict = npc_data.model_dump()
    npc_obj = NPC(campaign_id=campaign_id, **npc_dict)
    doc = npc_obj.model_dump()
    await db.npcs.insert_one(doc)
    return npc_obj

@api_router.get("/campaigns/{campaign_id}/npcs", response_model=List[NPC])
async def get_npcs(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return npcs

@api_router.put("/campaigns/{campaign_id}/npcs/{npc_id}", response_model=NPC)
async def update_npc(campaign_id: str, npc_id: str, npc_data: NPCUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in npc_data.model_dump().items() if v is not None}
    result = await db.npcs.update_one(
        {'id': npc_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NPC not found")
    
    npc = await db.npcs.find_one({'id': npc_id}, {'_id': 0})
    return npc

@api_router.delete("/campaigns/{campaign_id}/npcs/{npc_id}")
async def delete_npc(campaign_id: str, npc_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.npcs.delete_one({'id': npc_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NPC not found")
    return {'message': 'NPC deleted successfully'}

# ==================== INITIATIVE ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/initiative", response_model=Initiative)
async def create_initiative(campaign_id: str, init_data: InitiativeCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    # Set previous initiatives to inactive
    await db.initiatives.update_many(
        {'campaign_id': campaign_id},
        {'$set': {'is_active': False}}
    )
    
    init_dict = init_data.model_dump()
    init_obj = Initiative(campaign_id=campaign_id, **init_dict)
    doc = init_obj.model_dump()
    await db.initiatives.insert_one(doc)
    return init_obj

@api_router.get("/campaigns/{campaign_id}/initiative", response_model=Optional[Initiative])
async def get_active_initiative(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    initiative = await db.initiatives.find_one(
        {'campaign_id': campaign_id, 'is_active': True},
        {'_id': 0}
    )
    return initiative

@api_router.put("/campaigns/{campaign_id}/initiative/{initiative_id}", response_model=Initiative)
async def update_initiative(campaign_id: str, initiative_id: str, init_data: InitiativeUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in init_data.model_dump().items() if v is not None}
    result = await db.initiatives.update_one(
        {'id': initiative_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    initiative = await db.initiatives.find_one({'id': initiative_id}, {'_id': 0})
    return initiative

@api_router.delete("/campaigns/{campaign_id}/initiative/{initiative_id}")
async def delete_initiative(campaign_id: str, initiative_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.initiatives.delete_one({'id': initiative_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    return {'message': 'Initiative deleted successfully'}

# ==================== MAP ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/maps", response_model=GameMap)
async def create_map(campaign_id: str, map_data: GameMapCreate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    map_dict = map_data.model_dump()
    map_obj = GameMap(campaign_id=campaign_id, **map_dict)
    doc = map_obj.model_dump()
    await db.maps.insert_one(doc)
    return map_obj

@api_router.get("/campaigns/{campaign_id}/maps", response_model=List[GameMap])
async def get_maps(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    maps = await db.maps.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return maps

@api_router.put("/campaigns/{campaign_id}/maps/{map_id}", response_model=GameMap)
async def update_map(campaign_id: str, map_id: str, map_data: GameMapUpdate, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_dict = {k: v for k, v in map_data.model_dump().items() if v is not None}
    result = await db.maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Map not found")
    
    game_map = await db.maps.find_one({'id': map_id}, {'_id': 0})
    return game_map

@api_router.delete("/campaigns/{campaign_id}/maps/{map_id}")
async def delete_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    result = await db.maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Map not found")
    return {'message': 'Map deleted successfully'}

# ==================== AI ROUTES ====================

class UnseenServantRequest(BaseModel):
    prompt: str
    entity_type: str  # god, npc, location, place_of_interest
    campaign_id: str
    location_id: Optional[str] = None  # Required if entity_type is place_of_interest

class UnseenServantResponse(BaseModel):
    success: bool
    entity_type: str
    entity_id: str
    entity_name: str
    message: str

@api_router.post("/unseen-servant/generate", response_model=UnseenServantResponse)
async def unseen_servant_generate(request: UnseenServantRequest, username: str = Depends(get_current_user)):
    """Unseen Servant: AI that generates and auto-saves D&D content"""
    try:
        # Check if user can use AI features
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You've reached your monthly AI generation limit. Upgrade to Adventurer for unlimited access!"
            )
        
        # Verify campaign ownership
        campaign = await db.campaigns.find_one({'id': request.campaign_id, 'dm_user_id': username})
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Define JSON schema prompts for each entity type
        entity_prompts = {
            'god': '''Generate a D&D deity. Respond ONLY with valid JSON in this exact format:
{
  "name": "deity name",
  "domain": "primary domain (e.g., War, Knowledge, Nature)",
  "description": "2-3 sentences describing the deity",
  "symbol": "the deity's holy symbol",
  "alignment": "alignment (e.g., Lawful Good, Chaotic Neutral)",
  "notes": "additional lore or worship practices"
}''',
            'npc': '''Generate a D&D NPC. Respond ONLY with valid JSON in this exact format:
{
  "name": "NPC full name",
  "description": "physical appearance, personality, and background in 2-3 sentences",
  "hp": 10,
  "ac": 10,
  "location": "where they can be found",
  "notes": "motivations, secrets, or plot hooks"
}''',
            'location': '''Generate a D&D location. Respond ONLY with valid JSON in this exact format:
{
  "name": "location name",
  "location_type": "type (City, Town, Village, Dungeon, Forest, etc.)",
  "description": "2-3 sentences describing the location",
  "notable_npcs": "key NPCs found here",
  "notes": "secrets, hooks, or DM notes"
}''',
            'place_of_interest': '''Generate a place of interest (shop, tavern, temple, etc.). Respond ONLY with valid JSON in this exact format:
{
  "name": "establishment name",
  "place_type": "type (shop, tavern, temple, blacksmith, guild, library, residence, other)",
  "description": "2-3 sentences describing the place",
  "owner": "name of proprietor/owner",
  "services": "what services or items are offered",
  "notes": "secrets, rumors, or plot hooks"
}'''
        }
        
        if request.entity_type not in entity_prompts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid entity type: {request.entity_type}")
        
        # Build the full prompt
        system_message = "You are the Unseen Servant, a magical helper for D&D Dungeon Masters. You generate content in strict JSON format only. No markdown, no explanations, just valid JSON."
        full_prompt = f"{entity_prompts[request.entity_type]}\n\nUser request: {request.prompt}"
        
        # Initialize LLM
        chat = LlmChat(
            api_key=api_key,
            session_id=f"{username}-unseen-servant-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        # Get AI response
        response = await chat.send_message(UserMessage(text=full_prompt))
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if not json_match:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response as JSON")
        
        entity_data = json.loads(json_match.group())
        
        # Save entity based on type
        entity_id = str(uuid.uuid4())
        entity_name = entity_data.get('name', 'Unnamed')
        
        if request.entity_type == 'god':
            new_god = God(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Deity'),
                domain=entity_data.get('domain', ''),
                description=entity_data.get('description', ''),
                symbol=entity_data.get('symbol', ''),
                alignment=entity_data.get('alignment', ''),
                notes=entity_data.get('notes', '')
            )
            await db.gods.insert_one(new_god.model_dump())
            
        elif request.entity_type == 'npc':
            new_npc = NPC(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown NPC'),
                description=entity_data.get('description', ''),
                hp=entity_data.get('hp', 10),
                ac=entity_data.get('ac', 10),
                location=entity_data.get('location', ''),
                notes=entity_data.get('notes', '')
            )
            await db.npcs.insert_one(new_npc.model_dump())
            
        elif request.entity_type == 'location':
            new_location = Location(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Location'),
                location_type=entity_data.get('location_type', ''),
                description=entity_data.get('description', ''),
                notable_npcs=entity_data.get('notable_npcs', ''),
                notes=entity_data.get('notes', ''),
                places_of_interest=[]
            )
            await db.locations.insert_one(new_location.model_dump())
            
        elif request.entity_type == 'place_of_interest':
            if not request.location_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="location_id required for place_of_interest")
            
            location = await db.locations.find_one({'id': request.location_id, 'campaign_id': request.campaign_id})
            if not location:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
            
            new_place = {
                'id': entity_id,
                'name': entity_data.get('name', 'Unknown Place'),
                'place_type': entity_data.get('place_type', 'other'),
                'description': entity_data.get('description', ''),
                'owner': entity_data.get('owner', ''),
                'services': entity_data.get('services', ''),
                'notes': entity_data.get('notes', '')
            }
            
            places = location.get('places_of_interest', [])
            places.append(new_place)
            
            await db.locations.update_one(
                {'id': request.location_id},
                {'$set': {'places_of_interest': places}}
            )
        
        # Increment AI usage for free tier users
        await increment_ai_usage(username)
        
        return UnseenServantResponse(
            success=True,
            entity_type=request.entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            message=f"Successfully created {request.entity_type}: {entity_name}"
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response")
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Unseen Servant error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {str(e)}")

@api_router.post("/ai/generate", response_model=AIGenerationResponse)
async def generate_ai_content(request: AIGenerationRequest, username: str = Depends(get_current_user)):
    try:
        # Check if user can use AI features
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You've reached your monthly AI generation limit. Upgrade to Adventurer for unlimited access!"
            )
        
        # Get API key from environment
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Get campaign context if campaign_id provided
        system_context = ""
        if hasattr(request, 'campaign_id') and request.campaign_id:
            campaign = await db.campaigns.find_one({'id': request.campaign_id})
            if campaign:
                system_context = f" for {campaign.get('system', 'D&D 5e')} system"
        
        # Create system message based on generation type
        system_messages = {
            'encounter': f'You are a TTRPG encounter designer{system_context}. Create detailed, balanced encounters with monsters, tactics, and environmental details following the rules and conventions of the system.',
            'trap': f'You are a TTRPG trap designer{system_context}. Create creative and dangerous traps with trigger mechanisms, effects, and disarm methods appropriate for the system.',
            'npc': f'You are a TTRPG NPC creator{system_context}. Create memorable NPCs with personality, backstory, stats, and plot hooks using the system\'s stat format.',
            'world': f'You are a TTRPG world-builder{system_context}. Create rich locations, lore, factions, and story hooks for campaigns.'
        }
        
        system_message = system_messages.get(request.generation_type, f'You are a helpful TTRPG assistant{system_context}.')
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"{username}-{request.generation_type}-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        # Create user message
        user_message = UserMessage(text=request.prompt)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Increment AI usage for free tier users
        await increment_ai_usage(username)
        
        return AIGenerationResponse(
            content=response,
            generation_type=request.generation_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI generation failed: {str(e)}")

@api_router.post("/campaigns/{campaign_id}/ingame-notes/{note_id}/process-ai")
async def process_note_with_ai(campaign_id: str, note_id: str, username: str = Depends(get_current_user)):
    try:
        campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
        note = await db.ingame_notes.find_one({'id': note_id, 'campaign_id': campaign_id})
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Get campaign context
        players = await db.players.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        
        player_names = [p['name'] for p in players]
        npc_names = [n['name'] for n in npcs]
        location_names = [l['name'] for l in locations]
        god_names = [g['name'] for g in gods]
        
        system_message = f"""You are an AI assistant helping organize D&D campaign notes.
Given campaign notes from a session, extract structured information and suggest additions to existing entities or new entities to create.

Campaign Context:
- Players: {', '.join(player_names) if player_names else 'None yet'}
- NPCs: {', '.join(npc_names) if npc_names else 'None yet'}
- Locations: {', '.join(location_names) if location_names else 'None yet'}
- Gods: {', '.join(god_names) if god_names else 'None yet'}

Analyze the session notes and return a JSON response with this structure:
{{
  "new_npcs": [{{ "name": "NPC Name", "description": "Brief description", "notes": "Session context" }}],
  "new_locations": [{{ "name": "Location Name", "type": "city/dungeon/etc", "description": "Brief description", "notes": "Session context" }}],
  "new_gods": [{{ "name": "God Name", "domain": "Domain", "description": "Brief description" }}],
  "npc_updates": [{{ "name": "Existing NPC Name", "additional_notes": "New information learned" }}],
  "location_updates": [{{ "name": "Existing Location Name", "additional_notes": "New information learned" }}]
}}

Only include entities that are explicitly mentioned in the notes. Return ONLY valid JSON, no other text."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"process-note-{note_id}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        user_message = UserMessage(text=f"Session Notes:\n\n{note['content']}")
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        import json
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                suggestions = json.loads(response[json_start:json_end])
            else:
                suggestions = {}
        except:
            suggestions = {}
        
        # Mark note as processed
        await db.ingame_notes.update_one(
            {'id': note_id},
            {'$set': {'ai_processed': True}}
        )
        
        return {
            'suggestions': suggestions,
            'message': 'AI processing complete'
        }
    except Exception as e:
        logger.error(f"AI processing error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI processing failed: {str(e)}")

# ==================== PARTY INVENTORY ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/inventory")
async def get_inventory(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all items in party inventory"""
    items = await db.inventory.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return items

@api_router.post("/campaigns/{campaign_id}/inventory")
async def add_inventory_item(
    campaign_id: str,
    item: InventoryItemCreate,
    current_user: str = Depends(get_current_user)
):
    """Add item to party inventory"""
    new_item = InventoryItem(
        campaign_id=campaign_id,
        **item.model_dump()
    )
    await db.inventory.insert_one(new_item.model_dump())
    return new_item.model_dump()

@api_router.put("/campaigns/{campaign_id}/inventory/{item_id}")
async def update_inventory_item(
    campaign_id: str,
    item_id: str,
    item_update: InventoryItemUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update inventory item"""
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.inventory.update_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    return updated

@api_router.delete("/campaigns/{campaign_id}/inventory/{item_id}")
async def delete_inventory_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Remove item from inventory"""
    result = await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted"}

@api_router.get("/campaigns/{campaign_id}/currency")
async def get_party_currency(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get party currency"""
    currency = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not currency:
        # Initialize currency if not exists
        new_currency = PartyCurrency(campaign_id=campaign_id)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    return currency

@api_router.put("/campaigns/{campaign_id}/currency")
async def update_party_currency(
    campaign_id: str,
    currency_update: PartyCurrencyUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update party currency"""
    update_data = {k: v for k, v in currency_update.model_dump().items() if v is not None}
    
    existing = await db.party_currency.find_one({'campaign_id': campaign_id})
    if not existing:
        new_currency = PartyCurrency(campaign_id=campaign_id, **update_data)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    
    await db.party_currency.update_one(
        {'campaign_id': campaign_id},
        {'$set': update_data}
    )
    updated = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return updated

# ==================== CUSTOM ITEMS ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/custom-items")
async def get_custom_items(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all custom items for campaign"""
    items = await db.custom_items.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return items

@api_router.post("/campaigns/{campaign_id}/custom-items")
async def create_custom_item(
    campaign_id: str,
    item: CustomItemCreate,
    current_user: str = Depends(get_current_user)
):
    """Create custom item"""
    new_item = CustomItem(campaign_id=campaign_id, **item.model_dump())
    await db.custom_items.insert_one(new_item.model_dump())
    return new_item.model_dump()

@api_router.put("/campaigns/{campaign_id}/custom-items/{item_id}")
async def update_custom_item(
    campaign_id: str,
    item_id: str,
    item_update: CustomItemUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update custom item"""
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.custom_items.update_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    updated = await db.custom_items.find_one({'id': item_id}, {'_id': 0})
    return updated

@api_router.delete("/campaigns/{campaign_id}/custom-items/{item_id}")
async def delete_custom_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete custom item"""
    result = await db.custom_items.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
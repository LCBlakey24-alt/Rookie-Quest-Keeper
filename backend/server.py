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

@api_router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({'username': user_data.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    user_doc = {
        'id': str(uuid.uuid4()),
        'username': user_data.username,
        'password_hash': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
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
    return {'username': username}

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
        system_message = f"You are the Unseen Servant, a magical helper for D&D Dungeon Masters. You generate content in strict JSON format only. No markdown, no explanations, just valid JSON."
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
        
        return AIGenerationResponse(
            content=response,
            generation_type=request.generation_type
        )
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
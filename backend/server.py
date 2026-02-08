from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    description: str = ""

class CampaignSetting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    content: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignSettingUpdate(BaseModel):
    content: str

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

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    location_type: str = ""  # city, dungeon, wilderness, etc
    description: str = ""
    notable_npcs: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocationCreate(BaseModel):
    name: str
    location_type: str = ""
    description: str = ""
    notable_npcs: str = ""
    notes: str = ""

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[str] = None
    description: Optional[str] = None
    notable_npcs: Optional[str] = None
    notes: Optional[str] = None

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

@api_router.post("/auth/register", response_model=TokenResponse)
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

@api_router.post("/campaigns", response_model=Campaign)
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
    return setting

# ==================== GODS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/gods", response_model=God)
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

# ==================== LOCATIONS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/locations", response_model=Location)
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

# ==================== IN-GAME NOTES ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/ingame-notes", response_model=InGameNote)
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

@api_router.post("/campaigns/{campaign_id}/players", response_model=Player)
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

@api_router.post("/campaigns/{campaign_id}/npcs", response_model=NPC)
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

@api_router.post("/ai/generate", response_model=AIGenerationResponse)
async def generate_ai_content(request: AIGenerationRequest, username: str = Depends(get_current_user)):
    try:
        # Get API key from environment
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Create system message based on generation type
        system_messages = {
            'encounter': 'You are a D&D encounter designer. Create detailed, balanced encounters with monsters, tactics, and environmental details.',
            'trap': 'You are a D&D trap designer. Create creative and dangerous traps with trigger mechanisms, effects, and disarm methods.',
            'npc': 'You are a D&D NPC creator. Create memorable NPCs with personality, backstory, stats, and plot hooks.',
            'world': 'You are a D&D world-builder. Create rich locations, lore, factions, and story hooks for campaigns.'
        }
        
        system_message = system_messages.get(request.generation_type, 'You are a helpful D&D assistant.')
        
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
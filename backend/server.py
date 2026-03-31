from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
import base64
import asyncio
import secrets
import resend
import socketio
import aiofiles

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

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@rookiequestkeeper.com')
# Production URL - HARDCODED to ensure password reset emails ALWAYS go to correct domain
# This overrides any environment variable to prevent misconfiguration
APP_URL = 'https://rookiequestkeeper.com'

# STRIPE INTEGRATION RE-ENABLED
STRIPE_ENABLED = True
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

if RESEND_API_KEY and RESEND_API_KEY != 'your_resend_api_key_here':
    resend.api_key = RESEND_API_KEY

# Security
security = HTTPBearer()

# Admin usernames - these users can access admin features and get auto-upgraded to legendary tier
ADMIN_USERNAMES = ["lcblakey24"]

# D&D 5e Edition Rules - Subclass unlock levels
SUBCLASS_LEVELS_2014 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 1, 'Druid': 2, 'Fighter': 3, 
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 1, 
    'Warlock': 1, 'Wizard': 2
}
SUBCLASS_LEVELS_2024 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 3, 'Druid': 3, 'Fighter': 3, 
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 3, 
    'Warlock': 3, 'Wizard': 3
}

# Hit dice by class
HIT_DICE = {
    'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
    'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
    'Sorcerer': 6, 'Wizard': 6
}

def get_subclass_unlock_level(class_name: str, edition: str = "2014") -> int:
    """Get the level at which a class gets their subclass"""
    if edition == "2024":
        return SUBCLASS_LEVELS_2024.get(class_name, 3)
    return SUBCLASS_LEVELS_2014.get(class_name, 3)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== WEBSOCKET REAL-TIME SYNC ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time campaign sync"""
    def __init__(self):
        # Maps campaign_id -> set of WebSocket connections
        self.campaign_connections: Dict[str, Set[WebSocket]] = {}
        # Maps user_id -> WebSocket for direct messages
        self.user_connections: Dict[str, WebSocket] = {}
        # Maps campaign_id -> set of connected user_ids
        self.campaign_users: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, campaign_id: str = None):
        await websocket.accept()
        self.user_connections[user_id] = websocket
        
        if campaign_id:
            if campaign_id not in self.campaign_connections:
                self.campaign_connections[campaign_id] = set()
                self.campaign_users[campaign_id] = set()
            self.campaign_connections[campaign_id].add(websocket)
            self.campaign_users[campaign_id].add(user_id)
            
            # Notify others in campaign
            await self.broadcast_to_campaign(campaign_id, {
                "type": "user_joined",
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, exclude=websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, campaign_id: str = None):
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        
        if campaign_id:
            if campaign_id in self.campaign_connections:
                self.campaign_connections[campaign_id].discard(websocket)
            if campaign_id in self.campaign_users:
                self.campaign_users[campaign_id].discard(user_id)

    async def broadcast_to_campaign(self, campaign_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all connections in a campaign"""
        if campaign_id in self.campaign_connections:
            for connection in self.campaign_connections[campaign_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception:
                pass

    def get_campaign_users(self, campaign_id: str) -> Set[str]:
        """Get list of connected users in a campaign"""
        return self.campaign_users.get(campaign_id, set())

ws_manager = ConnectionManager()

# ==================== CUSTOM RULES MODELS ====================

class CustomRulesUpload(BaseModel):
    """Model for uploading custom rules JSON"""
    name: str  # Name of the ruleset (e.g., "Homebrew Classes v2")
    description: str = ""
    rules_type: str  # "classes", "races", "spells", "items", "feats", "backgrounds", "full"
    content: Dict[str, Any]  # The actual rules JSON
    is_public: bool = False  # Can others view/copy this ruleset?

class CustomRuleset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str  # User who uploaded this
    name: str
    description: str = ""
    rules_type: str
    content: Dict[str, Any]
    is_public: bool = False
    shared_with: List[str] = []  # List of user_ids who have access
    shared_campaigns: List[str] = []  # Campaigns that have access
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignInvite(BaseModel):
    """Campaign invite/join link"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    created_by: str  # GM user_id
    code: str = Field(default_factory=lambda: secrets.token_urlsafe(8))
    expires_at: Optional[str] = None
    max_uses: Optional[int] = None
    uses: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignMember(BaseModel):
    """Player membership in a campaign"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    user_id: str
    username: str
    role: str = "player"  # "player", "co-gm", "spectator"
    character_id: Optional[str] = None
    joined_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # Rulesets shared with this player from the campaign
    shared_rulesets: List[str] = []

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    username: str  # Display name
    password: str
    referral_code: Optional[str] = None  # Optional referral code from friend

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str
    email: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateAccountRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dm_user_id: str
    name: str
    description: str = ""
    system: str = "5e 2024 Compatible"  # TTRPG system
    world_setting: str = "custom"  # e.g., "forgotten_realms", "eberron", "greyhawk", "custom"
    world_setting_notes: str = ""  # Additional notes about the setting for AI context
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    system: str = "5e 2024 Compatible"
    world_setting: str = "custom"
    world_setting_notes: str = ""

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

class CampaignWorldSettingUpdate(BaseModel):
    world_setting: str = "custom"  # high_fantasy, magipunk_noir, classic_fantasy, epic_fantasy, gothic_horror, fantasy_space, planar_adventure, custom
    world_setting_notes: str = ""  # Additional context for the AI

class CustomRulesUpload(BaseModel):
    name: str = Field(..., description="Name for this ruleset (e.g., 'PHB 2014', 'Homebrew Rules')")
    content: str = Field(..., description="The rules content (text)")
    source_type: str = Field(default="manual", description="How rules were added: manual, pdf_extract, file_upload")

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

# ==================== CAMPAIGN CONTENT MODELS (Structured Rules) ====================
# These allow GMs to define custom races, classes, subclasses, backgrounds, feats
# Players in the campaign can then use these in character creation

class CampaignRace(BaseModel):
    """Custom race for a campaign's ruleset"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    ruleset_id: Optional[str] = None  # Links to a ruleset (e.g., "2014_phb", "2024_phb", "homebrew")
    name: str
    description: str = ""
    size: str = "Medium"  # Small, Medium, Large
    speed: int = 30
    ability_bonuses: Dict[str, int] = {}  # {"strength": 2, "constitution": 1}
    traits: List[Dict[str, str]] = []  # [{"name": "Darkvision", "description": "You can see in dim light..."}]
    languages: List[str] = ["Common"]
    subraces: List[Dict[str, Any]] = []  # For races with subraces
    source: str = "Homebrew"  # "2014 PHB", "2024 PHB", "Homebrew", etc.
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

class CampaignClass(BaseModel):
    """Custom class for a campaign's ruleset"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    ruleset_id: Optional[str] = None
    name: str
    description: str = ""
    hit_die: str = "d8"  # d6, d8, d10, d12
    primary_ability: str = ""  # "Strength", "Dexterity and Wisdom", etc.
    saving_throw_proficiencies: List[str] = []  # ["Strength", "Constitution"]
    armor_proficiencies: List[str] = []  # ["Light armor", "Medium armor", "Shields"]
    weapon_proficiencies: List[str] = []  # ["Simple weapons", "Martial weapons"]
    tool_proficiencies: List[str] = []
    skill_choices: Dict[str, Any] = {}  # {"choose": 2, "from": ["Athletics", "Intimidation", ...]}
    starting_equipment: List[str] = []
    features: List[Dict[str, Any]] = []  # [{"level": 1, "name": "Fighting Style", "description": "..."}]
    spellcasting: Optional[Dict[str, Any]] = None  # Spellcasting details if applicable
    source: str = "Homebrew"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

class CampaignSubclass(BaseModel):
    """Custom subclass for a campaign's ruleset"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    ruleset_id: Optional[str] = None
    parent_class: str  # The class this subclass belongs to (e.g., "Fighter")
    name: str
    description: str = ""
    subclass_level: int = 3  # Level when you choose this subclass
    features: List[Dict[str, Any]] = []  # [{"level": 3, "name": "Battle Master Maneuvers", "description": "..."}]
    source: str = "Homebrew"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

class CampaignBackground(BaseModel):
    """Custom background for a campaign's ruleset"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    ruleset_id: Optional[str] = None
    name: str
    description: str = ""
    skill_proficiencies: List[str] = []  # ["Athletics", "Survival"]
    tool_proficiencies: List[str] = []
    languages: int = 0  # Number of additional languages
    equipment: List[str] = []
    feature_name: str = ""  # Background feature name
    feature_description: str = ""  # Background feature description
    personality_traits: List[str] = []
    ideals: List[str] = []
    bonds: List[str] = []
    flaws: List[str] = []
    source: str = "Homebrew"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

class CampaignFeat(BaseModel):
    """Custom feat for a campaign's ruleset"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    ruleset_id: Optional[str] = None
    name: str
    description: str = ""
    prerequisites: str = ""  # "Strength 13 or higher", "Spellcasting ability", etc.
    benefits: List[str] = []  # List of benefits the feat provides
    source: str = "Homebrew"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

class CampaignRuleset(BaseModel):
    """A collection of rules (races, classes, etc.) that can be shared"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str  # "D&D 5e 2014", "D&D 5e 2024", "My Homebrew", etc.
    description: str = ""
    version: str = "1.0"
    is_active: bool = True  # Whether this ruleset is enabled for the campaign
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""

# Create models for adding content
class CampaignRaceCreate(BaseModel):
    name: str
    description: str = ""
    size: str = "Medium"
    speed: int = 30
    ability_bonuses: Dict[str, int] = {}
    traits: List[Dict[str, str]] = []
    languages: List[str] = ["Common"]
    subraces: List[Dict[str, Any]] = []
    source: str = "Homebrew"
    ruleset_id: Optional[str] = None

class CampaignClassCreate(BaseModel):
    name: str
    description: str = ""
    hit_die: str = "d8"
    primary_ability: str = ""
    saving_throw_proficiencies: List[str] = []
    armor_proficiencies: List[str] = []
    weapon_proficiencies: List[str] = []
    tool_proficiencies: List[str] = []
    skill_choices: Dict[str, Any] = {}
    starting_equipment: List[str] = []
    features: List[Dict[str, Any]] = []
    spellcasting: Optional[Dict[str, Any]] = None
    source: str = "Homebrew"
    ruleset_id: Optional[str] = None

class CampaignSubclassCreate(BaseModel):
    parent_class: str
    name: str
    description: str = ""
    subclass_level: int = 3
    features: List[Dict[str, Any]] = []
    source: str = "Homebrew"
    ruleset_id: Optional[str] = None

class CampaignBackgroundCreate(BaseModel):
    name: str
    description: str = ""
    skill_proficiencies: List[str] = []
    tool_proficiencies: List[str] = []
    languages: int = 0
    equipment: List[str] = []
    feature_name: str = ""
    feature_description: str = ""
    personality_traits: List[str] = []
    ideals: List[str] = []
    bonds: List[str] = []
    flaws: List[str] = []
    source: str = "Homebrew"
    ruleset_id: Optional[str] = None

class CampaignFeatCreate(BaseModel):
    name: str
    description: str = ""
    prerequisites: str = ""
    benefits: List[str] = []
    source: str = "Homebrew"
    ruleset_id: Optional[str] = None

class CampaignRulesetCreate(BaseModel):
    name: str
    description: str = ""
    version: str = "1.0"

class BulkContentUpload(BaseModel):
    """For uploading a complete ruleset with all content at once"""
    ruleset_name: str
    ruleset_description: str = ""
    races: List[CampaignRaceCreate] = []
    classes: List[CampaignClassCreate] = []
    subclasses: List[CampaignSubclassCreate] = []
    backgrounds: List[CampaignBackgroundCreate] = []
    feats: List[CampaignFeatCreate] = []

# ==================== USER-LEVEL RULESET MODELS ====================
# These are rulesets stored per-user (not campaign) with edition tagging

class UserRuleset(BaseModel):
    """A user's personal ruleset collection with edition tagging"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # "D&D 5e 2014 PHB", "My Custom Classes", etc.
    description: str = ""
    edition: str = "2014"  # "2014" or "2024" - the rule edition this content belongs to
    version: str = "1.0"
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserRace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ruleset_id: str
    edition: str = "2014"
    name: str
    description: str = ""
    size: str = "Medium"
    speed: int = 30
    ability_bonuses: Dict[str, int] = {}
    traits: List[Dict[str, str]] = []
    languages: List[str] = ["Common"]
    subraces: List[Dict[str, Any]] = []
    source: str = "Custom"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserClass(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ruleset_id: str
    edition: str = "2014"
    name: str
    description: str = ""
    hit_die: str = "d8"
    primary_ability: str = ""
    saving_throw_proficiencies: List[str] = []
    armor_proficiencies: List[str] = []
    weapon_proficiencies: List[str] = []
    features: List[Dict[str, Any]] = []
    source: str = "Custom"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSubclass(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ruleset_id: str
    edition: str = "2014"
    parent_class: str
    name: str
    description: str = ""
    subclass_level: int = 3
    features: List[Dict[str, Any]] = []
    source: str = "Custom"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserBackground(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ruleset_id: str
    edition: str = "2014"
    name: str
    description: str = ""
    skill_proficiencies: List[str] = []
    tool_proficiencies: List[str] = []
    languages: int = 0
    equipment: List[str] = []
    feature_name: str = ""
    feature_description: str = ""
    source: str = "Custom"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserFeat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ruleset_id: str
    edition: str = "2014"
    name: str
    description: str = ""
    prerequisites: str = ""
    benefits: List[str] = []
    source: str = "Custom"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserBulkContentUpload(BaseModel):
    """For uploading a user's personal ruleset"""
    ruleset_name: str
    ruleset_description: str = ""
    edition: str = "2014"  # "2014" or "2024"
    races: List[CampaignRaceCreate] = []  # Reuse existing create models
    classes: List[CampaignClassCreate] = []
    subclasses: List[CampaignSubclassCreate] = []
    backgrounds: List[CampaignBackgroundCreate] = []
    feats: List[CampaignFeatCreate] = []

# ==================== PLAYER CHARACTER MODELS ====================

class PlayerCharacter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the character
    campaign_id: Optional[str] = None  # None if not linked to campaign yet
    
    # Basic Info
    name: str
    race: str  # Human, Elf, Dwarf, etc.
    character_class: str  # Fighter, Wizard, etc.
    subclass: str = ""
    background: str = ""
    level: int = 1
    experience_points: int = 0
    edition: str = "2014"  # D&D edition: "2014" or "2024"
    
    # Ability Scores
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10
    
    # Combat Stats
    armor_class: int = 10
    initiative_bonus: int = 0
    speed: int = 30
    max_hit_points: int = 10
    current_hit_points: int = 10
    temporary_hit_points: int = 0
    hit_dice: str = "1d8"  # e.g., "3d10"
    hit_dice_remaining: int = 1
    death_saves_successes: int = 0
    death_saves_failures: int = 0
    
    # Proficiencies & Skills
    proficiency_bonus: int = 2
    saving_throw_proficiencies: List[str] = []  # ["strength", "constitution"]
    skill_proficiencies: List[str] = []  # ["athletics", "perception"]
    weapon_proficiencies: List[str] = []
    armor_proficiencies: List[str] = []
    tool_proficiencies: List[str] = []
    languages: List[str] = []
    
    # Features & Traits
    racial_traits: List[Dict[str, str]] = []  # [{"name": "Darkvision", "description": "..."}]
    class_features: List[Dict[str, str]] = []
    feats: List[Dict[str, str]] = []
    
    # Spellcasting (if applicable)
    spellcasting_ability: str = ""  # "intelligence", "wisdom", "charisma"
    spell_save_dc: int = 0
    spell_attack_bonus: int = 0
    spell_slots: Dict[str, int] = {}  # {"1": 2, "2": 1} - slots per level
    spell_slots_remaining: Dict[str, int] = {}
    spells_known: List[Dict[str, Any]] = []  # [{"name": "Fireball", "level": 3, "school": "evocation"}]
    spells_prepared: List[Dict[str, Any]] = []  # Spells currently prepared for the day
    cantrips_known: List[Dict[str, Any]] = []  # [{"name": "Fire Bolt", "level": 0}] - Cantrips the character knows
    
    # Level Progression Tracking
    level_progression: Dict[str, Any] = {}  # {"4": {"type": "asi", "choices": {"strength": 2}}, "8": {"type": "feat", "feat_name": "Alert"}}
    asi_increases: Dict[str, int] = {}  # Total ASI bonuses applied {"strength": 2, "dexterity": 2}
    
    # Equipment & Inventory
    equipment: List[Dict[str, Any]] = []  # [{"name": "Longsword", "equipped": true}]
    inventory: List[Dict[str, Any]] = []
    equipped: Dict[str, Any] = {"armor": None, "shield": None, "mainHand": None, "offHand": None}
    currency: Dict[str, int] = {"copper": 0, "silver": 0, "electrum": 0, "gold": 0, "platinum": 0}
    gold: int = 0  # Shorthand for currency.gold
    
    # Character Details
    alignment: str = "Neutral"
    personality_traits: str = ""
    ideals: str = ""
    bonds: str = ""
    flaws: str = ""
    backstory: str = ""
    appearance: str = ""
    notes: str = ""
    
    # Meta
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerCharacterCreate(BaseModel):
    name: str
    race: str
    character_class: str
    subclass: str = ""
    background: str = ""
    level: int = 1
    edition: str = "2014"  # D&D edition: "2014" or "2024"
    
    # Ability Scores
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10
    
    # Optional fields
    armor_class: Optional[int] = 10
    speed: Optional[int] = 30
    max_hit_points: Optional[int] = None  # Auto-calculate if not provided
    alignment: str = "Neutral"
    backstory: str = ""
    portrait_url: Optional[str] = None
    campaign_id: Optional[str] = None
    
    # Spell and feat selections from character creation
    # spells_known: for known-spell casters (Bard, Sorcerer, Ranger, Warlock)
    # spells_prepared: for prepared casters (Cleric, Druid, Paladin, Wizard)
    # cantrips_known: for all spellcasters
    spells_known: Optional[List[Dict[str, Any]]] = []
    spells_prepared: Optional[List[Dict[str, Any]]] = []
    cantrips_known: Optional[List[Dict[str, Any]]] = []
    feats: Optional[List[Dict[str, Any]]] = []

class PlayerCharacterUpdate(BaseModel):
    name: Optional[str] = None
    race: Optional[str] = None
    character_class: Optional[str] = None
    subclass: Optional[str] = None
    background: Optional[str] = None
    level: Optional[int] = None
    experience_points: Optional[int] = None
    
    # Ability Scores
    strength: Optional[int] = None
    dexterity: Optional[int] = None
    constitution: Optional[int] = None
    intelligence: Optional[int] = None
    wisdom: Optional[int] = None
    charisma: Optional[int] = None
    
    # Combat Stats
    armor_class: Optional[int] = None
    initiative_bonus: Optional[int] = None
    speed: Optional[int] = None
    max_hit_points: Optional[int] = None
    current_hit_points: Optional[int] = None
    temporary_hit_points: Optional[int] = None
    hit_dice: Optional[str] = None
    hit_dice_remaining: Optional[int] = None
    
    # Skills & Proficiencies
    proficiency_bonus: Optional[int] = None
    saving_throw_proficiencies: Optional[List[str]] = None
    skill_proficiencies: Optional[List[str]] = None
    weapon_proficiencies: Optional[List[str]] = None
    armor_proficiencies: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    
    # Features & Traits
    racial_traits: Optional[List[Dict[str, str]]] = None
    class_features: Optional[List[Dict[str, str]]] = None
    feats: Optional[List[Dict[str, str]]] = None
    
    # Spellcasting
    spellcasting_ability: Optional[str] = None
    spell_save_dc: Optional[int] = None
    spell_attack_bonus: Optional[int] = None
    spell_slots: Optional[Dict[str, int]] = None
    spell_slots_remaining: Optional[Dict[str, int]] = None
    spells_known: Optional[List[Dict[str, Any]]] = None
    spells_prepared: Optional[List[Dict[str, Any]]] = None
    
    # Level Progression
    level_progression: Optional[Dict[str, Any]] = None
    asi_increases: Optional[Dict[str, int]] = None
    
    # Equipment
    equipment: Optional[List[Dict[str, Any]]] = None
    inventory: Optional[List[Dict[str, Any]]] = None
    equipped: Optional[Dict[str, Any]] = None
    currency: Optional[Dict[str, int]] = None
    gold: Optional[int] = None
    
    # Character Details
    alignment: Optional[str] = None
    personality_traits: Optional[str] = None
    ideals: Optional[str] = None
    bonds: Optional[str] = None
    flaws: Optional[str] = None
    backstory: Optional[str] = None
    appearance: Optional[str] = None
    notes: Optional[str] = None
    campaign_id: Optional[str] = None  # For linking to campaign

class CampaignJoinRequest(BaseModel):
    join_code: str
    character_id: str

class AICharacterGenerateRequest(BaseModel):
    description: str  # Player's description of desired character

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

# ==================== PLAYER NOTES MODELS ====================

class SessionRecap(BaseModel):
    """Session recap generated by GM and synced to players"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    campaign_name: str = ""
    user_id: str  # Player who receives this recap
    content: str
    session_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""  # GM who created the recap
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerNote(BaseModel):
    """Personal notes created by players"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    title: str = ""
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============================================
# SESSION TIMELINE & GM-PLAYER SYNC
# ============================================

class TimelineEvent(BaseModel):
    """Campaign timeline event for players"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    event_type: str  # 'session_recap', 'npc_met', 'location_visited', 'quest_started', 'quest_completed', 'item_found', 'gm_note'
    title: str
    description: str = ""
    session_number: int = 0
    related_npc_id: Optional[str] = None
    related_location_id: Optional[str] = None
    related_character_ids: List[str] = []  # Characters this event involves
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""  # GM username

class TimelineEventCreate(BaseModel):
    event_type: str
    title: str
    description: str = ""
    session_number: int = 0
    related_npc_id: Optional[str] = None
    related_location_id: Optional[str] = None
    related_character_ids: List[str] = []

class GMNoteSync(BaseModel):
    """Model for syncing GM notes to player characters"""
    note_content: str
    note_type: str = "gm_note"  # 'gm_note', 'session_recap', 'quest_update'
    target_character_ids: List[str] = []  # Empty = all characters in campaign
    title: str = ""
    create_timeline_event: bool = True

class PlayerNoteCreate(BaseModel):
    campaign_id: Optional[str] = None
    title: str = ""
    content: str

class PlayerNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

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


# ==================== MODULAR PROGRESSION SYSTEM ====================
# Database-driven character progression that supports multiple rule systems

class RuleSystem(BaseModel):
    """Defines a rule system (e.g., 5e, Pathfinder 2e, homebrew)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "5e", "Pathfinder 2e", "Custom"
    version: str = "1.0"
    description: str = ""
    max_level: int = 20
    ability_scores: List[str] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProgressionClass(BaseModel):
    """Defines a class within a rule system"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str  # References RuleSystem
    name: str  # "Fighter", "Wizard", etc.
    hit_die: int = 8  # d6, d8, d10, d12
    primary_ability: str = "strength"
    saving_throw_proficiencies: List[str] = []
    skill_choices: int = 2
    available_skills: List[str] = []
    armor_proficiencies: List[str] = []
    weapon_proficiencies: List[str] = []
    description: str = ""
    subclass_level: int = 3  # Level at which subclass is chosen

class ProgressionRace(BaseModel):
    """Defines a race within a rule system"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    ability_bonuses: Dict[str, int] = {}  # {"strength": 2, "constitution": 1}
    size: str = "Medium"
    speed: int = 30
    languages: List[str] = ["Common"]
    traits: List[str] = []  # IDs of features granted by race
    description: str = ""

class ProgressionFeature(BaseModel):
    """Defines a feature that can be granted at various levels"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    description: str
    source_type: str  # "class", "race", "subclass", "feat", "background"
    source_id: Optional[str] = None  # ID of class/race/subclass that grants this
    level_requirement: int = 1
    prerequisites: Dict[str, Any] = {}  # {"ability": {"strength": 13}, "proficiency": "heavy_armor"}
    effects: Dict[str, Any] = {}  # {"proficiency": ["perception"], "damage_resistance": ["fire"]}
    is_choice: bool = False  # If true, this feature offers choices

class FeatureChoice(BaseModel):
    """Defines choices available for a feature (e.g., ASI options, feat list)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    feature_id: str
    choice_type: str  # "asi", "feat", "skill", "spell", "subclass", "ability_option"
    name: str
    description: str = ""
    options: List[Dict[str, Any]] = []  # List of selectable options
    num_choices: int = 1  # How many options can be selected
    
class ClassLevelProgression(BaseModel):
    """Defines what a class gains at each level"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    level: int
    features: List[str] = []  # Feature IDs gained at this level
    choice_groups: List[str] = []  # FeatureChoice IDs available at this level
    proficiency_bonus: int = 2
    cantrips_known: Optional[int] = None
    spells_known: Optional[int] = None
    spell_slots: Dict[str, int] = {}  # {"1": 2, "2": 1}
    extra_attack: int = 0
    sneak_attack_dice: Optional[str] = None  # "1d6", "2d6", etc.
    rage_count: Optional[int] = None
    ki_points: Optional[int] = None
    # Class-specific resources
    class_resources: Dict[str, Any] = {}

class CharacterFeatureSelection(BaseModel):
    """Records a character's selected features and choices"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    character_id: str
    feature_id: str
    level_gained: int
    choice_made: Optional[Dict[str, Any]] = None  # The actual selection made
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LevelUpWizardState(BaseModel):
    """Tracks state of level-up wizard for a character"""
    character_id: str
    current_level: int
    target_level: int
    pending_features: List[str] = []
    pending_choices: List[Dict[str, Any]] = []
    completed_selections: List[Dict[str, Any]] = []
    hp_method: str = "average"  # "average" or "roll"
    hp_roll_result: Optional[int] = None

class ProgressionQueryRequest(BaseModel):
    system_id: Optional[str] = None
    class_id: Optional[str] = None
    race_id: Optional[str] = None
    level: Optional[int] = None



class NPCAttack(BaseModel):
    name: str = ""
    bonus: str = ""
    damage: str = ""
    notes: str = ""

class NPCAbility(BaseModel):
    name: str = ""
    description: str = ""

class NPCSpells(BaseModel):
    casting_ability: str = ""
    spell_save_dc: int = 0
    spell_attack_bonus: int = 0
    cantrips: List[str] = []
    slot_level: int = 0
    slot_count: int = 0
    known_spells: List[str] = []

class NPCStats(BaseModel):
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10

class NPC(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    race: str = ""
    class_name: str = ""
    level: int = 1
    alignment: str = ""
    description: str = ""
    appearance: str = ""
    personality: str = ""
    backstory: str = ""
    role: str = ""
    hp: int = 10
    max_hp: int = 10
    ac: int = 10
    speed: str = "30 ft."
    proficiency_bonus: int = 2
    stats: NPCStats = Field(default_factory=NPCStats)
    saving_throws: List[str] = []
    skills: List[str] = []
    attacks: List[NPCAttack] = []
    abilities: List[NPCAbility] = []
    spells: Optional[NPCSpells] = None
    location: str = ""
    notes: str = ""
    color: str = "#8A2BE2"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NPCCreate(BaseModel):
    name: str
    race: str = ""
    class_name: str = ""
    level: int = 1
    alignment: str = ""
    description: str = ""
    appearance: str = ""
    personality: str = ""
    backstory: str = ""
    role: str = ""
    hp: int = 10
    max_hp: int = 10
    ac: int = 10
    speed: str = "30 ft."
    proficiency_bonus: int = 2
    stats: Optional[NPCStats] = None
    saving_throws: List[str] = []
    skills: List[str] = []
    attacks: List[NPCAttack] = []
    abilities: List[NPCAbility] = []
    spells: Optional[NPCSpells] = None
    location: str = ""
    notes: str = ""
    color: str = "#8A2BE2"
    occupation: str = ""

class NPCUpdate(BaseModel):
    name: Optional[str] = None
    race: Optional[str] = None
    class_name: Optional[str] = None
    level: Optional[int] = None
    alignment: Optional[str] = None
    description: Optional[str] = None
    appearance: Optional[str] = None
    personality: Optional[str] = None
    backstory: Optional[str] = None
    role: Optional[str] = None
    hp: Optional[int] = None
    max_hp: Optional[int] = None
    ac: Optional[int] = None
    speed: Optional[str] = None
    proficiency_bonus: Optional[int] = None
    stats: Optional[NPCStats] = None
    saving_throws: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    attacks: Optional[List[NPCAttack]] = None
    abilities: Optional[List[NPCAbility]] = None
    spells: Optional[NPCSpells] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = None

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
    width: int = 30
    height: int = 20
    terrain: List[List[str]] = []  # 2D array of terrain types
    walls: List[dict] = []  # Wall segments
    doors: List[dict] = []  # Door placements
    objects: List[dict] = []  # Map objects
    fog_of_war: List[List[bool]] = []  # 2D array of fog visibility
    tokens: List[Token] = []
    background_image: Optional[str] = None  # Base64 encoded background
    image_data: str = ""  # Legacy support
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameMapCreate(BaseModel):
    name: str
    width: int = 30
    height: int = 20
    terrain: List[List[str]] = []
    walls: List[dict] = []
    doors: List[dict] = []
    objects: List[dict] = []
    fog_of_war: List[List[bool]] = []
    tokens: List[dict] = []
    background_image: Optional[str] = None
    image_data: str = ""

class GameMapUpdate(BaseModel):
    name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    terrain: Optional[List[List[str]]] = None
    walls: Optional[List[dict]] = None
    doors: Optional[List[dict]] = None
    objects: Optional[List[dict]] = None
    fog_of_war: Optional[List[List[bool]]] = None
    tokens: Optional[List[Token]] = None
    background_image: Optional[str] = None
    image_data: Optional[str] = None


# ==================== WORLD MAP MODELS ====================

class MapPin(BaseModel):
    """A pin/marker on a world or local map"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    x: float  # X coordinate (0-100 as percentage)
    y: float  # Y coordinate (0-100 as percentage)
    name: str
    pin_type: str = "location"  # location, city, town, village, landmark, poi, custom
    linked_location_id: Optional[str] = None  # Link to existing Location
    linked_place_id: Optional[str] = None  # Link to existing Place of Interest
    description: str = ""
    icon: str = "MapPin"  # Icon name for frontend
    color: str = "#E11D48"  # Pin color

class TravelPath(BaseModel):
    """A path between two pins with travel info"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_pin_id: str
    to_pin_id: str
    distance_value: float = 0  # Distance in the unit specified
    distance_unit: str = "miles"  # miles, km, days, hours
    terrain_type: str = "road"  # road, trail, wilderness, mountain, water, desert
    terrain_modifier: float = 1.0  # Multiplier for travel time (1.0 = normal, 2.0 = double time)
    notes: str = ""
    is_bidirectional: bool = True

class WorldMap(BaseModel):
    """A world/region map for a campaign"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    map_type: str = "world"  # world, region, continent
    image_data: str = ""  # Base64 encoded map image
    image_url: Optional[str] = None  # URL to stored image
    width: int = 0  # Original image width
    height: int = 0  # Original image height
    scale_value: float = 1.0  # e.g., 1 inch = X miles
    scale_unit: str = "miles"  # miles, km
    pins: List[Dict[str, Any]] = []  # List of MapPin objects
    paths: List[Dict[str, Any]] = []  # List of TravelPath objects
    travel_speeds: Dict[str, float] = {
        "walking": 24,  # miles per day
        "horseback": 48,
        "cart": 16,
        "ship": 72,
        "flying": 96
    }
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorldMapCreate(BaseModel):
    name: str
    map_type: str = "world"
    image_data: str = ""
    scale_value: float = 1.0
    scale_unit: str = "miles"
    travel_speeds: Optional[Dict[str, float]] = None
    notes: str = ""

class WorldMapUpdate(BaseModel):
    name: Optional[str] = None
    map_type: Optional[str] = None
    image_data: Optional[str] = None
    scale_value: Optional[float] = None
    scale_unit: Optional[str] = None
    pins: Optional[List[Dict[str, Any]]] = None
    paths: Optional[List[Dict[str, Any]]] = None
    travel_speeds: Optional[Dict[str, float]] = None
    notes: Optional[str] = None

class LocalMap(BaseModel):
    """A local map (city, town, village) with places of interest"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    location_id: str  # Links to a Location (city/town/village)
    name: str
    map_type: str = "city"  # city, town, village, dungeon, building
    image_data: str = ""
    image_url: Optional[str] = None
    width: int = 0
    height: int = 0
    pins: List[Dict[str, Any]] = []  # Places of interest pins
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocalMapCreate(BaseModel):
    location_id: str
    name: str
    map_type: str = "city"
    image_data: str = ""
    notes: str = ""

class LocalMapUpdate(BaseModel):
    name: Optional[str] = None
    map_type: Optional[str] = None
    image_data: Optional[str] = None
    pins: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class TravelCalculateRequest(BaseModel):
    from_pin_id: str
    to_pin_id: str
    travel_mode: str = "walking"  # walking, horseback, cart, ship, flying


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

# Subscription pricing - three tiers
# stripe_price_id_monthly and stripe_price_id_yearly will be populated dynamically
SUBSCRIPTION_PLANS = {
    'free': {
        'name': 'Free', 
        'price_monthly': 0.0,
        'price_yearly': 0.0,
        'characters': 1,  # Only 1 character
        'campaigns': 0,   # Can join but not create
        'ai_calls_per_month': 3,
        'features': ['basic_character_sheet', 'dice_roller', 'join_campaigns'],
        'stripe_price_id_monthly': None,
        'stripe_price_id_yearly': None
    },
    'player': {
        'name': 'Hero', 
        'price_monthly': 3.99,
        'price_yearly': 39.99,  # ~2 months free
        'characters': -1,  # Unlimited
        'campaigns': 0,    # Can join but not create
        'ai_calls_per_month': 50,
        'features': ['unlimited_characters', 'character_journal', 'party_inventory', 'session_recaps', 'portrait_ai'],
        'stripe_price_id_monthly': None,
        'stripe_price_id_yearly': None
    },
    'gm': {
        'name': 'Quest Master', 
        'price_monthly': 3.99,
        'price_yearly': 39.99,  # ~2 months free
        'characters': 1,   # Basic character access
        'campaigns': -1,   # Unlimited campaigns
        'ai_calls_per_month': -1,  # Unlimited
        'features': ['unlimited_campaigns', 'world_building', 'rook_ai', 'combat_tracker', 'reference_tools', 'session_mode'],
        'stripe_price_id_monthly': None,
        'stripe_price_id_yearly': None
    },
    'legendary': {
        'name': 'Legendary', 
        'price_monthly': 5.99,
        'price_yearly': 59.99,  # ~2 months free
        'characters': -1,  # Unlimited
        'campaigns': -1,   # Unlimited
        'ai_calls_per_month': -1,  # Unlimited
        'features': ['all_player_features', 'all_gm_features', 'priority_support', 'early_access'],
        'stripe_price_id_monthly': None,
        'stripe_price_id_yearly': None
    },
    # Legacy/Promo tier - full access for early testers
    'adventurer': {
        'name': 'Adventurer', 
        'price_monthly': 0.0,
        'price_yearly': 0.0,
        'characters': -1,  # Unlimited
        'campaigns': -1,   # Unlimited campaigns
        'ai_calls_per_month': -1,  # Unlimited
        'features': ['all_player_features', 'all_gm_features', 'early_tester'],
        'stripe_price_id_monthly': None,
        'stripe_price_id_yearly': None
    },
}

# Initialize Stripe products and prices on startup - DISABLED
async def setup_stripe_products():
    """Stripe products initialization - DISABLED"""
    logger.info("Stripe is DISABLED - skipping product setup")
    return

class SubscriptionTier(BaseModel):
    tier: str = 'free'  # free, player, gm, legendary
    billing_cycle: str = 'monthly'  # monthly, yearly
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: str = 'active'  # active, cancelled, past_due, trialing
    ai_calls_this_month: int = 0
    ai_calls_reset_date: Optional[str] = None
    promo_code_used: Optional[str] = None
    # Referral system
    referral_code: Optional[str] = None  # User's unique referral code
    referred_by: Optional[str] = None  # Who referred this user
    referral_count: int = 0  # How many people they've referred
    free_months_earned: int = 0  # Months earned from referrals
    free_months_used: int = 0  # Months already consumed
    premium_expires_at: Optional[str] = None  # When premium expires (for promo codes)
    upgraded_from: Optional[str] = None  # Previous tier if upgraded

class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    tier_granted: str = 'legendary'  # player, gm, legendary
    duration_days: int = -1  # -1 = forever (for testers), otherwise days of access
    uses_remaining: int = -1  # -1 = unlimited uses
    max_uses: int = -1  # Original max uses for display (-1 = unlimited)
    expires_at: Optional[str] = None  # When the code itself expires
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    description: Optional[str] = None  # Internal note about the code
    is_active: bool = True  # Can be disabled without deleting

class PromoCodeCreate(BaseModel):
    code: str
    tier_granted: str = 'legendary'  # player, gm, legendary
    duration_days: int = -1  # -1 = forever, otherwise days
    uses_remaining: int = -1  # -1 = unlimited
    expires_at: Optional[str] = None
    description: Optional[str] = None

class ApplyPromoCodeRequest(BaseModel):
    code: str

class ApplyReferralCodeRequest(BaseModel):
    referral_code: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    rating: int  # 1-5 stars
    comment: str
    is_approved: bool = False  # Auto-approve 4-5 stars, admin can manage
    is_featured: bool = False  # Shows on landing page
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    rating: int  # 1-5
    comment: str

class CustomCreature(BaseModel):
    """Custom creature/monster created by users"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    cr: str = "1"
    hp: int = 10
    ac: int = 10
    type: str = "humanoid"
    size: str = "Medium"
    speed: str = "30 ft."
    abilities: str = ""
    description: str = ""
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomCreatureCreate(BaseModel):
    name: str
    cr: str = "1"
    hp: int = 10
    ac: int = 10
    type: str = "humanoid"
    size: str = "Medium"
    speed: str = "30 ft."
    abilities: str = ""
    description: str = ""

class CreateCheckoutRequest(BaseModel):
    origin_url: str
    plan_id: str = 'legendary'  # player, gm, legendary
    billing_cycle: str = 'monthly'  # monthly, yearly

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

async def verify_campaign_ownership(campaign_id: str, username: str) -> None:
    """
    Verify that the user owns the campaign. Raises 404 if not found or not owned.
    This helper function eliminates N+1 query pattern by doing a single validation.
    """
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 1})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found or access denied")

async def verify_campaign_membership(campaign_id: str, username: str) -> dict:
    """
    Verify that the user is either the owner OR a player in the campaign.
    Returns the campaign if found, raises 404 if not found or no access.
    """
    # First check if they own it
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    # Check if owner
    if campaign.get('dm_user_id') == username:
        return campaign
    
    # Check if player in campaign (has a character linked to this campaign)
    player_character = await db.player_characters.find_one({
        'user_id': username,
        'campaign_id': campaign_id
    }, {'_id': 1})
    
    if player_character:
        return campaign
    
    # Not owner and not a player
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this campaign to perform this action")

# ==================== AUTH ROUTES ====================

def generate_referral_code(username: str) -> str:
    """Generate a unique referral code for a user"""
    import hashlib
    # Create a short, memorable code based on username + random
    base = f"{username}-{uuid.uuid4().hex[:4]}"
    return base.upper()[:12]

@api_router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # Check if email already exists
    existing_email = await db.users.find_one({'email': user_data.email.lower()})
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Check if username already exists
    existing_user = await db.users.find_one({'username': user_data.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
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
    
    # Auto-upgrade admin user to premium
    if user_data.username.lower() in ADMIN_USERNAMES:
        subscription.tier = "legendary"
        subscription.premium_expires_at = None  # Never expires for admin
    
    user_doc = {
        'id': str(uuid.uuid4()),
        'email': user_data.email.lower(),
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
    
    return TokenResponse(token=token, username=user_data.username, email=user_data.email.lower())

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({'email': user_data.email.lower()})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_token(user['username'])
    return TokenResponse(token=token, username=user['username'], email=user['email'])

# ==================== PASSWORD RESET ====================

@api_router.post("/auth/forgot-password")
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

@api_router.post("/auth/reset-password")
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

@api_router.post("/account/change-password")
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

@api_router.put("/account/update")
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

@api_router.get("/account/profile")
async def get_account_profile(username: str = Depends(get_current_user)):
    """Get current user's account details"""
    user = await db.users.find_one({'username': username}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.delete("/account/delete")
async def delete_account(username: str = Depends(get_current_user)):
    """Delete user account and all associated data"""
    # Delete user's campaigns
    await db.campaigns.delete_many({'user_id': username})
    
    # Delete user's custom creatures
    await db.custom_creatures.delete_many({'created_by': username})
    
    # Delete user's reviews
    await db.reviews.delete_many({'username': username})
    
    # Delete the user
    await db.users.delete_one({'username': username})
    
    return {"message": "Account deleted successfully"}

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
    
    # Check if promo code access has expired
    promo_expires = subscription.get('promo_expires_at')
    if promo_expires and subscription.get('promo_code_used'):
        expires_dt = datetime.fromisoformat(promo_expires.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= expires_dt:
            # Promo expired - revert to free tier (Stripe integration removed)
            subscription['tier'] = 'free'
            subscription['subscription_status'] = 'expired'
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': 'free',
                    'subscription.subscription_status': 'expired',
                    'subscription.promo_expires_at': None
                }}
            )
    
    # Check if referral/other premium has expired (legacy check)
    premium_expires = subscription.get('premium_expires_at')
    if premium_expires and not subscription.get('promo_code_used') and subscription.get('tier') != 'free':
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
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe payments not configured. Use promo codes for premium access.")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        plan = SUBSCRIPTION_PLANS.get(request.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get price based on billing cycle (amounts defined on backend for security)
        if request.billing_cycle == 'yearly':
            price_amount = plan['price_yearly']
        else:
            price_amount = plan['price_monthly']
        
        if price_amount == 0:
            raise HTTPException(status_code=400, detail="Cannot checkout free plan")
        
        # Build success/cancel URLs from frontend origin (dynamic, not hardcoded)
        success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/subscription/cancel"
        
        # Initialize Stripe checkout
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session with fixed price from backend
        checkout_request = CheckoutSessionRequest(
            amount=float(price_amount),  # Keep as float for Stripe
            currency='gbp',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'username': username,
                'plan_id': request.plan_id,
                'billing_cycle': request.billing_cycle
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record BEFORE redirect
        transaction = {
            'id': str(uuid.uuid4()),
            'session_id': session.session_id,
            'username': username,
            'amount': float(price_amount),
            'currency': 'gbp',
            'plan_id': request.plan_id,
            'billing_cycle': request.billing_cycle,
            'payment_status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except ImportError as e:
        logger.error(f"Stripe integration import error: {e}")
        raise HTTPException(status_code=500, detail="Stripe integration not available")
    except Exception as e:
        logger.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@api_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, http_request: Request, username: str = Depends(get_current_user)):
    """Check payment status and activate subscription if paid"""
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe payments not configured.")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Get the transaction record
        transaction = await db.payment_transactions.find_one({'session_id': session_id})
        
        # Only process if payment is successful and not already processed
        if status.payment_status == 'paid' and transaction and transaction.get('payment_status') != 'paid':
            plan_id = transaction.get('plan_id', 'legendary')
            billing_cycle = transaction.get('billing_cycle', 'monthly')
            
            # Activate subscription
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': plan_id,
                    'subscription.billing_cycle': billing_cycle,
                    'subscription.subscription_status': 'active',
                    'subscription.stripe_session_id': session_id,
                    'subscription.activated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {'session_id': session_id},
                {'$set': {
                    'payment_status': 'paid',
                    'completed_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Subscription activated for {username}: {plan_id}")
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100 if status.amount_total else 0,
            "currency": status.currency
        }
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment events"""
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        return {"status": "ignored", "message": "Stripe not configured"}
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Handle successful payment
        if webhook_response.payment_status == 'paid':
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata or {}
            username = metadata.get('username')
            plan_id = metadata.get('plan_id')
            
            if username and plan_id:
                # Update user subscription
                await db.users.update_one(
                    {'username': username},
                    {'$set': {
                        'subscription.tier': plan_id,
                        'subscription.subscription_status': 'active',
                        'subscription.activated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {'session_id': session_id},
                    {'$set': {
                        'payment_status': 'paid',
                        'completed_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                logger.info(f"Webhook: Subscription activated for {username}: {plan_id}")
        
        return {"status": "received", "event_type": webhook_response.event_type}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/subscription/cancel")
async def cancel_subscription(username: str = Depends(get_current_user)):
    """Cancel the user's subscription"""
    user = await db.users.find_one({'username': username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_tier = user.get('subscription', {}).get('tier', 'free')
    if current_tier == 'free':
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # Update subscription to cancelled, revert to free
    await db.users.update_one(
        {'username': username},
        {'$set': {
            'subscription.tier': 'free',
            'subscription.subscription_status': 'cancelled',
            'subscription.cancelled_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Subscription cancelled. You now have free tier access.",
        "status": "cancelled"
    }

# ==================== PROMO CODE ROUTES ====================

async def verify_admin(username: str):
    """Check if user is admin"""
    if username.lower() not in ADMIN_USERNAMES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return True

# ============== ADMIN USER MANAGEMENT ==============

class AdminUserUpgrade(BaseModel):
    """Request model for admin user upgrade"""
    target_username: str = Field(..., description="Username to upgrade")
    new_tier: str = Field(..., description="New tier: free, player, gm, legendary")
    duration_days: int = Field(default=-1, description="-1 for lifetime, otherwise number of days")
    reason: str = Field(default="", description="Reason for upgrade (optional)")

@api_router.post("/admin/upgrade-user")
async def admin_upgrade_user(request: AdminUserUpgrade, username: str = Depends(get_current_user)):
    """Admin endpoint to manually upgrade a user's subscription tier"""
    await verify_admin(username)
    
    # Validate tier
    valid_tiers = ['free', 'player', 'gm', 'legendary', 'adventurer']
    if request.new_tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {', '.join(valid_tiers)}")
    
    # Find target user
    target_user = await db.users.find_one({'username': request.target_username})
    if not target_user:
        # Try by email
        target_user = await db.users.find_one({'email': request.target_username})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate expiration
    if request.duration_days == -1:
        premium_expires_at = None
        is_lifetime = True
    else:
        premium_expires_at = (datetime.now(timezone.utc) + timedelta(days=request.duration_days)).isoformat()
        is_lifetime = False
    
    # Update user subscription
    update_data = {
        'subscription.tier': request.new_tier,
        'subscription.subscription_status': 'active',
        'subscription.admin_upgraded': True,
        'subscription.admin_upgraded_by': username,
        'subscription.admin_upgraded_at': datetime.now(timezone.utc).isoformat(),
        'subscription.admin_upgrade_reason': request.reason
    }
    
    if is_lifetime:
        update_data['subscription.lifetime_access'] = True
        update_data['subscription.premium_expires_at'] = None
    else:
        update_data['subscription.premium_expires_at'] = premium_expires_at
    
    await db.users.update_one(
        {'username': target_user['username']},
        {'$set': update_data}
    )
    
    plan = SUBSCRIPTION_PLANS.get(request.new_tier, SUBSCRIPTION_PLANS['free'])
    
    return {
        "message": f"User {target_user['username']} upgraded to {plan['name']}",
        "username": target_user['username'],
        "email": target_user.get('email'),
        "new_tier": request.new_tier,
        "tier_name": plan['name'],
        "expires_at": premium_expires_at,
        "is_lifetime": is_lifetime
    }

@api_router.get("/admin/users")
async def admin_get_users(username: str = Depends(get_current_user)):
    """Admin endpoint to list all users with their subscription status"""
    await verify_admin(username)
    
    users = []
    async for user in db.users.find({}, {'_id': 0, 'password_hash': 0}):
        users.append({
            'username': user.get('username'),
            'email': user.get('email'),
            'tier': user.get('subscription', {}).get('tier', 'free'),
            'tier_name': SUBSCRIPTION_PLANS.get(user.get('subscription', {}).get('tier', 'free'), {}).get('name', 'Free'),
            'subscription_status': user.get('subscription', {}).get('subscription_status', 'inactive'),
            'promo_codes_used': user.get('subscription', {}).get('promo_codes_used', []),
            'lifetime_access': user.get('subscription', {}).get('lifetime_access', False),
            'created_at': user.get('created_at')
        })
    
    return users

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
    """Apply a promo code to get free premium access - supports stacking multiple codes"""
    code = request.code.upper().strip()
    
    # Find promo code
    promo = await db.promo_codes.find_one({'code': code})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    # Check if code is active
    if not promo.get('is_active', True):
        raise HTTPException(status_code=400, detail="This promo code is no longer active")
    
    # Check if expired
    if promo.get('expires_at'):
        expires = datetime.fromisoformat(promo['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Promo code has expired")
    
    # Check uses remaining
    uses = promo.get('uses_remaining', -1)
    if uses == 0:
        raise HTTPException(status_code=400, detail="Promo code has no uses remaining")
    
    # Get user's current subscription
    user = await db.users.find_one({'username': username})
    current_sub = user.get('subscription', {}) if user else {}
    
    # Check if user already used THIS SPECIFIC code (prevent re-using same code)
    used_codes = current_sub.get('promo_codes_used', [])
    if code in used_codes:
        raise HTTPException(status_code=400, detail="You have already used this promo code")
    
    # Apply promo code with duration - STACKING LOGIC
    new_tier = promo.get('tier_granted', 'legendary')
    duration_days = promo.get('duration_days', -1)  # Default to lifetime if not specified
    
    # Tier priority: legendary > gm > player > adventurer > free
    tier_priority = {'free': 0, 'player': 1, 'adventurer': 2, 'gm': 3, 'legendary': 4}
    current_tier = current_sub.get('tier', 'free')
    
    # Use higher tier
    if tier_priority.get(new_tier, 0) >= tier_priority.get(current_tier, 0):
        final_tier = new_tier
    else:
        final_tier = current_tier
    
    # Calculate expiration with stacking
    current_expires = current_sub.get('premium_expires_at')
    
    if duration_days == -1:
        # Lifetime code - no expiration
        premium_expires_at = None
        is_lifetime = True
    else:
        is_lifetime = current_sub.get('lifetime_access', False)
        if is_lifetime:
            # Already have lifetime, keep it
            premium_expires_at = None
        elif current_expires:
            # Stack: add new days to existing expiration
            try:
                existing_expires = datetime.fromisoformat(current_expires.replace('Z', '+00:00'))
                # If existing is in the future, add to it; otherwise start from now
                if existing_expires > datetime.now(timezone.utc):
                    premium_expires_at = (existing_expires + timedelta(days=duration_days)).isoformat()
                else:
                    premium_expires_at = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()
            except:
                premium_expires_at = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()
        else:
            # No existing expiration, start fresh
            premium_expires_at = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()
    
    # Track all used promo codes
    used_codes.append(code)
    
    update_data = {
        'subscription.tier': final_tier,
        'subscription.subscription_status': 'active',
        'subscription.promo_codes_used': used_codes,
        'subscription.last_promo_applied': code,
        'subscription.last_promo_applied_at': datetime.now(timezone.utc).isoformat()
    }
    
    if premium_expires_at:
        update_data['subscription.premium_expires_at'] = premium_expires_at
        update_data['subscription.promo_expires_at'] = premium_expires_at
    elif is_lifetime or duration_days == -1:
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
    if duration_days == -1:
        duration_text = "lifetime"
    elif duration_days == 7:
        duration_text = "1 week"
    elif duration_days == 14:
        duration_text = "2 weeks"
    elif duration_days == 30:
        duration_text = "1 month"
    elif duration_days == 60:
        duration_text = "2 months"
    elif duration_days == 90:
        duration_text = "3 months"
    elif duration_days == 180:
        duration_text = "6 months"
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

# ============== REVIEWS ==============

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, username: str = Depends(get_current_user)):
    """Submit a review (authenticated users only)"""
    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already submitted a review
    existing = await db.reviews.find_one({'username': username})
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a review. You can edit your existing review.")
    
    # Auto-approve 4-5 star reviews
    is_approved = review_data.rating >= 4
    is_featured = review_data.rating >= 4  # Auto-feature high ratings
    
    review = Review(
        username=username,
        rating=review_data.rating,
        comment=review_data.comment,
        is_approved=is_approved,
        is_featured=is_featured
    )
    
    await db.reviews.insert_one(review.model_dump())
    return {"message": "Thank you for your review!", "is_featured": is_featured}

@api_router.put("/reviews")
async def update_review(review_data: ReviewCreate, username: str = Depends(get_current_user)):
    """Update user's own review"""
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    existing = await db.reviews.find_one({'username': username})
    if not existing:
        raise HTTPException(status_code=404, detail="You haven't submitted a review yet")
    
    # Re-evaluate approval based on new rating
    is_approved = review_data.rating >= 4
    is_featured = review_data.rating >= 4
    
    await db.reviews.update_one(
        {'username': username},
        {'$set': {
            'rating': review_data.rating,
            'comment': review_data.comment,
            'is_approved': is_approved,
            'is_featured': is_featured
        }}
    )
    return {"message": "Review updated!", "is_featured": is_featured}

@api_router.get("/reviews/mine")
async def get_my_review(username: str = Depends(get_current_user)):
    """Get the current user's review if they have one"""
    review = await db.reviews.find_one({'username': username}, {'_id': 0})
    return review

@api_router.get("/reviews/featured")
async def get_featured_reviews():
    """Get featured reviews for landing page (public endpoint)"""
    reviews = await db.reviews.find(
        {'is_featured': True, 'is_approved': True},
        {'_id': 0, 'username': 1, 'rating': 1, 'comment': 1, 'created_at': 1}
    ).sort('created_at', -1).limit(6).to_list(6)
    return reviews

@api_router.get("/reviews/all")
async def get_all_reviews(username: str = Depends(get_current_user)):
    """Get all reviews (admin only)"""
    await verify_admin(username)
    reviews = await db.reviews.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return reviews

@api_router.put("/reviews/{review_id}/approve")
async def toggle_review_approval(review_id: str, username: str = Depends(get_current_user)):
    """Toggle review approval status (admin only)"""
    await verify_admin(username)
    
    review = await db.reviews.find_one({'id': review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    new_status = not review.get('is_approved', False)
    await db.reviews.update_one(
        {'id': review_id},
        {'$set': {'is_approved': new_status, 'is_featured': new_status}}
    )
    return {"message": f"Review {'approved' if new_status else 'hidden'}", "is_approved": new_status}

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, username: str = Depends(get_current_user)):
    """Delete a review (admin only)"""
    await verify_admin(username)
    
    result = await db.reviews.delete_one({'id': review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# ============== CUSTOM CREATURES ==============

@api_router.get("/campaigns/{campaign_id}/custom-creatures")
async def get_custom_creatures(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all custom creatures for a campaign"""
    creatures = await db.custom_creatures.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('name', 1).to_list(500)
    return creatures

@api_router.post("/campaigns/{campaign_id}/custom-creatures")
async def create_custom_creature(campaign_id: str, creature_data: CustomCreatureCreate, username: str = Depends(get_current_user)):
    """Create a new custom creature"""
    creature = CustomCreature(
        campaign_id=campaign_id,
        name=creature_data.name,
        cr=creature_data.cr,
        hp=creature_data.hp,
        ac=creature_data.ac,
        type=creature_data.type,
        size=creature_data.size,
        speed=creature_data.speed,
        abilities=creature_data.abilities,
        description=creature_data.description,
        created_by=username
    )
    await db.custom_creatures.insert_one(creature.model_dump())
    return {"message": "Custom creature created!", "creature": creature.model_dump()}

@api_router.put("/campaigns/{campaign_id}/custom-creatures/{creature_id}")
async def update_custom_creature(campaign_id: str, creature_id: str, creature_data: CustomCreatureCreate, username: str = Depends(get_current_user)):
    """Update a custom creature"""
    result = await db.custom_creatures.update_one(
        {'id': creature_id, 'campaign_id': campaign_id},
        {'$set': {
            'name': creature_data.name,
            'cr': creature_data.cr,
            'hp': creature_data.hp,
            'ac': creature_data.ac,
            'type': creature_data.type,
            'size': creature_data.size,
            'speed': creature_data.speed,
            'abilities': creature_data.abilities,
            'description': creature_data.description
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creature not found")
    return {"message": "Creature updated!"}

@api_router.delete("/campaigns/{campaign_id}/custom-creatures/{creature_id}")
async def delete_custom_creature(campaign_id: str, creature_id: str, username: str = Depends(get_current_user)):
    """Delete a custom creature"""
    result = await db.custom_creatures.delete_one({'id': creature_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creature not found")
    return {"message": "Creature deleted!"}

@api_router.post("/campaigns/{campaign_id}/custom-creatures/import")
async def import_custom_creatures(campaign_id: str, creatures: list[CustomCreatureCreate], username: str = Depends(get_current_user)):
    """Import multiple custom creatures from CSV/JSON data"""
    imported = []
    for creature_data in creatures:
        creature = CustomCreature(
            campaign_id=campaign_id,
            name=creature_data.name,
            cr=creature_data.cr,
            hp=creature_data.hp,
            ac=creature_data.ac,
            type=creature_data.type,
            size=creature_data.size,
            speed=creature_data.speed,
            abilities=creature_data.abilities,
            description=creature_data.description,
            created_by=username
        )
        await db.custom_creatures.insert_one(creature.model_dump())
        imported.append(creature.name)
    return {"message": f"Imported {len(imported)} creatures!", "imported": imported}

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans with new three-tier structure"""
    return {
        'plans': [
            {
                'id': 'free',
                'name': 'Free',
                'price_monthly': 0,
                'price_yearly': 0,
                'target': 'casual',
                'color': '#808080',
                'features': [
                    '1 character',
                    'Join campaigns (can\'t create)',
                    'Basic character sheet',
                    'Dice roller',
                    '3 AI generations per month'
                ]
            },
            {
                'id': 'player',
                'name': 'Hero',
                'price_monthly': 3.99,
                'price_yearly': 39.99,
                'target': 'player',
                'color': '#3B82F6',
                'features': [
                    'Unlimited characters',
                    'Character journal',
                    'Party inventory',
                    'Session recaps',
                    'AI portrait generation',
                    '50 AI calls per month'
                ]
            },
            {
                'id': 'gm',
                'name': 'Quest Master',
                'price_monthly': 3.99,
                'price_yearly': 39.99,
                'target': 'gm',
                'color': '#E11D48',
                'features': [
                    'Unlimited campaigns',
                    'Full world building tools',
                    'ROOK AI generation',
                    'Combat tracker',
                    'Reference tools',
                    'Session mode',
                    'Unlimited AI calls'
                ]
            },
            {
                'id': 'legendary',
                'name': 'Legendary',
                'price_monthly': 5.99,
                'price_yearly': 59.99,
                'target': 'both',
                'color': '#F59E0B',
                'popular': True,
                'features': [
                    'Everything in Hero',
                    'Everything in Quest Master',
                    'Priority support',
                    'Early access to features',
                    'Unlimited everything'
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

class CustomReferralCodeRequest(BaseModel):
    new_code: str

@api_router.put("/referral/code")
async def customize_referral_code(
    request: CustomReferralCodeRequest,
    username: str = Depends(get_current_user)
):
    """Customize user's referral code"""
    import re
    
    new_code = request.new_code.strip().upper()
    
    # Validation
    if len(new_code) < 3:
        raise HTTPException(status_code=400, detail="Code must be at least 3 characters")
    if len(new_code) > 20:
        raise HTTPException(status_code=400, detail="Code must be 20 characters or less")
    if not re.match(r'^[A-Z0-9_-]+$', new_code):
        raise HTTPException(status_code=400, detail="Code can only contain letters, numbers, underscores, and hyphens")
    
    # Check if code already taken by another user
    existing = await db.users.find_one({
        'subscription.referral_code': new_code,
        'username': {'$ne': username}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This code is already taken")
    
    # Update user's referral code
    await db.users.update_one(
        {'username': username},
        {'$set': {'subscription.referral_code': new_code}}
    )
    
    return {
        'success': True,
        'referral_code': new_code,
        'message': f'Referral code updated to {new_code}'
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
    return {"is_admin": username.lower() in ADMIN_USERNAMES}

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
    # Check subscription tier limits
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free') if subscription else 'free'
    tier_limits = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Count existing campaigns owned by user
    campaign_count = await db.campaigns.count_documents({'dm_user_id': username})
    
    # Check campaign limit (-1 means unlimited)
    campaign_limit = tier_limits.get('campaigns', 0)
    if campaign_limit != -1 and campaign_count >= campaign_limit:
        tier_name = tier_limits.get('name', 'Free')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "campaign_limit_reached",
                "message": f"Your {tier_name} plan allows {campaign_limit} campaign(s). Upgrade to Quest Master or Legendary for unlimited campaigns!",
                "current_count": campaign_count,
                "limit": campaign_limit,
                "upgrade_tier": "gm"
            }
        )
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    # Build update data, excluding None values
    update_data = {k: v for k, v in setting_data.model_dump().items() if v is not None}
    
    result = await db.campaign_settings.update_one(
        {'campaign_id': campaign_id},
        {
            '$set': update_data,
            '$setOnInsert': {
                'campaign_id': campaign_id,
                'id': str(uuid.uuid4()),
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        },
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

@api_router.put("/campaigns/{campaign_id}/world-setting")
async def update_campaign_world_setting(campaign_id: str, data: CampaignWorldSettingUpdate, username: str = Depends(get_current_user)):
    """Update campaign's world setting for AI context"""
    await verify_campaign_ownership(campaign_id, username)
    
    valid_settings = ['high_fantasy', 'magipunk_noir', 'classic_fantasy', 'epic_fantasy', 'gothic_horror', 'fantasy_space', 'planar_adventure', 'custom']
    if data.world_setting not in valid_settings:
        raise HTTPException(status_code=400, detail=f"Invalid world setting. Must be one of: {', '.join(valid_settings)}")
    
    await db.campaigns.update_one(
        {'id': campaign_id},
        {'$set': {
            'world_setting': data.world_setting,
            'world_setting_notes': data.world_setting_notes
        }}
    )
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    
    # Human-readable names for settings
    setting_names = {
        'high_fantasy': 'High Fantasy',
        'magipunk_noir': 'Magipunk/Noir',
        'classic_fantasy': 'Classic Sword & Sorcery',
        'epic_fantasy': 'Epic Fantasy',
        'gothic_horror': 'Gothic Horror',
        'fantasy_space': 'Fantasy Space',
        'planar_adventure': 'Planar Adventures',
        'custom': 'Custom Setting'
    }
    
    return {
        "message": f"World setting updated to {setting_names.get(data.world_setting, data.world_setting)}",
        "world_setting": data.world_setting,
        "world_setting_name": setting_names.get(data.world_setting, data.world_setting),
        "world_setting_notes": data.world_setting_notes
    }

# ==================== CUSTOM RULES UPLOAD ====================

@api_router.post("/campaigns/{campaign_id}/custom-rules")
async def upload_custom_rules(campaign_id: str, data: CustomRulesUpload, username: str = Depends(get_current_user)):
    """Upload custom rules/rulebook content for AI to reference - any campaign member can upload"""
    await verify_campaign_membership(campaign_id, username)
    
    # Check content size (limit to ~500KB of text to avoid huge AI context)
    max_chars = 500000
    if len(data.content) > max_chars:
        raise HTTPException(
            status_code=400, 
            detail=f"Rules content too large. Maximum {max_chars} characters (~500KB). Consider uploading key sections only."
        )
    
    rule_doc = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': data.name,
        'content': data.content,
        'source_type': data.source_type,
        'char_count': len(data.content),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': username
    }
    
    await db.campaign_custom_rules.insert_one(rule_doc)
    
    return {
        "message": f"Rules '{data.name}' uploaded successfully",
        "id": rule_doc['id'],
        "name": data.name,
        "char_count": len(data.content),
        "source_type": data.source_type,
        "uploaded_by": username
    }

@api_router.get("/campaigns/{campaign_id}/custom-rules")
async def get_custom_rules(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all custom rules for a campaign - any campaign member can view"""
    await verify_campaign_membership(campaign_id, username)
    
    rules = []
    async for rule in db.campaign_custom_rules.find({'campaign_id': campaign_id}, {'_id': 0, 'content': 0}):
        rules.append(rule)
    
    return {
        "rules": rules,
        "total_count": len(rules)
    }

@api_router.get("/campaigns/{campaign_id}/custom-rules/{rule_id}")
async def get_custom_rule_detail(campaign_id: str, rule_id: str, username: str = Depends(get_current_user)):
    """Get a specific custom rule with full content - any campaign member can view"""
    await verify_campaign_membership(campaign_id, username)
    
    rule = await db.campaign_custom_rules.find_one({'id': rule_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rules not found")
    
    return rule

@api_router.delete("/campaigns/{campaign_id}/custom-rules/{rule_id}")
async def delete_custom_rules(campaign_id: str, rule_id: str, username: str = Depends(get_current_user)):
    """Delete custom rules - only the uploader or GM can delete"""
    campaign = await verify_campaign_membership(campaign_id, username)
    
    # Check if user is the uploader or the GM
    rule = await db.campaign_custom_rules.find_one({'id': rule_id, 'campaign_id': campaign_id}, {'_id': 0, 'created_by': 1})
    if not rule:
        raise HTTPException(status_code=404, detail="Rules not found")
    
    # Allow deletion if user is GM or the one who uploaded
    is_gm = campaign.get('dm_user_id') == username
    is_uploader = rule.get('created_by') == username
    
    if not is_gm and not is_uploader:
        raise HTTPException(status_code=403, detail="Only the uploader or GM can delete these rules")
    
    await db.campaign_custom_rules.delete_one({'id': rule_id, 'campaign_id': campaign_id})
    
    return {"message": "Rules deleted successfully"}

@api_router.post("/campaigns/{campaign_id}/custom-rules/upload-file")
async def upload_rules_file(campaign_id: str, file: UploadFile, username: str = Depends(get_current_user)):
    """Upload a rules file (TXT, MD, or PDF) - any campaign member can upload"""
    await verify_campaign_membership(campaign_id, username)
    
    # Check file type
    allowed_extensions = ['.txt', '.md', '.pdf']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")
    
    # Extract text based on file type
    if file_ext == '.pdf':
        try:
            import io
            # Try to extract text from PDF
            try:
                import fitz  # PyMuPDF
                pdf_doc = fitz.open(stream=content, filetype="pdf")
                text_content = ""
                for page in pdf_doc:
                    text_content += page.get_text()
                pdf_doc.close()
            except ImportError:
                # Fallback: store as base64 with note
                raise HTTPException(
                    status_code=400, 
                    detail="PDF extraction not available. Please copy/paste the text content manually, or upload a .txt file."
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {str(e)}")
    else:
        # TXT or MD file
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            text_content = content.decode('latin-1')
    
    # Check extracted content size
    max_chars = 500000
    if len(text_content) > max_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Extracted content too large ({len(text_content)} chars). Maximum {max_chars} characters. Consider uploading key sections only."
        )
    
    # Save to database
    rule_doc = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': file.filename,
        'content': text_content,
        'source_type': 'file_upload',
        'original_filename': file.filename,
        'char_count': len(text_content),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': username
    }
    
    await db.campaign_custom_rules.insert_one(rule_doc)
    
    return {
        "message": f"Rules from '{file.filename}' uploaded successfully",
        "id": rule_doc['id'],
        "name": file.filename,
        "char_count": len(text_content),
        "source_type": "file_upload"
    }

@api_router.get("/campaigns/{campaign_id}/world-setting")
async def get_campaign_world_setting(campaign_id: str, username: str = Depends(get_current_user)):
    """Get campaign's world setting"""
    await verify_campaign_ownership(campaign_id, username)
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'world_setting': 1, 'world_setting_notes': 1, 'name': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    setting_names = {
        'high_fantasy': 'High Fantasy',
        'magipunk_noir': 'Magipunk/Noir',
        'classic_fantasy': 'Classic Sword & Sorcery',
        'epic_fantasy': 'Epic Fantasy',
        'gothic_horror': 'Gothic Horror',
        'fantasy_space': 'Fantasy Space',
        'planar_adventure': 'Planar Adventures',
        'custom': 'Custom Setting'
    }
    
    world_setting = campaign.get('world_setting', 'custom')
    
    return {
        "world_setting": world_setting,
        "world_setting_name": setting_names.get(world_setting, 'Custom Setting'),
        "world_setting_notes": campaign.get('world_setting_notes', ''),
        "available_settings": [
            {"id": "high_fantasy", "name": "High Fantasy", "description": "Classic D&D style - kingdoms, dragons, epic quests"},
            {"id": "magipunk_noir", "name": "Magipunk/Noir", "description": "Magic meets industry - airships, intrigue, corporations"},
            {"id": "classic_fantasy", "name": "Classic Sword & Sorcery", "description": "Gritty old-school - ruins, treasure, morally grey"},
            {"id": "epic_fantasy", "name": "Epic Fantasy", "description": "Grand narratives - prophecies, dragon riders, dark lords"},
            {"id": "gothic_horror", "name": "Gothic Horror", "description": "Dark and dread - cursed lands, tragic villains, monsters"},
            {"id": "fantasy_space", "name": "Fantasy Space", "description": "Magical ships between worlds - crystal spheres, alien creatures"},
            {"id": "planar_adventure", "name": "Planar Adventures", "description": "Multiple planes - extraplanar cities, portals, philosophy"},
            {"id": "custom", "name": "Custom Setting", "description": "Your own homebrew world"}
        ]
    }

# ==================== CAMPAIGN CONTENT (Structured Rules) ====================
# GM uploads structured content (races, classes, etc.) that players can use in character creation

@api_router.post("/campaigns/{campaign_id}/content/bulk-upload")
async def bulk_upload_campaign_content(campaign_id: str, data: BulkContentUpload, username: str = Depends(get_current_user)):
    """Upload a complete ruleset with races, classes, subclasses, backgrounds, and feats"""
    await verify_campaign_membership(campaign_id, username)
    
    # Check for potential duplicates and warn the user
    warnings = []
    
    # Check existing race names
    existing_races = await db.campaign_races.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_race_names = {r['name'].lower() for r in existing_races}
    for race_data in data.races:
        if race_data.name.lower() in existing_race_names:
            warnings.append(f"Race '{race_data.name}' already exists - will create duplicate")
    
    # Check existing class names
    existing_classes = await db.campaign_classes.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_class_names = {c['name'].lower() for c in existing_classes}
    
    # Check existing subclasses
    existing_subclasses = await db.campaign_subclasses.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_subclass_names = {s['name'].lower() for s in existing_subclasses}
    
    # Check existing backgrounds  
    existing_backgrounds = await db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_background_names = {b['name'].lower() for b in existing_backgrounds}
    
    # Check existing feats
    existing_feats = await db.campaign_feats.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_feat_names = {f['name'].lower() for f in existing_feats}
    
    # Track skipped items
    skipped = {"races": [], "classes": [], "subclasses": [], "backgrounds": [], "feats": []}
    
    # Create the ruleset
    ruleset = CampaignRuleset(
        campaign_id=campaign_id,
        name=data.ruleset_name,
        description=data.ruleset_description,
        created_by=username
    )
    await db.campaign_rulesets.insert_one(ruleset.model_dump())
    ruleset_id = ruleset.id
    
    counts = {"races": 0, "classes": 0, "subclasses": 0, "backgrounds": 0, "feats": 0}
    
    # Add races (skip duplicates)
    for race_data in data.races:
        if race_data.name.lower() in existing_race_names:
            skipped["races"].append(race_data.name)
            continue
        race_dict = race_data.model_dump()
        race_dict.pop('ruleset_id', None)
        race = CampaignRace(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **race_dict
        )
        await db.campaign_races.insert_one(race.model_dump())
        counts["races"] += 1
    
    # Add classes (skip duplicates)
    for class_data in data.classes:
        if class_data.name.lower() in existing_class_names:
            skipped["classes"].append(class_data.name)
            continue
        class_dict = class_data.model_dump()
        class_dict.pop('ruleset_id', None)
        cls = CampaignClass(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **class_dict
        )
        await db.campaign_classes.insert_one(cls.model_dump())
        counts["classes"] += 1
    
    # Add subclasses (skip duplicates)
    for subclass_data in data.subclasses:
        if subclass_data.name.lower() in existing_subclass_names:
            skipped["subclasses"].append(subclass_data.name)
            continue
        subclass_dict = subclass_data.model_dump()
        subclass_dict.pop('ruleset_id', None)
        subclass = CampaignSubclass(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **subclass_dict
        )
        await db.campaign_subclasses.insert_one(subclass.model_dump())
        counts["subclasses"] += 1
    
    # Add backgrounds (skip duplicates)
    for bg_data in data.backgrounds:
        if bg_data.name.lower() in existing_background_names:
            skipped["backgrounds"].append(bg_data.name)
            continue
        bg_dict = bg_data.model_dump()
        bg_dict.pop('ruleset_id', None)
        background = CampaignBackground(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **bg_dict
        )
        await db.campaign_backgrounds.insert_one(background.model_dump())
        counts["backgrounds"] += 1
    
    # Add feats (skip duplicates)
    for feat_data in data.feats:
        if feat_data.name.lower() in existing_feat_names:
            skipped["feats"].append(feat_data.name)
            continue
        feat_dict = feat_data.model_dump()
        feat_dict.pop('ruleset_id', None)
        feat = CampaignFeat(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **feat_dict
        )
        await db.campaign_feats.insert_one(feat.model_dump())
        counts["feats"] += 1
    
    # Build skipped message
    skipped_items = []
    category_singular = {"races": "race", "classes": "class", "subclasses": "subclass", "backgrounds": "background", "feats": "feat"}
    for category, items in skipped.items():
        if items:
            skipped_items.extend([f"{name} ({category_singular[category]})" for name in items])
    
    # Calculate total uploaded vs skipped
    total_uploaded = sum(counts.values())
    total_skipped = len(skipped_items)
    
    return {
        "message": f"Ruleset '{data.ruleset_name}' uploaded! {total_uploaded} items added" + (f", {total_skipped} duplicates skipped" if total_skipped > 0 else ""),
        "ruleset_id": ruleset_id,
        "counts": counts,
        "skipped": skipped if total_skipped > 0 else None,
        "skipped_summary": skipped_items if total_skipped > 0 else None
    }

@api_router.get("/campaigns/{campaign_id}/content")
async def get_campaign_content(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all available character creation content for a campaign (for players and GMs)"""
    await verify_campaign_membership(campaign_id, username)
    
    # Get all rulesets
    rulesets = []
    async for rs in db.campaign_rulesets.find({'campaign_id': campaign_id, 'is_active': True}, {'_id': 0}):
        rulesets.append(rs)
    
    # Get all races
    races = []
    async for race in db.campaign_races.find({'campaign_id': campaign_id}, {'_id': 0}):
        races.append(race)
    
    # Get all classes
    classes = []
    async for cls in db.campaign_classes.find({'campaign_id': campaign_id}, {'_id': 0}):
        classes.append(cls)
    
    # Get all subclasses
    subclasses = []
    async for sub in db.campaign_subclasses.find({'campaign_id': campaign_id}, {'_id': 0}):
        subclasses.append(sub)
    
    # Get all backgrounds
    backgrounds = []
    async for bg in db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'_id': 0}):
        backgrounds.append(bg)
    
    # Get all feats
    feats = []
    async for feat in db.campaign_feats.find({'campaign_id': campaign_id}, {'_id': 0}):
        feats.append(feat)
    
    return {
        "rulesets": rulesets,
        "races": races,
        "classes": classes,
        "subclasses": subclasses,
        "backgrounds": backgrounds,
        "feats": feats,
        "has_custom_content": len(races) > 0 or len(classes) > 0
    }

@api_router.get("/campaigns/{campaign_id}/content/races")
async def get_campaign_races(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all races available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    races = []
    async for race in db.campaign_races.find({'campaign_id': campaign_id}, {'_id': 0}):
        races.append(race)
    
    return {"races": races, "count": len(races)}

@api_router.get("/campaigns/{campaign_id}/content/classes")
async def get_campaign_classes(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all classes available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    classes = []
    async for cls in db.campaign_classes.find({'campaign_id': campaign_id}, {'_id': 0}):
        classes.append(cls)
    
    return {"classes": classes, "count": len(classes)}

@api_router.get("/campaigns/{campaign_id}/content/subclasses")
async def get_campaign_subclasses(campaign_id: str, parent_class: Optional[str] = None, username: str = Depends(get_current_user)):
    """Get all subclasses available in a campaign, optionally filtered by parent class"""
    await verify_campaign_membership(campaign_id, username)
    
    query = {'campaign_id': campaign_id}
    if parent_class:
        query['parent_class'] = parent_class
    
    subclasses = []
    async for sub in db.campaign_subclasses.find(query, {'_id': 0}):
        subclasses.append(sub)
    
    return {"subclasses": subclasses, "count": len(subclasses)}

@api_router.get("/campaigns/{campaign_id}/content/backgrounds")
async def get_campaign_backgrounds(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all backgrounds available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    backgrounds = []
    async for bg in db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'_id': 0}):
        backgrounds.append(bg)
    
    return {"backgrounds": backgrounds, "count": len(backgrounds)}

@api_router.get("/campaigns/{campaign_id}/content/feats")
async def get_campaign_feats(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all feats available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    feats = []
    async for feat in db.campaign_feats.find({'campaign_id': campaign_id}, {'_id': 0}):
        feats.append(feat)
    
    return {"feats": feats, "count": len(feats)}

# Individual content addition endpoints (for adding one at a time)
@api_router.post("/campaigns/{campaign_id}/content/races")
async def add_campaign_race(campaign_id: str, data: CampaignRaceCreate, username: str = Depends(get_current_user)):
    """Add a custom race to a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    race = CampaignRace(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_races.insert_one(race.model_dump())
    
    return {"message": f"Race '{data.name}' added", "id": race.id}

@api_router.post("/campaigns/{campaign_id}/content/classes")
async def add_campaign_class(campaign_id: str, data: CampaignClassCreate, username: str = Depends(get_current_user)):
    """Add a custom class to a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    cls = CampaignClass(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_classes.insert_one(cls.model_dump())
    
    return {"message": f"Class '{data.name}' added", "id": cls.id}

@api_router.post("/campaigns/{campaign_id}/content/subclasses")
async def add_campaign_subclass(campaign_id: str, data: CampaignSubclassCreate, username: str = Depends(get_current_user)):
    """Add a custom subclass to a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    subclass = CampaignSubclass(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_subclasses.insert_one(subclass.model_dump())
    
    return {"message": f"Subclass '{data.name}' added for {data.parent_class}", "id": subclass.id}

@api_router.post("/campaigns/{campaign_id}/content/backgrounds")
async def add_campaign_background(campaign_id: str, data: CampaignBackgroundCreate, username: str = Depends(get_current_user)):
    """Add a custom background to a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    background = CampaignBackground(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_backgrounds.insert_one(background.model_dump())
    
    return {"message": f"Background '{data.name}' added", "id": background.id}

@api_router.post("/campaigns/{campaign_id}/content/feats")
async def add_campaign_feat(campaign_id: str, data: CampaignFeatCreate, username: str = Depends(get_current_user)):
    """Add a custom feat to a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    feat = CampaignFeat(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_feats.insert_one(feat.model_dump())
    
    return {"message": f"Feat '{data.name}' added", "id": feat.id}

# Delete content (GM or creator only)
@api_router.delete("/campaigns/{campaign_id}/content/{content_type}/{content_id}")
async def delete_campaign_content(campaign_id: str, content_type: str, content_id: str, username: str = Depends(get_current_user)):
    """Delete campaign content (races, classes, subclasses, backgrounds, feats, or rulesets)"""
    campaign = await verify_campaign_membership(campaign_id, username)
    
    collection_map = {
        'races': db.campaign_races,
        'classes': db.campaign_classes,
        'subclasses': db.campaign_subclasses,
        'backgrounds': db.campaign_backgrounds,
        'feats': db.campaign_feats,
        'rulesets': db.campaign_rulesets
    }
    
    if content_type not in collection_map:
        raise HTTPException(status_code=400, detail=f"Invalid content type. Must be one of: {', '.join(collection_map.keys())}")
    
    collection = collection_map[content_type]
    
    # Check if user is GM or creator
    content = await collection.find_one({'id': content_id, 'campaign_id': campaign_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    is_gm = campaign.get('dm_user_id') == username
    is_creator = content.get('created_by') == username
    
    if not is_gm and not is_creator:
        raise HTTPException(status_code=403, detail="Only the GM or creator can delete this content")
    
    # If deleting a ruleset, also delete all associated content
    if content_type == 'rulesets':
        ruleset_id = content_id
        await db.campaign_races.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_classes.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_subclasses.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_backgrounds.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_feats.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
    
    await collection.delete_one({'id': content_id, 'campaign_id': campaign_id})
    
    return {"message": f"{content_type[:-1].title()} deleted successfully"}

# ==================== GODS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/gods", response_model=God, status_code=status.HTTP_201_CREATED)
async def create_god(campaign_id: str, god_data: GodCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    god_dict = god_data.model_dump()
    god_obj = God(campaign_id=campaign_id, **god_dict)
    doc = god_obj.model_dump()
    await db.gods.insert_one(doc)
    return god_obj

@api_router.get("/campaigns/{campaign_id}/gods", response_model=List[God])
async def get_gods(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return gods

@api_router.put("/campaigns/{campaign_id}/gods/{god_id}", response_model=God)
async def update_god(campaign_id: str, god_id: str, god_data: GodUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.gods.delete_one({'id': god_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="God not found")
    return {'message': 'God deleted successfully'}

# ==================== CALENDAR ROUTES ====================

@api_router.get("/campaigns/{campaign_id}/calendar", response_model=Optional[Calendar])
async def get_calendar(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    event_dict = event_data.model_dump()
    event_obj = CalendarEvent(campaign_id=campaign_id, **event_dict)
    doc = event_obj.model_dump()
    await db.calendar_events.insert_one(doc)
    return event_obj

@api_router.get("/campaigns/{campaign_id}/calendar-events", response_model=List[CalendarEvent])
async def get_calendar_events(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    events = await db.calendar_events.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return events

@api_router.put("/campaigns/{campaign_id}/calendar-events/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(campaign_id: str, event_id: str, event_data: CalendarEventUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.calendar_events.delete_one({'id': event_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return {'message': 'Event deleted successfully'}

# ==================== COMBAT SCENARIO ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/combat-scenarios", response_model=CombatScenario)
async def create_combat_scenario(campaign_id: str, scenario_data: CombatScenarioCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenario_dict = scenario_data.model_dump()
    scenario_obj = CombatScenario(campaign_id=campaign_id, **scenario_dict)
    doc = scenario_obj.model_dump()
    await db.combat_scenarios.insert_one(doc)
    return scenario_obj

@api_router.get("/campaigns/{campaign_id}/combat-scenarios", response_model=List[CombatScenario])
async def get_combat_scenarios(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenarios = await db.combat_scenarios.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return scenarios

@api_router.get("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def get_combat_scenario(campaign_id: str, scenario_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenario = await db.combat_scenarios.find_one({'id': scenario_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return scenario

@api_router.put("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def update_combat_scenario(campaign_id: str, scenario_id: str, scenario_data: CombatScenarioUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.combat_scenarios.delete_one({'id': scenario_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return {'message': 'Combat scenario deleted successfully'}

# ==================== LOCATIONS ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/locations", response_model=Location, status_code=status.HTTP_201_CREATED)
async def create_location(campaign_id: str, location_data: LocationCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    location_dict = location_data.model_dump()
    location_obj = Location(campaign_id=campaign_id, **location_dict)
    doc = location_obj.model_dump()
    await db.locations.insert_one(doc)
    return location_obj

@api_router.get("/campaigns/{campaign_id}/locations", response_model=List[Location])
async def get_locations(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return locations

@api_router.put("/campaigns/{campaign_id}/locations/{location_id}", response_model=Location)
async def update_location(campaign_id: str, location_id: str, location_data: LocationUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    note_dict = note_data.model_dump()
    if not note_dict.get('session_date'):
        note_dict['session_date'] = datetime.now(timezone.utc).isoformat()
    
    note_obj = InGameNote(campaign_id=campaign_id, **note_dict)
    doc = note_obj.model_dump()
    await db.ingame_notes.insert_one(doc)
    return note_obj

@api_router.get("/campaigns/{campaign_id}/ingame-notes", response_model=List[InGameNote])
async def get_ingame_notes(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return notes

@api_router.delete("/campaigns/{campaign_id}/ingame-notes/{note_id}")
async def delete_ingame_note(campaign_id: str, note_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.ingame_notes.delete_one({'id': note_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return {'message': 'Note deleted successfully'}

# ==================== SESSION RECAP & PLAYER NOTES ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/session-recaps")
async def generate_and_sync_session_recap(campaign_id: str, username: str = Depends(get_current_user)):
    """
    GM generates a session recap from notes and syncs it to all players in the campaign.
    This reads ingame-notes, generates AI recap, and saves to all linked players.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    # Get campaign details
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all ingame notes
    notes = await db.ingame_notes.find(
        {'campaign_id': campaign_id}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    if not notes:
        raise HTTPException(status_code=400, detail="No notes available to summarize")
    
    # Generate recap using AI
    notes_text = "\n\n".join([
        f"[{note.get('session_date', note.get('created_at', 'Unknown'))}] {note['content']}" 
        for note in notes
    ])
    
    prompt = f"""You are a fantasy storyteller. Based on these tabletop RPG session notes, create an engaging narrative recap that could be read aloud at the start of the next session. Write it in second person ("You") addressing the party.

Session Notes:
{notes_text}

Create a vivid, dramatic recap (2-4 paragraphs) that:
- Summarizes key events in narrative form
- Mentions important NPCs, locations, and discoveries
- Ends with a hook or question to build anticipation
- Uses evocative fantasy language

Write the recap now:"""

    try:
        # Check AI usage limit
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=402, 
                detail="AI usage limit reached. Upgrade to Adventurer for unlimited AI generations."
            )
        
        llm_chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"session-recap-{campaign_id}",
            system_message="You are a creative fantasy storyteller who writes engaging session recaps for tabletop RPG groups."
        )
        llm_chat.with_model('openai', 'gpt-4o-mini')
        
        user_message = UserMessage(text=prompt)
        response = await llm_chat.send_message(user_message)
        recap_content = response
        
        await increment_ai_usage(username)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI recap generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recap")
    
    # Find all players linked to this campaign via their characters
    player_characters = await db.player_characters.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'user_id': 1}
    ).to_list(100)
    
    # Get unique player user_ids
    player_user_ids = list(set([char['user_id'] for char in player_characters if char.get('user_id')]))
    
    # Create session recap for each player
    session_date = datetime.now(timezone.utc).isoformat()
    recaps_created = 0
    
    for player_user_id in player_user_ids:
        recap = SessionRecap(
            campaign_id=campaign_id,
            campaign_name=campaign.get('name', 'Unknown Campaign'),
            user_id=player_user_id,
            content=recap_content,
            session_date=session_date,
            created_by=username
        )
        await db.session_recaps.insert_one(recap.model_dump())
        recaps_created += 1
    
    return {
        "message": f"Recap generated and synced to {recaps_created} players!",
        "recap": recap_content,
        "players_synced": recaps_created
    }


@api_router.get("/player/session-recaps")
async def get_player_session_recaps(username: str = Depends(get_current_user)):
    """Get all session recaps shared with the current player"""
    recaps = await db.session_recaps.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return recaps


@api_router.get("/player/notes")
async def get_player_notes(username: str = Depends(get_current_user)):
    """Get all personal notes created by the player"""
    notes = await db.player_notes.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    return notes


@api_router.post("/player/notes", status_code=status.HTTP_201_CREATED)
async def create_player_note(note_data: PlayerNoteCreate, username: str = Depends(get_current_user)):
    """Create a personal player note"""
    campaign_name = None
    if note_data.campaign_id:
        campaign = await db.campaigns.find_one({'id': note_data.campaign_id}, {'_id': 0, 'name': 1})
        if campaign:
            campaign_name = campaign.get('name')
    
    note = PlayerNote(
        user_id=username,
        campaign_id=note_data.campaign_id,
        campaign_name=campaign_name,
        title=note_data.title,
        content=note_data.content
    )
    await db.player_notes.insert_one(note.model_dump())
    return note.model_dump()


@api_router.put("/player/notes/{note_id}")
async def update_player_note(note_id: str, note_data: PlayerNoteUpdate, username: str = Depends(get_current_user)):
    """Update a personal player note"""
    update_dict = {k: v for k, v in note_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.player_notes.update_one(
        {'id': note_id, 'user_id': username},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = await db.player_notes.find_one({'id': note_id}, {'_id': 0})
    return note


@api_router.delete("/player/notes/{note_id}")
async def delete_player_note(note_id: str, username: str = Depends(get_current_user)):
    """Delete a personal player note"""
    result = await db.player_notes.delete_one({'id': note_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {'message': 'Note deleted successfully'}


# ==================== CAMPAIGN TIMELINE ====================

@api_router.get("/campaigns/{campaign_id}/timeline")
async def get_campaign_timeline(campaign_id: str, username: str = Depends(get_current_user)):
    """Get timeline events for a campaign (accessible to GMs and linked players)"""
    # Check if user is GM or has character in campaign
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'owner_id': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    is_gm = campaign.get('owner_id') == username
    has_character = await db.player_characters.find_one({'campaign_id': campaign_id, 'user_id': username})
    
    if not is_gm and not has_character:
        raise HTTPException(status_code=403, detail="You must be the GM or have a character in this campaign")
    
    events = await db.timeline_events.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('timestamp', -1).to_list(200)
    
    return events


@api_router.post("/campaigns/{campaign_id}/timeline", status_code=status.HTTP_201_CREATED)
async def create_timeline_event(campaign_id: str, event_data: TimelineEventCreate, username: str = Depends(get_current_user)):
    """GM creates a timeline event"""
    await verify_campaign_ownership(campaign_id, username)
    
    event = TimelineEvent(
        campaign_id=campaign_id,
        event_type=event_data.event_type,
        title=event_data.title,
        description=event_data.description,
        session_number=event_data.session_number,
        related_npc_id=event_data.related_npc_id,
        related_location_id=event_data.related_location_id,
        related_character_ids=event_data.related_character_ids,
        created_by=username
    )
    
    await db.timeline_events.insert_one(event.model_dump())
    return event.model_dump()


@api_router.post("/campaigns/{campaign_id}/sync-note")
async def sync_gm_note_to_players(campaign_id: str, note_data: GMNoteSync, username: str = Depends(get_current_user)):
    """
    GM syncs a note to specific players or all players in campaign.
    Optionally creates a timeline event.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'name': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get target characters - either specified or all in campaign
    if note_data.target_character_ids:
        characters = await db.player_characters.find(
            {'id': {'$in': note_data.target_character_ids}, 'campaign_id': campaign_id},
            {'_id': 0, 'id': 1, 'user_id': 1, 'name': 1}
        ).to_list(100)
    else:
        characters = await db.player_characters.find(
            {'campaign_id': campaign_id},
            {'_id': 0, 'id': 1, 'user_id': 1, 'name': 1}
        ).to_list(100)
    
    if not characters:
        return {"message": "No characters found in campaign to sync", "synced_count": 0}
    
    # Create player notes for each unique user
    unique_users = {}
    for char in characters:
        user_id = char.get('user_id')
        if user_id and user_id not in unique_users:
            unique_users[user_id] = char.get('name', 'Unknown')
    
    notes_created = 0
    for user_id, char_name in unique_users.items():
        note = PlayerNote(
            user_id=user_id,
            campaign_id=campaign_id,
            campaign_name=campaign.get('name', 'Unknown'),
            title=note_data.title or f"GM Note - {note_data.note_type.replace('_', ' ').title()}",
            content=note_data.note_content
        )
        await db.player_notes.insert_one(note.model_dump())
        notes_created += 1
    
    # Create timeline event if requested
    timeline_event_id = None
    if note_data.create_timeline_event:
        event = TimelineEvent(
            campaign_id=campaign_id,
            event_type=note_data.note_type,
            title=note_data.title or "GM Update",
            description=note_data.note_content[:200] + "..." if len(note_data.note_content) > 200 else note_data.note_content,
            related_character_ids=[c['id'] for c in characters],
            created_by=username
        )
        await db.timeline_events.insert_one(event.model_dump())
        timeline_event_id = event.id
    
    return {
        "message": f"Note synced to {notes_created} players",
        "synced_count": notes_created,
        "timeline_event_id": timeline_event_id
    }


@api_router.get("/player/timeline")
async def get_player_timeline(username: str = Depends(get_current_user)):
    """Get all timeline events from campaigns the player is part of"""
    # Find all campaigns the player has characters in
    characters = await db.player_characters.find(
        {'user_id': username},
        {'_id': 0, 'campaign_id': 1}
    ).to_list(100)
    
    campaign_ids = list(set([c['campaign_id'] for c in characters if c.get('campaign_id')]))
    
    if not campaign_ids:
        return []
    
    events = await db.timeline_events.find(
        {'campaign_id': {'$in': campaign_ids}},
        {'_id': 0}
    ).sort('timestamp', -1).to_list(200)
    
    return events


# ==================== PLAYER ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/players", response_model=Player, status_code=status.HTTP_201_CREATED)
async def create_player(campaign_id: str, player_data: PlayerCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    player_dict = player_data.model_dump()
    if player_dict.get('stats') is None:
        player_dict['stats'] = PlayerStats().model_dump()
    player_obj = Player(campaign_id=campaign_id, **player_dict)
    doc = player_obj.model_dump()
    await db.players.insert_one(doc)
    return player_obj

@api_router.get("/campaigns/{campaign_id}/players", response_model=List[Player])
async def get_players(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    players = await db.players.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return players

@api_router.put("/campaigns/{campaign_id}/players/{player_id}", response_model=Player)
async def update_player(campaign_id: str, player_id: str, player_data: PlayerUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.players.delete_one({'id': player_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return {'message': 'Player deleted successfully'}

# ==================== NPC ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/npcs", status_code=status.HTTP_201_CREATED)
async def create_npc(campaign_id: str, npc_data: NPCCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    npc_dict = npc_data.model_dump()
    # Handle occupation field from old name generator
    occupation = npc_dict.pop('occupation', '')
    if occupation and not npc_dict.get('role'):
        npc_dict['role'] = occupation
    # Set max_hp to match hp if not set
    if npc_dict.get('hp') and not npc_dict.get('max_hp'):
        npc_dict['max_hp'] = npc_dict['hp']
    if npc_dict.get('stats') is None:
        npc_dict['stats'] = NPCStats().model_dump()
    npc_obj = NPC(campaign_id=campaign_id, **npc_dict)
    doc = npc_obj.model_dump()
    await db.npcs.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.get("/campaigns/{campaign_id}/npcs", response_model=List[NPC])
async def get_npcs(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return npcs

@api_router.put("/campaigns/{campaign_id}/npcs/{npc_id}")
async def update_npc(campaign_id: str, npc_id: str, npc_data: NPCUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in npc_data.model_dump().items() if v is not None}
    # Convert nested models to dicts
    if 'stats' in update_dict and hasattr(update_dict['stats'], 'model_dump'):
        update_dict['stats'] = update_dict['stats'].model_dump()
    if 'attacks' in update_dict:
        update_dict['attacks'] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_dict['attacks']]
    if 'abilities' in update_dict:
        update_dict['abilities'] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_dict['abilities']]
    if 'spells' in update_dict and update_dict['spells'] and hasattr(update_dict['spells'], 'model_dump'):
        update_dict['spells'] = update_dict['spells'].model_dump()
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.npcs.delete_one({'id': npc_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NPC not found")
    return {'message': 'NPC deleted successfully'}

class GenerateNPCRequest(BaseModel):
    prompt: str = ""
    race: str = ""
    class_name: str = ""
    level: int = 5
    role: str = ""

@api_router.post("/campaigns/{campaign_id}/npcs/generate")
async def generate_npc_with_stats(campaign_id: str, request: GenerateNPCRequest, username: str = Depends(get_current_user)):
    """AI-generate a full NPC with stat block, class-appropriate abilities, attacks, and spells."""
    await verify_campaign_ownership(campaign_id, username)
    
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI generation limit reached. Upgrade for unlimited access!")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
    
    campaign_context = await get_campaign_context(campaign_id)
    
    race_hint = f'Race: {request.race}. ' if request.race else ''
    class_hint = f'Class: {request.class_name}. ' if request.class_name else ''
    level_hint = f'Level: {request.level}. '
    role_hint = f'Role in campaign: {request.role}. ' if request.role else ''
    user_prompt = request.prompt if request.prompt else 'Generate a unique and interesting NPC.'
    
    system_message = """You are ROOK, a TTRPG NPC generator that creates fully statted NPCs using D&D 5e SRD rules.

RULES:
1. Respond ONLY with valid JSON - no markdown, no code fences, no explanation
2. Ability scores should be appropriate for the NPC's level and class
3. Calculate proficiency bonus from level: levels 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6
4. HP should be calculated roughly as: (hit die avg + CON mod) * level
5. AC should match their equipment/class (unarmored, leather, chain, plate, mage armor, etc.)
6. Skills should match their class and background
7. Attacks should include specific to-hit bonuses and damage dice
8. If the class is a spellcaster, include full spell list appropriate to their level with cantrips and leveled spells from the SRD
9. Abilities/features should be class-appropriate for their level (e.g., a level 5 Fighter gets Extra Attack)
10. Use ONLY content from the 5e SRD/OGL - no copyrighted material
11. saving_throws should list the ability names that the NPC is proficient in saving throws for"""

    npc_json_schema = """{
  "name": "Full Name",
  "race": "Race",
  "class_name": "Class (Fighter, Wizard, Cleric, Rogue, Ranger, Warlock, Bard, Barbarian, Druid, Monk, Paladin, Sorcerer)",
  "level": 5,
  "alignment": "e.g. Neutral Good",
  "appearance": "2 sentences describing physical appearance",
  "personality": "2 sentences describing personality traits, ideals, flaws",
  "backstory": "2-3 sentences of background",
  "role": "Role in campaign (Ally, Enemy, Merchant, Quest Giver, etc.)",
  "hp": 38,
  "max_hp": 38,
  "ac": 16,
  "speed": "30 ft.",
  "proficiency_bonus": 3,
  "stats": {
    "strength": 16,
    "dexterity": 12,
    "constitution": 14,
    "intelligence": 10,
    "wisdom": 13,
    "charisma": 8
  },
  "saving_throws": ["strength", "constitution"],
  "skills": ["athletics", "intimidation", "perception", "survival"],
  "attacks": [
    {"name": "Longsword", "bonus": "+6", "damage": "1d8+3 slashing", "notes": "Versatile (1d10+3)"},
    {"name": "Handaxe", "bonus": "+6", "damage": "1d6+3 slashing", "notes": "Thrown (20/60)"}
  ],
  "abilities": [
    {"name": "Second Wind", "description": "Regain 1d10+5 HP as a bonus action (1/short rest)"},
    {"name": "Action Surge", "description": "Take one additional action (1/short rest)"},
    {"name": "Extra Attack", "description": "Attack twice when taking the Attack action"}
  ],
  "spells": null,
  "location": "Where they can be found",
  "notes": "GM notes, secrets, plot hooks, motivations"
}

For spellcasters, spells should be:
{
  "casting_ability": "Charisma",
  "spell_save_dc": 15,
  "spell_attack_bonus": 7,
  "cantrips": ["Fire Bolt", "Mage Hand", "Prestidigitation"],
  "slot_level": 3,
  "slot_count": 2,
  "known_spells": ["Shield", "Misty Step", "Fireball", "Counterspell"]
}"""

    context_section = ""
    if campaign_context:
        context_section = f"\n\nCAMPAIGN CONTEXT:\n{campaign_context}\n\nMake the NPC fit naturally into this world."
    
    full_prompt = f"""Generate a fully statted NPC with the following requirements:
{race_hint}{class_hint}{level_hint}{role_hint}
User request: {user_prompt}{context_section}

Respond with ONLY valid JSON matching this schema:
{npc_json_schema}"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"{username}-npc-gen-{datetime.now(timezone.utc).timestamp()}",
        system_message=system_message
    )
    chat.with_model('openai', 'gpt-4o')
    
    response = await chat.send_message(UserMessage(text=full_prompt))
    
    json_match = re.search(r'\{[\s\S]*\}', response)
    if not json_match:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response")
    
    entity_data = json.loads(json_match.group())
    
    # Build NPC from AI response
    npc_id = str(uuid.uuid4())
    stats_data = entity_data.get('stats', {})
    spells_data = entity_data.get('spells')
    
    npc_doc = {
        'id': npc_id,
        'campaign_id': campaign_id,
        'name': entity_data.get('name', 'Unknown NPC'),
        'race': entity_data.get('race', request.race or 'Human'),
        'class_name': entity_data.get('class_name', request.class_name or 'Commoner'),
        'level': entity_data.get('level', request.level),
        'alignment': entity_data.get('alignment', 'True Neutral'),
        'description': entity_data.get('description', ''),
        'appearance': entity_data.get('appearance', ''),
        'personality': entity_data.get('personality', ''),
        'backstory': entity_data.get('backstory', ''),
        'role': entity_data.get('role', request.role or ''),
        'hp': entity_data.get('hp', 10),
        'max_hp': entity_data.get('max_hp', entity_data.get('hp', 10)),
        'ac': entity_data.get('ac', 10),
        'speed': entity_data.get('speed', '30 ft.'),
        'proficiency_bonus': entity_data.get('proficiency_bonus', 2),
        'stats': {
            'strength': stats_data.get('strength', 10),
            'dexterity': stats_data.get('dexterity', 10),
            'constitution': stats_data.get('constitution', 10),
            'intelligence': stats_data.get('intelligence', 10),
            'wisdom': stats_data.get('wisdom', 10),
            'charisma': stats_data.get('charisma', 10),
        },
        'saving_throws': entity_data.get('saving_throws', []),
        'skills': entity_data.get('skills', []),
        'attacks': entity_data.get('attacks', []),
        'abilities': entity_data.get('abilities', []),
        'spells': spells_data,
        'location': entity_data.get('location', ''),
        'notes': entity_data.get('notes', ''),
        'color': '#8A2BE2',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.npcs.insert_one(npc_doc)
    npc_doc.pop('_id', None)
    return npc_doc

# ==================== INITIATIVE ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/initiative", response_model=Initiative)
async def create_initiative(campaign_id: str, init_data: InitiativeCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    initiative = await db.initiatives.find_one(
        {'campaign_id': campaign_id, 'is_active': True},
        {'_id': 0}
    )
    return initiative

@api_router.put("/campaigns/{campaign_id}/initiative/{initiative_id}", response_model=Initiative)
async def update_initiative(campaign_id: str, initiative_id: str, init_data: InitiativeUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.initiatives.delete_one({'id': initiative_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    return {'message': 'Initiative deleted successfully'}

# ==================== MAP ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/maps", response_model=GameMap)
async def create_map(campaign_id: str, map_data: GameMapCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    map_dict = map_data.model_dump()
    map_obj = GameMap(campaign_id=campaign_id, **map_dict)
    doc = map_obj.model_dump()
    await db.maps.insert_one(doc)
    return map_obj

@api_router.get("/campaigns/{campaign_id}/maps", response_model=List[GameMap])
async def get_maps(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    maps = await db.maps.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return maps

@api_router.put("/campaigns/{campaign_id}/maps/{map_id}", response_model=GameMap)
async def update_map(campaign_id: str, map_id: str, map_data: GameMapUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
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
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Map not found")
    return {'message': 'Map deleted successfully'}


# ==================== WORLD MAP ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/world-maps")
async def create_world_map(campaign_id: str, map_data: WorldMapCreate, username: str = Depends(get_current_user)):
    """Create a new world/region map"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Default travel speeds
    default_travel_speeds = {
        "walking": 24,
        "horseback": 48,
        "cart": 16,
        "ship": 72,
        "flying": 96
    }
    
    world_map = WorldMap(
        campaign_id=campaign_id,
        name=map_data.name,
        map_type=map_data.map_type,
        image_data=map_data.image_data,
        scale_value=map_data.scale_value,
        scale_unit=map_data.scale_unit,
        travel_speeds=map_data.travel_speeds or default_travel_speeds,
        notes=map_data.notes
    )
    
    await db.world_maps.insert_one(world_map.model_dump())
    return {**world_map.model_dump(), '_id': None}

@api_router.get("/campaigns/{campaign_id}/world-maps")
async def get_world_maps(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all world maps for a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    maps = await db.world_maps.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
    return maps

@api_router.get("/campaigns/{campaign_id}/world-maps/{map_id}")
async def get_world_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Get a specific world map"""
    await verify_campaign_ownership(campaign_id, username)
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    return world_map

@api_router.put("/campaigns/{campaign_id}/world-maps/{map_id}")
async def update_world_map(campaign_id: str, map_id: str, update_data: WorldMapUpdate, username: str = Depends(get_current_user)):
    """Update a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="World map not found")
    
    updated = await db.world_maps.find_one({'id': map_id}, {'_id': 0})
    return updated

@api_router.delete("/campaigns/{campaign_id}/world-maps/{map_id}")
async def delete_world_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Delete a world map"""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="World map not found")
    return {'message': 'World map deleted'}

@api_router.post("/campaigns/{campaign_id}/world-maps/{map_id}/pins")
async def add_map_pin(campaign_id: str, map_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a pin to a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Location'),
        'pin_type': pin_data.get('pin_type', 'location'),
        'linked_location_id': pin_data.get('linked_location_id'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48')
    }
    
    pins = world_map.get('pins', [])
    pins.append(new_pin)
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_pin

@api_router.put("/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}")
async def update_map_pin(campaign_id: str, map_id: str, pin_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a pin on a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    pins = world_map.get('pins', [])
    pin_index = next((i for i, p in enumerate(pins) if p.get('id') == pin_id), None)
    
    if pin_index is None:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    # Update pin fields
    for key, value in pin_data.items():
        if key != 'id':
            pins[pin_index][key] = value
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return pins[pin_index]

@api_router.delete("/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}")
async def delete_map_pin(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Delete a pin from a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    pins = [p for p in world_map.get('pins', []) if p.get('id') != pin_id]
    # Also remove any paths connected to this pin
    paths = [p for p in world_map.get('paths', []) if p.get('from_pin_id') != pin_id and p.get('to_pin_id') != pin_id]
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Pin deleted'}

@api_router.post("/campaigns/{campaign_id}/world-maps/{map_id}/paths")
async def add_travel_path(campaign_id: str, map_id: str, path_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a travel path between two pins"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    new_path = {
        'id': str(uuid.uuid4()),
        'from_pin_id': path_data.get('from_pin_id'),
        'to_pin_id': path_data.get('to_pin_id'),
        'distance_value': path_data.get('distance_value', 0),
        'distance_unit': path_data.get('distance_unit', 'miles'),
        'terrain_type': path_data.get('terrain_type', 'road'),
        'terrain_modifier': path_data.get('terrain_modifier', 1.0),
        'notes': path_data.get('notes', ''),
        'is_bidirectional': path_data.get('is_bidirectional', True)
    }
    
    paths = world_map.get('paths', [])
    paths.append(new_path)
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_path

@api_router.put("/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}")
async def update_travel_path(campaign_id: str, map_id: str, path_id: str, path_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a travel path"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = world_map.get('paths', [])
    path_index = next((i for i, p in enumerate(paths) if p.get('id') == path_id), None)
    
    if path_index is None:
        raise HTTPException(status_code=404, detail="Path not found")
    
    for key, value in path_data.items():
        if key != 'id':
            paths[path_index][key] = value
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return paths[path_index]

@api_router.delete("/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}")
async def delete_travel_path(campaign_id: str, map_id: str, path_id: str, username: str = Depends(get_current_user)):
    """Delete a travel path"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = [p for p in world_map.get('paths', []) if p.get('id') != path_id]
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Path deleted'}

@api_router.post("/campaigns/{campaign_id}/world-maps/{map_id}/calculate-travel")
async def calculate_travel_time(campaign_id: str, map_id: str, request: TravelCalculateRequest, username: str = Depends(get_current_user)):
    """Calculate travel time between two pins"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    # Find the path between the two pins
    paths = world_map.get('paths', [])
    direct_path = next((p for p in paths if 
        (p.get('from_pin_id') == request.from_pin_id and p.get('to_pin_id') == request.to_pin_id) or
        (p.get('is_bidirectional') and p.get('from_pin_id') == request.to_pin_id and p.get('to_pin_id') == request.from_pin_id)
    ), None)
    
    if not direct_path:
        raise HTTPException(status_code=404, detail="No path exists between these locations")
    
    # Get travel speed for mode
    travel_speeds = world_map.get('travel_speeds', {'walking': 24, 'horseback': 48, 'cart': 16, 'ship': 72, 'flying': 96})
    speed = travel_speeds.get(request.travel_mode, 24)  # miles per day
    
    # Calculate base travel time
    distance = direct_path.get('distance_value', 0)
    terrain_modifier = direct_path.get('terrain_modifier', 1.0)
    
    # Effective distance considering terrain
    effective_distance = distance * terrain_modifier
    
    # Calculate time
    if speed > 0:
        travel_days = effective_distance / speed
        travel_hours = travel_days * 8  # Assuming 8 hours of travel per day
    else:
        travel_days = 0
        travel_hours = 0
    
    # Get pin names
    pins = world_map.get('pins', [])
    from_pin = next((p for p in pins if p.get('id') == request.from_pin_id), {})
    to_pin = next((p for p in pins if p.get('id') == request.to_pin_id), {})
    
    return {
        'from_location': from_pin.get('name', 'Unknown'),
        'to_location': to_pin.get('name', 'Unknown'),
        'distance': distance,
        'distance_unit': direct_path.get('distance_unit', 'miles'),
        'terrain_type': direct_path.get('terrain_type', 'road'),
        'terrain_modifier': terrain_modifier,
        'effective_distance': effective_distance,
        'travel_mode': request.travel_mode,
        'speed_per_day': speed,
        'travel_days': round(travel_days, 1),
        'travel_hours': round(travel_hours, 1),
        'formatted_time': f"{int(travel_days)} days, {int((travel_days % 1) * 8)} hours" if travel_days >= 1 else f"{round(travel_hours, 1)} hours"
    }

@api_router.get("/campaigns/{campaign_id}/world-maps/{map_id}/nearby")
async def get_nearby_locations(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Get all locations reachable from a given pin with travel times"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = world_map.get('paths', [])
    pins = world_map.get('pins', [])
    travel_speeds = world_map.get('travel_speeds', {'walking': 24})
    
    # Find all paths from/to this pin
    connected_paths = [p for p in paths if 
        p.get('from_pin_id') == pin_id or 
        (p.get('is_bidirectional') and p.get('to_pin_id') == pin_id)
    ]
    
    nearby = []
    for path in connected_paths:
        # Determine the destination pin
        dest_pin_id = path.get('to_pin_id') if path.get('from_pin_id') == pin_id else path.get('from_pin_id')
        dest_pin = next((p for p in pins if p.get('id') == dest_pin_id), None)
        
        if dest_pin:
            distance = path.get('distance_value', 0)
            terrain_mod = path.get('terrain_modifier', 1.0)
            walking_days = (distance * terrain_mod) / travel_speeds.get('walking', 24)
            
            nearby.append({
                'pin_id': dest_pin_id,
                'name': dest_pin.get('name', 'Unknown'),
                'pin_type': dest_pin.get('pin_type', 'location'),
                'distance': distance,
                'distance_unit': path.get('distance_unit', 'miles'),
                'terrain_type': path.get('terrain_type', 'road'),
                'walking_time': f"{int(walking_days)} days" if walking_days >= 1 else f"{round(walking_days * 8, 1)} hours",
                'walking_days': round(walking_days, 1)
            })
    
    # Sort by distance
    nearby.sort(key=lambda x: x.get('distance', 0))
    
    return {
        'current_location': next((p.get('name') for p in pins if p.get('id') == pin_id), 'Unknown'),
        'nearby_locations': nearby
    }

# ==================== LOCAL MAP ROUTES ====================

@api_router.post("/campaigns/{campaign_id}/local-maps")
async def create_local_map(campaign_id: str, map_data: LocalMapCreate, username: str = Depends(get_current_user)):
    """Create a local map for a city/town/village"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = LocalMap(
        campaign_id=campaign_id,
        location_id=map_data.location_id,
        name=map_data.name,
        map_type=map_data.map_type,
        image_data=map_data.image_data,
        notes=map_data.notes
    )
    
    await db.local_maps.insert_one(local_map.model_dump())
    return {**local_map.model_dump(), '_id': None}

@api_router.get("/campaigns/{campaign_id}/local-maps")
async def get_local_maps(campaign_id: str, location_id: Optional[str] = None, username: str = Depends(get_current_user)):
    """Get all local maps, optionally filtered by location"""
    await verify_campaign_ownership(campaign_id, username)
    
    query = {'campaign_id': campaign_id}
    if location_id:
        query['location_id'] = location_id
    
    maps = await db.local_maps.find(query, {'_id': 0}).to_list(100)
    return maps

@api_router.get("/campaigns/{campaign_id}/local-maps/{map_id}")
async def get_local_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Get a specific local map"""
    await verify_campaign_ownership(campaign_id, username)
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    return local_map

@api_router.put("/campaigns/{campaign_id}/local-maps/{map_id}")
async def update_local_map(campaign_id: str, map_id: str, update_data: LocalMapUpdate, username: str = Depends(get_current_user)):
    """Update a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    updated = await db.local_maps.find_one({'id': map_id}, {'_id': 0})
    return updated

@api_router.delete("/campaigns/{campaign_id}/local-maps/{map_id}")
async def delete_local_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Delete a local map"""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.local_maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local map not found")
    return {'message': 'Local map deleted'}

@api_router.post("/campaigns/{campaign_id}/local-maps/{map_id}/pins")
async def add_local_map_pin(campaign_id: str, map_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a pin to a local map (place of interest)"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Place'),
        'pin_type': pin_data.get('pin_type', 'poi'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48')
    }
    
    pins = local_map.get('pins', [])
    pins.append(new_pin)
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_pin

@api_router.put("/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}")
async def update_local_map_pin(campaign_id: str, map_id: str, pin_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a pin on a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    pins = local_map.get('pins', [])
    pin_index = next((i for i, p in enumerate(pins) if p.get('id') == pin_id), None)
    
    if pin_index is None:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    for key, value in pin_data.items():
        if key != 'id':
            pins[pin_index][key] = value
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return pins[pin_index]

@api_router.delete("/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}")
async def delete_local_map_pin(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Delete a pin from a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    pins = [p for p in local_map.get('pins', []) if p.get('id') != pin_id]
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Pin deleted'}


# ==================== AI ROUTES ====================

async def get_campaign_context(campaign_id: str, limit: int = 5) -> str:
    """Gather campaign context for AI-aware generation"""
    context_parts = []
    
    # Get campaign setting
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if setting and setting.get('content'):
        context_parts.append(f"WORLD SETTING:\n{setting['content'][:500]}")
    
    # Get existing NPCs (names and brief descriptions)
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'description': 1, 'location': 1}).limit(limit).to_list(limit)
    if npcs:
        npc_list = [f"- {n['name']}" + (f" ({n.get('location', '')})" if n.get('location') else "") for n in npcs]
        context_parts.append("EXISTING NPCS:\n" + "\n".join(npc_list))
    
    # Get existing locations
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'location_type': 1}).limit(limit).to_list(limit)
    if locations:
        loc_list = [f"- {loc['name']} ({loc.get('location_type', 'location')})" for loc in locations]
        context_parts.append("EXISTING LOCATIONS:\n" + "\n".join(loc_list))
    
    # Get existing gods
    gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'domain': 1}).limit(limit).to_list(limit)
    if gods:
        god_list = [f"- {g['name']} (Domain: {g.get('domain', 'unknown')})" for g in gods]
        context_parts.append("EXISTING DEITIES:\n" + "\n".join(god_list))
    
    # Get recent session notes
    notes = await db.in_game_notes.find({'campaign_id': campaign_id}, {'_id': 0, 'content': 1}).sort('created_at', -1).limit(3).to_list(3)
    if notes:
        recent_notes = " ".join([n['content'][:200] for n in notes])
        context_parts.append(f"RECENT SESSION NOTES:\n{recent_notes[:400]}")
    
    if context_parts:
        return "\n\n".join(context_parts)
    return ""

class UnseenServantRequest(BaseModel):
    prompt: str
    entity_type: str  # god, npc, location, place_of_interest, creature
    campaign_id: str
    location_id: Optional[str] = None  # Required if entity_type is place_of_interest

class UnseenServantResponse(BaseModel):
    success: bool
    entity_type: str
    entity_id: str
    entity_name: str
    message: str

# ROOK AI endpoint (renamed from Unseen Servant)
@api_router.post("/rook/generate", response_model=UnseenServantResponse)
@api_router.post("/unseen-servant/generate", response_model=UnseenServantResponse)  # Backwards compatibility
async def rook_generate(request: UnseenServantRequest, username: str = Depends(get_current_user)):
    """ROOK AI: Generates and auto-saves fantasy TTRPG content"""
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
            'god': '''Generate a fantasy deity. Respond ONLY with valid JSON in this exact format:
{
  "name": "deity name",
  "domain": "primary domain (e.g., War, Knowledge, Nature)",
  "description": "2-3 sentences describing the deity",
  "symbol": "the deity's holy symbol",
  "alignment": "alignment (e.g., Lawful Good, Chaotic Neutral)",
  "notes": "additional lore or worship practices"
}''',
            'npc': '''Generate a fantasy NPC with full stat block. Respond ONLY with valid JSON in this exact format:
{
  "name": "NPC full name",
  "race": "Race",
  "class_name": "Class",
  "level": 5,
  "alignment": "Alignment",
  "description": "physical appearance, personality, and background in 2-3 sentences",
  "appearance": "physical appearance",
  "personality": "personality traits",
  "backstory": "brief backstory",
  "role": "Role in world",
  "hp": 32,
  "max_hp": 32,
  "ac": 14,
  "speed": "30 ft.",
  "proficiency_bonus": 3,
  "stats": {"strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 13, "wisdom": 10, "charisma": 16},
  "saving_throws": ["wisdom", "charisma"],
  "skills": ["arcana", "deception"],
  "attacks": [{"name": "Dagger", "bonus": "+5", "damage": "1d4+2 piercing", "notes": "Finesse"}],
  "abilities": [{"name": "Feature", "description": "Description"}],
  "spells": null,
  "location": "where they can be found",
  "notes": "motivations, secrets, or plot hooks"
}''',
            'location': '''Generate a fantasy location. Respond ONLY with valid JSON in this exact format:
{
  "name": "location name",
  "location_type": "type (City, Town, Village, Dungeon, Forest, etc.)",
  "description": "2-3 sentences describing the location",
  "notable_npcs": "key NPCs found here",
  "notes": "secrets, hooks, or GM notes"
}''',
            'place_of_interest': '''Generate a place of interest (shop, tavern, temple, etc.). Respond ONLY with valid JSON in this exact format:
{
  "name": "establishment name",
  "place_type": "type (shop, tavern, temple, blacksmith, guild, library, residence, other)",
  "description": "2-3 sentences describing the place",
  "owner": "name of proprietor/owner",
  "services": "what services or items are offered",
  "notes": "secrets, rumors, or plot hooks"
}''',
            'creature': '''Generate a custom creature/monster for a fantasy TTRPG. Respond ONLY with valid JSON in this exact format:
{
  "name": "creature name",
  "cr": "challenge rating (0, 1/8, 1/4, 1/2, or 1-30)",
  "hp": 45,
  "ac": 14,
  "type": "creature type (aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead)",
  "size": "size (Tiny, Small, Medium, Large, Huge, Gargantuan)",
  "speed": "movement speeds (e.g., 30 ft., fly 60 ft.)",
  "abilities": "key abilities, attacks, and special features (e.g., Multiattack, Bite 2d6+4, Fire Breath 8d6)",
  "description": "2-3 sentences describing appearance, behavior, and lore"
}'''
        }
        
        # Add aliases for entity types
        entity_prompts['world_place'] = entity_prompts['place_of_interest']
        
        if request.entity_type not in entity_prompts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid entity type: {request.entity_type}")
        
        # Gather campaign context for smarter AI generation
        campaign_context = await get_campaign_context(request.campaign_id)
        
        # Build the full prompt with campaign context
        system_message = """You are ROOK, a magical AI assistant for tabletop RPG Game Masters. You generate content that fits seamlessly into the GM's existing world and campaign.

IMPORTANT RULES:
1. Generate content in strict JSON format only - no markdown, no explanations
2. Make your creations fit naturally with the existing world context provided
3. Reference existing NPCs, locations, or deities when appropriate
4. Maintain consistency with the established setting and tone"""

        # Build prompt with context
        context_section = ""
        if campaign_context:
            context_section = f"\n\n=== CAMPAIGN CONTEXT ===\n{campaign_context}\n=== END CONTEXT ===\n\nUse this context to make your generation fit naturally into this world.\n\n"
        
        full_prompt = f"{entity_prompts[request.entity_type]}{context_section}\nUser request: {request.prompt}"
        
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
            stats_data = entity_data.get('stats', {})
            spells_data = entity_data.get('spells')
            npc_doc = {
                'id': entity_id,
                'campaign_id': request.campaign_id,
                'name': entity_data.get('name', 'Unknown NPC'),
                'race': entity_data.get('race', 'Human'),
                'class_name': entity_data.get('class_name', 'Commoner'),
                'level': entity_data.get('level', 1),
                'alignment': entity_data.get('alignment', ''),
                'description': entity_data.get('description', ''),
                'appearance': entity_data.get('appearance', ''),
                'personality': entity_data.get('personality', ''),
                'backstory': entity_data.get('backstory', ''),
                'role': entity_data.get('role', ''),
                'hp': entity_data.get('hp', 10),
                'max_hp': entity_data.get('max_hp', entity_data.get('hp', 10)),
                'ac': entity_data.get('ac', 10),
                'speed': entity_data.get('speed', '30 ft.'),
                'proficiency_bonus': entity_data.get('proficiency_bonus', 2),
                'stats': {
                    'strength': stats_data.get('strength', 10),
                    'dexterity': stats_data.get('dexterity', 10),
                    'constitution': stats_data.get('constitution', 10),
                    'intelligence': stats_data.get('intelligence', 10),
                    'wisdom': stats_data.get('wisdom', 10),
                    'charisma': stats_data.get('charisma', 10),
                },
                'saving_throws': entity_data.get('saving_throws', []),
                'skills': entity_data.get('skills', []),
                'attacks': entity_data.get('attacks', []),
                'abilities': entity_data.get('abilities', []),
                'spells': spells_data,
                'location': entity_data.get('location', ''),
                'notes': entity_data.get('notes', ''),
                'color': '#8A2BE2',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.npcs.insert_one(npc_doc)
            npc_doc.pop('_id', None)
            
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
            
        elif request.entity_type == 'place_of_interest' or request.entity_type == 'world_place':
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
        
        elif request.entity_type == 'creature':
            new_creature = CustomCreature(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Creature'),
                cr=str(entity_data.get('cr', '1')),
                hp=int(entity_data.get('hp', 10)),
                ac=int(entity_data.get('ac', 10)),
                type=entity_data.get('type', 'humanoid'),
                size=entity_data.get('size', 'Medium'),
                speed=entity_data.get('speed', '30 ft.'),
                abilities=entity_data.get('abilities', ''),
                description=entity_data.get('description', ''),
                created_by=username
            )
            await db.custom_creatures.insert_one(new_creature.model_dump())
        
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
        world_context = ""
        if hasattr(request, 'campaign_id') and request.campaign_id:
            campaign = await db.campaigns.find_one({'id': request.campaign_id})
            if campaign:
                system_context = f" for {campaign.get('system', '5e Compatible')} system"
                
                # Build world setting context
                world_setting = campaign.get('world_setting', 'custom')
                world_notes = campaign.get('world_setting_notes', '')
                
                # Pre-defined world setting descriptions (generic, no trademarks)
                world_settings_lore = {
                    'high_fantasy': """This campaign is set in a classic high fantasy world. Use typical fantasy tropes: medieval kingdoms, ancient magic, dragons, elves, dwarves, and epic quests. Include diverse regions, powerful wizards, noble knights, and dark forces threatening the realm. Reference generic fantasy elements like guilds, temples, taverns, and dungeons.""",
                    
                    'magipunk_noir': """This campaign blends magic with industrial/noir elements. Include magical technology, airships, trains, and urban intrigue. Feature powerful corporations or houses, political conspiracies, and a world recovering from a great war. Magic is integrated into daily life and industry.""",
                    
                    'classic_fantasy': """This is a classic sword & sorcery setting with a gritty, old-school feel. Include powerful wizards, ancient ruins, warring nations, and morally grey characters. Magic is powerful but dangerous. Focus on exploration, treasure hunting, and political intrigue.""",
                    
                    'epic_fantasy': """This campaign features epic, sweeping narratives with clear good vs evil conflicts. Include dragon riders, fallen kingdoms, prophecies, and world-changing events. Heroes are destined for greatness and face dark lords threatening all civilization.""",
                    
                    'gothic_horror': """This campaign is set in a dark, gothic horror world. Create content with atmosphere of dread, tragedy, and moral ambiguity. Include cursed lands, tragic villains, monsters born of fear, and domains ruled by powerful evil. Maintain themes of horror, isolation, and the corruption of good.""",
                    
                    'fantasy_space': """This campaign involves fantasy space travel between worlds. Include magical ships that sail between crystal spheres, bizarre alien creatures, and adventures across multiple worlds. Blend fantasy magic with the wonder of space exploration.""",
                    
                    'planar_adventure': """This campaign deals with multiple planes of existence. Include extraplanar cities, philosophical factions, portals to other realms, and beings of pure elemental or conceptual nature. Explore themes of belief, reality, and the nature of existence.""",
                    
                    'custom': """This is a custom/homebrew setting. Generate original content that fits a fantasy TTRPG world. Use the additional context provided by the GM to inform your creations."""
                }
                
                base_world_context = world_settings_lore.get(world_setting, world_settings_lore['custom'])
                
                # Add custom notes if provided
                if world_notes:
                    world_context = f"\n\nWORLD SETTING CONTEXT:\n{base_world_context}\n\nADDITIONAL CAMPAIGN NOTES:\n{world_notes}"
                else:
                    world_context = f"\n\nWORLD SETTING CONTEXT:\n{base_world_context}"
                
                # Add custom rules if available (limit context size)
                custom_rules = []
                async for rule in db.campaign_custom_rules.find({'campaign_id': request.campaign_id}, {'_id': 0, 'content': 1, 'name': 1}).limit(3):
                    custom_rules.append(rule)
                
                if custom_rules:
                    # Limit total rules context to ~50K chars to avoid overwhelming the AI
                    rules_context = "\n\nCUSTOM RULES REFERENCE (use these rules when applicable):\n"
                    total_chars = 0
                    for rule in custom_rules:
                        rule_content = rule.get('content', '')
                        if total_chars + len(rule_content) < 50000:
                            rules_context += f"\n--- {rule.get('name', 'Custom Rules')} ---\n{rule_content}\n"
                            total_chars += len(rule_content)
                        else:
                            # Truncate if too long
                            remaining = 50000 - total_chars
                            if remaining > 1000:
                                rules_context += f"\n--- {rule.get('name', 'Custom Rules')} (truncated) ---\n{rule_content[:remaining]}...\n"
                            break
                    world_context += rules_context
        
        # Create system message based on generation type
        system_messages = {
            'encounter': f'You are a TTRPG encounter designer{system_context}. Create detailed, balanced encounters with monsters, tactics, and environmental details following the rules and conventions of the system.{world_context}',
            'trap': f'You are a TTRPG trap designer{system_context}. Create creative and dangerous traps with trigger mechanisms, effects, and disarm methods appropriate for the system.{world_context}',
            'npc': f'You are a TTRPG NPC creator{system_context}. Create memorable NPCs with personality, backstory, stats, and plot hooks using the system\'s stat format. Make NPCs fit naturally into the campaign world.{world_context}',
            'world': f'You are a TTRPG world-builder{system_context}. Create rich locations, lore, factions, and story hooks that fit seamlessly into the established setting.{world_context}',
            'plot': f'You are a TTRPG story architect{system_context}. Create compelling plot hooks, story arcs, and adventure ideas that tie into the world\'s established lore and factions.{world_context}',
            'location': f'You are a TTRPG location designer{system_context}. Create detailed locations with atmosphere, inhabitants, secrets, and adventure hooks appropriate for the setting.{world_context}'
        }
        
        system_message = system_messages.get(request.generation_type, f'You are a helpful TTRPG assistant{system_context}.{world_context}')
        
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

class RookChatRequest(BaseModel):
    message: str
    campaign_id: str = ""
    context: str = ""

@api_router.post("/rook/chat")
async def rook_chat(request: RookChatRequest, username: str = Depends(get_current_user)):
    """ROOK AI Co-GM: Context-aware chat assistant for the GM Screen."""
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI generation limit reached. Upgrade for unlimited access!")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
    
    campaign_context = ""
    if request.campaign_id:
        campaign_context = await get_campaign_context(request.campaign_id)
    
    system_msg = request.context or "You are ROOK, an AI co-GM assistant for D&D 5e. Help the Game Master with encounters, NPCs, world building, and story development. Use only SRD/OGL content. Be creative, concise, and dramatic."
    if campaign_context:
        system_msg += f"\n\nCAMPAIGN CONTEXT:\n{campaign_context}"
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"{username}-cogm-{datetime.now(timezone.utc).timestamp()}",
        system_message=system_msg
    )
    chat.with_model('openai', 'gpt-4o')
    
    response = await chat.send_message(UserMessage(text=request.message))
    await increment_ai_usage(username)
    
    return {"response": response}

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
        
        system_message = f"""You are an AI assistant helping organize tabletop RPG campaign notes.
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
    ).sort('created_at', -1).to_list(500)  # Limit to 500 items per campaign
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

@api_router.post("/campaigns/{campaign_id}/inventory/{item_id}/claim")
async def claim_inventory_item(
    campaign_id: str,
    item_id: str,
    claim_data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Claim an item from party inventory for a character"""
    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.get('claimed_by'):
        raise HTTPException(status_code=400, detail="Item already claimed")
    
    character_id = claim_data.get('character_id')
    character_name = claim_data.get('character_name', 'Unknown')
    
    await db.inventory.update_one(
        {'id': item_id},
        {'$set': {
            'claimed_by': character_name,
            'claimed_by_id': character_id,
            'claimed_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Item claimed by {character_name}"}

@api_router.post("/campaigns/{campaign_id}/inventory/{item_id}/unclaim")
async def unclaim_inventory_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Return an item to party inventory (unclaim)"""
    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.inventory.update_one(
        {'id': item_id},
        {'$unset': {'claimed_by': '', 'claimed_by_id': '', 'claimed_at': ''}}
    )
    
    return {"message": "Item returned to party inventory"}

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
    ).sort('created_at', -1).to_list(500)  # Limit to 500 custom items
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

# ==================== SMART NOTE PARSING ROUTES ====================

class SmartNoteParseRequest(BaseModel):
    note_text: str
    campaign_id: str

class EntityMention(BaseModel):
    entity_type: str  # "npc", "location", "item", "quest"
    name: str
    existing_id: Optional[str] = None  # If entity already exists
    suggested_notes: str = ""
    suggested_location: Optional[str] = None
    confidence: str = "high"  # high, medium, low

class TimeChange(BaseModel):
    type: str  # "long_rest", "short_rest", "hours", "days"
    amount: int = 0  # hours or days
    description: str

class SmartNoteParseResponse(BaseModel):
    success: bool
    entities_mentioned: List[EntityMention]
    time_changes: List[TimeChange]
    calendar_update_suggested: bool = False
    new_calendar_date: Optional[str] = None

@api_router.post("/campaigns/{campaign_id}/notes/parse", response_model=SmartNoteParseResponse)
async def parse_session_notes(
    campaign_id: str, 
    request: SmartNoteParseRequest,
    username: str = Depends(get_current_user)
):
    """
    Smart Note Parsing: Extract entities, events, and time changes from session notes.
    Uses AI to automatically suggest updates to NPCs, locations, calendar, etc.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    note_text = request.note_text
    
    if not note_text or len(note_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note text too short. Please provide at least 10 characters."
        )
    
    # Fetch existing campaign entities to help AI match them
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0, 'id': 1, 'name': 1}).to_list(200)  # Limit for AI context
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0, 'id': 1, 'name': 1}).to_list(200)
    
    npc_names = [npc['name'] for npc in npcs]
    location_names = [loc['name'] for loc in locations]
    
    # Build AI prompt
    system_message = """You are a tabletop RPG Game Master assistant that extracts structured information from session notes.

Your task: Analyze the session notes and extract:
1. NPCs mentioned (with what happened to them)
2. Locations visited or mentioned
3. Time that has passed (long rests, short rests, days, hours)
4. Important events

IMPORTANT: Match entity names to existing entities when possible (case-insensitive).

Respond in valid JSON format only. No markdown, no explanations."""

    user_prompt = f"""Session Notes:
{note_text}

Known NPCs in this campaign: {', '.join(npc_names) if npc_names else 'None yet'}
Known Locations in this campaign: {', '.join(location_names) if location_names else 'None yet'}

Extract and return JSON in this EXACT format:
{{
  "entities": [
    {{
      "type": "npc" or "location",
      "name": "Exact name from notes",
      "existing_name": "Matching name from known entities (or null if new)",
      "notes": "What happened involving this entity",
      "location": "Where this entity is (optional)"
    }}
  ],
  "time_changes": [
    {{
      "type": "long_rest" or "short_rest" or "hours" or "days",
      "amount": 8 (for hours) or 1 (for days),
      "description": "Human readable description"
    }}
  ]
}}"""

    try:
        # Use emergentintegrations LLM
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        chat = LlmChat(api_key=llm_key, model="gpt-5.2")
        response = chat.send_message(
            system_prompt=system_message,
            messages=[UserMessage(role="user", content=user_prompt)],
            max_tokens=1500,
            temperature=0.3  # Lower temperature for more consistent parsing
        )
        
        # Parse the response
        response_text = response.message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        parsed_data = json.loads(response_text)
        
        # Map to response model
        entities_mentioned = []
        for entity in parsed_data.get('entities', []):
            entity_type = entity.get('type', '').lower()
            name = entity.get('name', '')
            existing_name = entity.get('existing_name')
            notes = entity.get('notes', '')
            location = entity.get('location')
            
            # Find existing entity ID
            existing_id = None
            if existing_name:
                if entity_type == 'npc':
                    for npc in npcs:
                        if npc['name'].lower() == existing_name.lower():
                            existing_id = npc['id']
                            name = npc['name']  # Use exact existing name
                            break
                elif entity_type == 'location':
                    for loc in locations:
                        if loc['name'].lower() == existing_name.lower():
                            existing_id = loc['id']
                            name = loc['name']
                            break
            
            entities_mentioned.append(EntityMention(
                entity_type=entity_type,
                name=name,
                existing_id=existing_id,
                suggested_notes=notes,
                suggested_location=location,
                confidence="high" if existing_id else "medium"
            ))
        
        # Process time changes
        time_changes_list = []
        total_hours = 0
        
        for time_change in parsed_data.get('time_changes', []):
            tc_type = time_change.get('type', '').lower()
            amount = time_change.get('amount', 0)
            description = time_change.get('description', '')
            
            # Calculate hours
            if tc_type == 'long_rest':
                total_hours += 8
                amount = 8
            elif tc_type == 'short_rest':
                total_hours += 1
                amount = 1
            elif tc_type == 'hours':
                total_hours += amount
            elif tc_type == 'days':
                total_hours += (amount * 24)
            
            time_changes_list.append(TimeChange(
                type=tc_type,
                amount=amount,
                description=description
            ))
        
        # Calculate new calendar date if time passed
        new_calendar_date = None
        calendar_update_suggested = total_hours > 0
        
        if calendar_update_suggested:
            # Fetch current calendar
            calendar = await db.calendar.find_one({'campaign_id': campaign_id}, {'_id': 0})
            if calendar:
                current_date_str = calendar.get('current_date', '')
                if current_date_str:
                    try:
                        from datetime import datetime as dt
                        current_date = dt.fromisoformat(current_date_str.replace('Z', '+00:00'))
                        new_date = current_date + timedelta(hours=total_hours)
                        new_calendar_date = new_date.isoformat()
                    except:
                        pass
        
        return SmartNoteParseResponse(
            success=True,
            entities_mentioned=entities_mentioned,
            time_changes=time_changes_list,
            calendar_update_suggested=calendar_update_suggested,
            new_calendar_date=new_calendar_date
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned invalid format. Please try again."
        )
    except Exception as e:
        logger.error(f"Smart note parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse notes: {str(e)}"
        )

# ==================== USER RULESET ROUTES ====================
# These endpoints manage user-level rulesets (stored per-user, not campaign)

@api_router.post("/user/content/upload")
async def upload_user_content(data: UserBulkContentUpload, username: str = Depends(get_current_user)):
    """Upload a personal ruleset with races, classes, etc. for use in character creation"""
    
    # Validate edition
    if data.edition not in ["2014", "2024"]:
        raise HTTPException(status_code=400, detail="Edition must be '2014' or '2024'")
    
    # Check for existing content with same names (to skip duplicates)
    existing_races = await db.user_races.find(
        {'user_id': username, 'edition': data.edition}, 
        {'name': 1, '_id': 0}
    ).to_list(1000)
    existing_race_names = {r['name'].lower() for r in existing_races}
    
    existing_classes = await db.user_classes.find(
        {'user_id': username, 'edition': data.edition}, 
        {'name': 1, '_id': 0}
    ).to_list(1000)
    existing_class_names = {c['name'].lower() for c in existing_classes}
    
    existing_subclasses = await db.user_subclasses.find(
        {'user_id': username, 'edition': data.edition}, 
        {'name': 1, '_id': 0}
    ).to_list(1000)
    existing_subclass_names = {s['name'].lower() for s in existing_subclasses}
    
    existing_backgrounds = await db.user_backgrounds.find(
        {'user_id': username, 'edition': data.edition}, 
        {'name': 1, '_id': 0}
    ).to_list(1000)
    existing_background_names = {b['name'].lower() for b in existing_backgrounds}
    
    existing_feats = await db.user_feats.find(
        {'user_id': username, 'edition': data.edition}, 
        {'name': 1, '_id': 0}
    ).to_list(1000)
    existing_feat_names = {f['name'].lower() for f in existing_feats}
    
    # Create the ruleset
    ruleset = UserRuleset(
        user_id=username,
        name=data.ruleset_name,
        description=data.ruleset_description,
        edition=data.edition
    )
    await db.user_rulesets.insert_one(ruleset.model_dump())
    ruleset_id = ruleset.id
    
    # Track what was uploaded vs skipped
    uploaded = {"races": [], "classes": [], "subclasses": [], "backgrounds": [], "feats": []}
    skipped = {"races": [], "classes": [], "subclasses": [], "backgrounds": [], "feats": []}
    
    # Add races
    for race_data in data.races:
        if race_data.name.lower() in existing_race_names:
            skipped["races"].append(race_data.name)
            continue
        race = UserRace(
            user_id=username,
            ruleset_id=ruleset_id,
            edition=data.edition,
            name=race_data.name,
            description=race_data.description,
            size=race_data.size,
            speed=race_data.speed,
            ability_bonuses=race_data.ability_bonuses,
            traits=race_data.traits,
            languages=race_data.languages,
            subraces=race_data.subraces,
            source=race_data.source
        )
        await db.user_races.insert_one(race.model_dump())
        uploaded["races"].append(race_data.name)
    
    # Add classes
    for class_data in data.classes:
        if class_data.name.lower() in existing_class_names:
            skipped["classes"].append(class_data.name)
            continue
        cls = UserClass(
            user_id=username,
            ruleset_id=ruleset_id,
            edition=data.edition,
            name=class_data.name,
            description=class_data.description,
            hit_die=class_data.hit_die,
            primary_ability=class_data.primary_ability,
            saving_throw_proficiencies=class_data.saving_throw_proficiencies,
            armor_proficiencies=class_data.armor_proficiencies,
            weapon_proficiencies=class_data.weapon_proficiencies,
            features=class_data.features,
            source=class_data.source
        )
        await db.user_classes.insert_one(cls.model_dump())
        uploaded["classes"].append(class_data.name)
    
    # Add subclasses
    for subclass_data in data.subclasses:
        if subclass_data.name.lower() in existing_subclass_names:
            skipped["subclasses"].append(subclass_data.name)
            continue
        subclass = UserSubclass(
            user_id=username,
            ruleset_id=ruleset_id,
            edition=data.edition,
            parent_class=subclass_data.parent_class,
            name=subclass_data.name,
            description=subclass_data.description,
            subclass_level=subclass_data.subclass_level,
            features=subclass_data.features,
            source=subclass_data.source
        )
        await db.user_subclasses.insert_one(subclass.model_dump())
        uploaded["subclasses"].append(subclass_data.name)
    
    # Add backgrounds
    for bg_data in data.backgrounds:
        if bg_data.name.lower() in existing_background_names:
            skipped["backgrounds"].append(bg_data.name)
            continue
        background = UserBackground(
            user_id=username,
            ruleset_id=ruleset_id,
            edition=data.edition,
            name=bg_data.name,
            description=bg_data.description,
            skill_proficiencies=bg_data.skill_proficiencies,
            tool_proficiencies=bg_data.tool_proficiencies,
            languages=bg_data.languages,
            equipment=bg_data.equipment,
            feature_name=bg_data.feature_name,
            feature_description=bg_data.feature_description,
            source=bg_data.source
        )
        await db.user_backgrounds.insert_one(background.model_dump())
        uploaded["backgrounds"].append(bg_data.name)
    
    # Add feats
    for feat_data in data.feats:
        if feat_data.name.lower() in existing_feat_names:
            skipped["feats"].append(feat_data.name)
            continue
        feat = UserFeat(
            user_id=username,
            ruleset_id=ruleset_id,
            edition=data.edition,
            name=feat_data.name,
            description=feat_data.description,
            prerequisites=feat_data.prerequisites,
            benefits=feat_data.benefits,
            source=feat_data.source
        )
        await db.user_feats.insert_one(feat.model_dump())
        uploaded["feats"].append(feat_data.name)
    
    # Build summary
    total_uploaded = sum(len(v) for v in uploaded.values())
    total_skipped = sum(len(v) for v in skipped.values())
    
    return {
        "message": f"Ruleset '{data.ruleset_name}' uploaded to {data.edition} rules!",
        "ruleset_id": ruleset_id,
        "edition": data.edition,
        "uploaded": uploaded,
        "skipped": skipped if total_skipped > 0 else None,
        "summary": {
            "total_uploaded": total_uploaded,
            "total_skipped": total_skipped,
            "races": len(uploaded["races"]),
            "classes": len(uploaded["classes"]),
            "subclasses": len(uploaded["subclasses"]),
            "backgrounds": len(uploaded["backgrounds"]),
            "feats": len(uploaded["feats"])
        }
    }


@api_router.get("/user/content")
async def get_user_content(edition: str = None, username: str = Depends(get_current_user)):
    """Get all user's personal rulesets and content, optionally filtered by edition"""
    
    query = {'user_id': username}
    if edition:
        if edition not in ["2014", "2024"]:
            raise HTTPException(status_code=400, detail="Edition must be '2014' or '2024'")
        query['edition'] = edition
    
    rulesets = await db.user_rulesets.find(query, {'_id': 0}).to_list(100)
    races = await db.user_races.find(query, {'_id': 0}).to_list(500)
    classes = await db.user_classes.find(query, {'_id': 0}).to_list(500)
    subclasses = await db.user_subclasses.find(query, {'_id': 0}).to_list(500)
    backgrounds = await db.user_backgrounds.find(query, {'_id': 0}).to_list(500)
    feats = await db.user_feats.find(query, {'_id': 0}).to_list(500)
    
    return {
        "rulesets": rulesets,
        "races": races,
        "classes": classes,
        "subclasses": subclasses,
        "backgrounds": backgrounds,
        "feats": feats,
        "has_custom_content": len(races) > 0 or len(classes) > 0,
        "edition_filter": edition
    }


@api_router.delete("/user/content/rulesets/{ruleset_id}")
async def delete_user_ruleset(ruleset_id: str, username: str = Depends(get_current_user)):
    """Delete a user's ruleset and all its content"""
    
    # Verify ownership
    ruleset = await db.user_rulesets.find_one({'id': ruleset_id, 'user_id': username})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    # Delete all content from this ruleset
    await db.user_races.delete_many({'user_id': username, 'ruleset_id': ruleset_id})
    await db.user_classes.delete_many({'user_id': username, 'ruleset_id': ruleset_id})
    await db.user_subclasses.delete_many({'user_id': username, 'ruleset_id': ruleset_id})
    await db.user_backgrounds.delete_many({'user_id': username, 'ruleset_id': ruleset_id})
    await db.user_feats.delete_many({'user_id': username, 'ruleset_id': ruleset_id})
    await db.user_rulesets.delete_one({'id': ruleset_id})
    
    return {"message": "Ruleset deleted successfully"}


@api_router.get("/user/content/summary")
async def get_user_content_summary(username: str = Depends(get_current_user)):
    """Get a summary of user's content by edition"""
    
    summary = {
        "2014": {"races": 0, "classes": 0, "subclasses": 0, "backgrounds": 0, "feats": 0, "rulesets": 0},
        "2024": {"races": 0, "classes": 0, "subclasses": 0, "backgrounds": 0, "feats": 0, "rulesets": 0}
    }
    
    for edition in ["2014", "2024"]:
        query = {'user_id': username, 'edition': edition}
        summary[edition]["rulesets"] = await db.user_rulesets.count_documents(query)
        summary[edition]["races"] = await db.user_races.count_documents(query)
        summary[edition]["classes"] = await db.user_classes.count_documents(query)
        summary[edition]["subclasses"] = await db.user_subclasses.count_documents(query)
        summary[edition]["backgrounds"] = await db.user_backgrounds.count_documents(query)
        summary[edition]["feats"] = await db.user_feats.count_documents(query)
    
    return summary


# ==================== PLAYER CHARACTER ROUTES ====================

@api_router.get("/characters")
async def get_user_characters(username: str = Depends(get_current_user)):
    """Get all characters owned by the current user"""
    characters = await db.player_characters.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)  # Limit to 100 characters per user
    return characters

@api_router.post("/characters", response_model=dict)
async def create_character(
    character: PlayerCharacterCreate,
    username: str = Depends(get_current_user)
):
    """Create a new player character"""
    # Check subscription tier limits
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free') if subscription else 'free'
    tier_limits = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Count existing characters owned by user
    character_count = await db.player_characters.count_documents({'user_id': username})
    
    # Check character limit (-1 means unlimited)
    character_limit = tier_limits.get('characters', 1)
    if character_limit != -1 and character_count >= character_limit:
        tier_name = tier_limits.get('name', 'Free')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "character_limit_reached",
                "message": f"Your {tier_name} plan allows {character_limit} character(s). Upgrade to Hero or Legendary for unlimited characters!",
                "current_count": character_count,
                "limit": character_limit,
                "upgrade_tier": "player"
            }
        )
    
    # Validate subclass selection based on edition and level
    edition = getattr(character, 'edition', '2014')
    if character.subclass:
        subclass_unlock_level = get_subclass_unlock_level(character.character_class, edition)
        if character.level < subclass_unlock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{character.character_class}s cannot select a subclass until level {subclass_unlock_level} in {edition} rules"
            )
    
    # Get proper hit die for class
    hit_die = HIT_DICE.get(character.character_class, 8)
    
    # Calculate max HP if not provided
    max_hp = character.max_hit_points
    if max_hp is None:
        constitution_modifier = (character.constitution - 10) // 2
        max_hp = hit_die + constitution_modifier
    
    # Calculate proficiency bonus based on level
    proficiency_bonus = 2 + ((character.level - 1) // 4)
    
    # Calculate AC from dexterity if not provided
    armor_class = character.armor_class
    if armor_class == 10:
        dexterity_modifier = (character.dexterity - 10) // 2
        armor_class = 10 + dexterity_modifier
    
    # Prepare character data, excluding fields that will be calculated or explicitly set
    char_data = character.model_dump()
    excluded_fields = ['max_hit_points', 'current_hit_points', 'proficiency_bonus', 'armor_class', 
                       'spells_known', 'spells_prepared', 'cantrips_known', 'feats', 'edition',
                       'portrait_url', 'campaign_id']
    char_data = {k: v for k, v in char_data.items() if k not in excluded_fields}
    
    # Normalize spell/cantrip inputs - ensure they are in object format
    def normalize_spell_list(spell_list):
        if not spell_list:
            return []
        return [
            s if isinstance(s, dict) else {"name": str(s), "level": 0}
            for s in spell_list
        ]
    
    normalized_spells_known = normalize_spell_list(character.spells_known)
    normalized_spells_prepared = normalize_spell_list(character.spells_prepared)
    normalized_cantrips = normalize_spell_list(character.cantrips_known)
    
    # Determine spellcasting ability based on class
    SPELLCASTING_ABILITIES = {
        'Bard': 'charisma', 'Cleric': 'wisdom', 'Druid': 'wisdom',
        'Paladin': 'charisma', 'Ranger': 'wisdom', 'Sorcerer': 'charisma',
        'Warlock': 'charisma', 'Wizard': 'intelligence',
        'Fighter': 'intelligence', 'Rogue': 'intelligence'  # For Eldritch Knight / Arcane Trickster
    }
    spellcasting_ability = SPELLCASTING_ABILITIES.get(character.character_class, '')
    
    new_character = PlayerCharacter(
        user_id=username,
        **char_data,
        max_hit_points=max_hp,
        current_hit_points=max_hp,
        proficiency_bonus=proficiency_bonus,
        armor_class=armor_class,
        hit_dice=f"1d{hit_die}",
        hit_dice_remaining=1,
        spells_known=normalized_spells_known,
        spells_prepared=normalized_spells_prepared,
        cantrips_known=normalized_cantrips,
        feats=character.feats or [],
        edition=edition,
        portrait_url=character.portrait_url or '',
        spellcasting_ability=spellcasting_ability
    )
    
    await db.player_characters.insert_one(new_character.model_dump())
    
    return {
        "success": True,
        "message": f"{new_character.name} created successfully!",
        "character_id": new_character.id,
        "character": new_character.model_dump()
    }

@api_router.get("/characters/{character_id}")
async def get_character(
    character_id: str,
    username: str = Depends(get_current_user)
):
    """Get a specific character"""
    character = await db.player_characters.find_one(
        {'id': character_id, 'user_id': username},
        {'_id': 0}
    )
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    return character

@api_router.put("/characters/{character_id}")
async def update_character(
    character_id: str,
    character_update: PlayerCharacterUpdate,
    username: str = Depends(get_current_user)
):
    """Update a character"""
    # Verify ownership
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    # Build update data
    update_data = {k: v for k, v in character_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Validate subclass selection based on edition and level
    if 'subclass' in update_data and update_data['subclass']:
        edition = existing.get('edition', '2014')
        character_class = update_data.get('character_class', existing.get('character_class'))
        level = update_data.get('level', existing.get('level', 1))
        subclass_unlock_level = get_subclass_unlock_level(character_class, edition)
        
        if level < subclass_unlock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{character_class}s cannot select a subclass until level {subclass_unlock_level} in {edition} rules"
            )
    
    # Add updated timestamp
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate derived stats if ability scores changed
    if any(key in update_data for key in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'level']):
        # Recalculate proficiency bonus
        level = update_data.get('level', existing.get('level', 1))
        update_data['proficiency_bonus'] = 2 + ((level - 1) // 4)
    
    result = await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    updated_character = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return updated_character


# Level Up Request Model
class LevelUpRequest(BaseModel):
    new_level: int
    choice_type: str  # "asi" or "feat"
    # For ASI: {"ability1": "strength", "ability2": "dexterity"} or {"ability1": "strength", "ability2": "strength"} for +2 to one
    asi_choices: Optional[Dict[str, str]] = None
    # For Feat: {"name": "Alert", "description": "..."}
    feat_choice: Optional[Dict[str, str]] = None
    # Optional HP roll result (if not using average)
    hp_roll: Optional[int] = None

@api_router.post("/characters/{character_id}/level-up")
async def level_up_character(
    character_id: str,
    level_up: LevelUpRequest,
    username: str = Depends(get_current_user)
):
    """Handle character level up with ASI or Feat choice"""
    # Verify ownership
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    current_level = existing.get('level', 1)
    
    # Validate level progression
    if level_up.new_level != current_level + 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only level up from {current_level} to {current_level + 1}"
        )
    
    if level_up.new_level > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum level is 20"
        )
    
    # ASI/Feat levels are typically 4, 8, 12, 16, 19 (with variations by class)
    asi_levels = [4, 8, 12, 16, 19]  # Standard ASI levels
    # Fighters get extra at 6, 14; Rogues at 10
    fighter_extra_asi = [6, 14]
    rogue_extra_asi = [10]
    
    char_class = existing.get('character_class', '').lower()
    all_asi_levels = asi_levels.copy()
    if char_class == 'fighter':
        all_asi_levels.extend(fighter_extra_asi)
    elif char_class == 'rogue':
        all_asi_levels.extend(rogue_extra_asi)
    all_asi_levels.sort()
    
    is_asi_level = level_up.new_level in all_asi_levels
    
    # Build update data
    update_data = {
        'level': level_up.new_level,
        'proficiency_bonus': 2 + ((level_up.new_level - 1) // 4),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate HP increase
    hit_die_map = {
        'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
        'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8, 'rogue': 8, 'warlock': 8,
        'sorcerer': 6, 'wizard': 6
    }
    hit_die = hit_die_map.get(char_class, 8)
    con_mod = (existing.get('constitution', 10) - 10) // 2
    
    if level_up.hp_roll is not None:
        # Use rolled value (bounded to valid range)
        hp_increase = max(1, min(level_up.hp_roll, hit_die)) + con_mod
    else:
        # Use average (round up)
        hp_increase = (hit_die // 2 + 1) + con_mod
    
    hp_increase = max(1, hp_increase)  # Minimum 1 HP per level
    update_data['max_hit_points'] = existing.get('max_hit_points', 10) + hp_increase
    update_data['current_hit_points'] = update_data['max_hit_points']  # Heal to full on level up
    update_data['hit_dice'] = f"{level_up.new_level}d{hit_die}"
    update_data['hit_dice_remaining'] = level_up.new_level
    
    # Handle ASI/Feat choice if at appropriate level
    level_progression = existing.get('level_progression', {})
    asi_increases = existing.get('asi_increases', {})
    feats = existing.get('feats', [])
    
    if is_asi_level:
        if level_up.choice_type == 'asi' and level_up.asi_choices:
            # Apply ASI (+1 to two abilities or +2 to one)
            ability1 = level_up.asi_choices.get('ability1')
            ability2 = level_up.asi_choices.get('ability2')
            
            if ability1:
                current_score1 = existing.get(ability1, 10)
                new_score1 = min(20, current_score1 + 1)
                update_data[ability1] = new_score1
                asi_increases[ability1] = asi_increases.get(ability1, 0) + 1
            
            if ability2:
                current_score2 = existing.get(ability2, 10)
                # If same ability, check it wasn't already maxed
                if ability2 == ability1:
                    current_score2 = update_data.get(ability1, current_score2)
                new_score2 = min(20, current_score2 + 1)
                update_data[ability2] = new_score2
                asi_increases[ability2] = asi_increases.get(ability2, 0) + 1
            
            level_progression[str(level_up.new_level)] = {
                'type': 'asi',
                'choices': level_up.asi_choices,
                'hp_gained': hp_increase
            }
            
        elif level_up.choice_type == 'feat' and level_up.feat_choice:
            # Add feat
            new_feat = {
                'name': level_up.feat_choice.get('name', 'Unknown Feat'),
                'description': level_up.feat_choice.get('description', '')
            }
            feats.append(new_feat)
            update_data['feats'] = feats
            
            level_progression[str(level_up.new_level)] = {
                'type': 'feat',
                'feat_name': new_feat['name'],
                'hp_gained': hp_increase
            }
    else:
        # Not an ASI level, just record the level up
        level_progression[str(level_up.new_level)] = {
            'type': 'standard',
            'hp_gained': hp_increase
        }
    
    update_data['level_progression'] = level_progression
    update_data['asi_increases'] = asi_increases
    
    # Calculate spell slots for spellcasters
    spellcaster_config = {
        'bard': {'ability': 'charisma', 'type': 'full'},
        'cleric': {'ability': 'wisdom', 'type': 'full'},
        'druid': {'ability': 'wisdom', 'type': 'full'},
        'sorcerer': {'ability': 'charisma', 'type': 'full'},
        'wizard': {'ability': 'intelligence', 'type': 'full'},
        'paladin': {'ability': 'charisma', 'type': 'half', 'start_level': 2},
        'ranger': {'ability': 'wisdom', 'type': 'half', 'start_level': 2},
        'warlock': {'ability': 'charisma', 'type': 'pact'},
    }
    
    if char_class in spellcaster_config:
        config = spellcaster_config[char_class]
        update_data['spellcasting_ability'] = config['ability']
        
        # Full caster spell slots table (level -> slots per spell level)
        full_caster_slots = {
            1: {1: 2}, 2: {1: 3}, 3: {1: 4, 2: 2}, 4: {1: 4, 2: 3},
            5: {1: 4, 2: 3, 3: 2}, 6: {1: 4, 2: 3, 3: 3}, 7: {1: 4, 2: 3, 3: 3, 4: 1},
            8: {1: 4, 2: 3, 3: 3, 4: 2}, 9: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
            10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}, 11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
            12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1}, 13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
            14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1}, 15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
            16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1}, 17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
            18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1}, 19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1},
            20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1}
        }
        
        # Half caster spell slots (paladin/ranger) - use half level (round down) for slot table
        half_caster_slots = {
            2: {1: 2}, 3: {1: 3}, 4: {1: 3}, 5: {1: 4, 2: 2}, 6: {1: 4, 2: 2}, 7: {1: 4, 2: 3},
            8: {1: 4, 2: 3}, 9: {1: 4, 2: 3, 3: 2}, 10: {1: 4, 2: 3, 3: 2}, 11: {1: 4, 2: 3, 3: 3},
            12: {1: 4, 2: 3, 3: 3}, 13: {1: 4, 2: 3, 3: 3, 4: 1}, 14: {1: 4, 2: 3, 3: 3, 4: 1},
            15: {1: 4, 2: 3, 3: 3, 4: 2}, 16: {1: 4, 2: 3, 3: 3, 4: 2}, 17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
            18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1}, 19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}, 20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}
        }
        
        # Warlock pact magic slots (all same level, limited slots)
        warlock_slots = {
            1: {1: 1}, 2: {1: 2}, 3: {2: 2}, 4: {2: 2}, 5: {3: 2}, 6: {3: 2}, 7: {4: 2}, 8: {4: 2},
            9: {5: 2}, 10: {5: 2}, 11: {5: 3}, 12: {5: 3}, 13: {5: 3}, 14: {5: 3}, 15: {5: 3},
            16: {5: 3}, 17: {5: 4}, 18: {5: 4}, 19: {5: 4}, 20: {5: 4}
        }
        
        slot_table = full_caster_slots if config['type'] == 'full' else (warlock_slots if config['type'] == 'pact' else half_caster_slots)
        
        # Get slots for current level
        if level_up.new_level in slot_table:
            slots = slot_table[level_up.new_level]
            for spell_level, num_slots in slots.items():
                update_data[f'spell_slots_{spell_level}'] = num_slots
                # Reset used slots on level up (restore all)
                update_data[f'spell_slots_{spell_level}_used'] = 0

    # Update character
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update_data}
    )
    
    updated_character = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return {
        'character': updated_character,
        'level_up_summary': {
            'new_level': level_up.new_level,
            'hp_gained': hp_increase,
            'is_asi_level': is_asi_level,
            'choice_made': level_up.choice_type if is_asi_level else None
        }
    }


@api_router.delete("/characters/{character_id}")
async def delete_character(
    character_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a character"""
    result = await db.player_characters.delete_one({
        'id': character_id,
        'user_id': username
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    return {"message": "Character deleted successfully"}

@api_router.get("/characters/{character_id}/level-up-info")
async def get_level_up_info(
    character_id: str,
    username: str = Depends(get_current_user)
):
    """Get edition-aware level-up information for a character"""
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    current_level = character.get('level', 1)
    next_level = current_level + 1
    character_class = character.get('character_class', '')
    edition = character.get('edition', '2014')
    
    # Get subclass unlock level for this edition
    subclass_unlock_level = get_subclass_unlock_level(character_class, edition)
    can_choose_subclass = next_level >= subclass_unlock_level
    needs_subclass = can_choose_subclass and not character.get('subclass')
    
    # ASI levels
    asi_levels = [4, 8, 12, 16, 19]
    if character_class.lower() == 'fighter':
        asi_levels.extend([6, 14])
    elif character_class.lower() == 'rogue':
        asi_levels.append(10)
    asi_levels.sort()
    
    is_asi_level = next_level in asi_levels
    
    # Hit die for HP calculation
    hit_die = HIT_DICE.get(character_class, 8)
    con_mod = (character.get('constitution', 10) - 10) // 2
    average_hp_gain = (hit_die // 2 + 1) + con_mod
    
    return {
        'current_level': current_level,
        'next_level': next_level,
        'can_level_up': next_level <= 20,
        'edition': edition,
        'subclass_info': {
            'unlock_level': subclass_unlock_level,
            'can_choose_now': can_choose_subclass,
            'needs_selection': needs_subclass,
            'current_subclass': character.get('subclass', '')
        },
        'asi_info': {
            'is_asi_level': is_asi_level,
            'all_asi_levels': asi_levels
        },
        'hp_info': {
            'hit_die': f"d{hit_die}",
            'average_gain': max(1, average_hp_gain),
            'constitution_modifier': con_mod
        }
    }

@api_router.post("/characters/{character_id}/link-campaign")
async def link_character_to_campaign(
    character_id: str,
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Link a character to a campaign (for future use)"""
    # Verify character ownership
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    # Verify campaign exists (this will be more complex with player permissions later)
    campaign = await db.campaigns.find_one({'id': campaign_id})
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Link character to campaign
    await db.player_characters.update_one(
        {'id': character_id},
        {'$set': {'campaign_id': campaign_id, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Character linked to campaign: {campaign.get('name')}",
        "campaign_id": campaign_id
    }

@api_router.get("/campaigns/{campaign_id}/join-code")
async def get_campaign_join_code(
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Generate or retrieve a campaign join code for players"""
    await verify_campaign_ownership(campaign_id, username)
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Generate 6-character join code if not exists
    join_code = campaign.get('join_code')
    if not join_code:
        import random
        import string
        join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        await db.campaigns.update_one(
            {'id': campaign_id},
            {'$set': {'join_code': join_code}}
        )
    
    return {
        "join_code": join_code,
        "campaign_name": campaign.get('name'),
        "campaign_id": campaign_id
    }

@api_router.post("/campaigns/join")
async def join_campaign_with_code(
    request: CampaignJoinRequest,
    username: str = Depends(get_current_user)
):
    """Join a campaign using a join code"""
    # Find campaign by join code
    campaign = await db.campaigns.find_one({'join_code': request.join_code}, {'_id': 0})
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid join code. Please check and try again."
        )
    
    # Verify character ownership
    character = await db.player_characters.find_one({
        'id': request.character_id,
        'user_id': username
    })
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    
    # Check if character is already linked to another campaign
    if character.get('campaign_id') and character.get('campaign_id') != campaign['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Character is already linked to another campaign. Unlink first."
        )
    
    # Link character to campaign
    await db.player_characters.update_one(
        {'id': request.character_id},
        {'$set': {
            'campaign_id': campaign['id'],
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Successfully joined campaign: {campaign['name']}",
        "campaign": {
            "id": campaign['id'],
            "name": campaign['name'],
            "system": campaign.get('system', '5e 2024'),
            "dm": campaign.get('dm_user_id')
        }
    }

@api_router.get("/campaigns/{campaign_id}/players")
async def get_campaign_players(
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Get all player characters linked to this campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Get all characters linked to this campaign
    characters = await db.player_characters.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).to_list(50)  # Limit to 50 players per campaign
    
    return {
        "count": len(characters),
        "players": characters
    }

@api_router.get("/player/campaigns")
async def get_player_campaigns(username: str = Depends(get_current_user)):
    """Get all campaigns the current user has joined as a player"""
    # Find all characters belonging to this user that are in campaigns
    characters = await db.player_characters.find(
        {'user_id': username, 'campaign_id': {'$ne': None}},
        {'_id': 0, 'campaign_id': 1}
    ).to_list(50)
    
    campaign_ids = list(set([c['campaign_id'] for c in characters if c.get('campaign_id')]))
    
    if not campaign_ids:
        return []
    
    # Fetch campaign details
    campaigns = await db.campaigns.find(
        {'id': {'$in': campaign_ids}},
        {'_id': 0, 'id': 1, 'name': 1, 'system': 1, 'dm_user_id': 1}
    ).to_list(50)
    
    # Add GM name to each campaign
    for campaign in campaigns:
        user = await db.users.find_one(
            {'username': campaign.get('dm_user_id')},
            {'_id': 0, 'username': 1}
        )
        campaign['gm_name'] = user.get('username') if user else 'Unknown'
    
    return campaigns

@api_router.get("/player/campaign/{campaign_id}/inventory")
async def get_player_inventory(
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Get inventory items assigned to the current player in a campaign"""
    # First verify the player has a character in this campaign
    character = await db.player_characters.find_one(
        {'user_id': username, 'campaign_id': campaign_id},
        {'_id': 0}
    )
    
    if not character:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have a character in this campaign"
        )
    
    # Get items assigned to this player
    items = await db.inventory.find(
        {'campaign_id': campaign_id, 'assigned_to': character.get('id')},
        {'_id': 0}
    ).to_list(100)
    
    return items

# ==================== PLAYER JOURNAL ENDPOINTS ====================

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    character_id: Optional[str] = None
    campaign_id: Optional[str] = None
    title: str
    content: str = ""
    type: str = "session"  # session, combat, npc, location, loot, note
    session_number: Optional[int] = None
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class JournalEntryCreate(BaseModel):
    character_id: Optional[str] = None
    campaign_id: Optional[str] = None
    title: str
    content: str = ""
    type: str = "session"
    session_number: Optional[int] = None
    tags: List[str] = []

@api_router.get("/player/journal")
async def get_journal_entries(
    character_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    username: str = Depends(get_current_user)
):
    """Get journal entries for a character or campaign"""
    query = {'user_id': username}
    
    if character_id:
        query['character_id'] = character_id
    if campaign_id:
        query['campaign_id'] = campaign_id
    
    entries = await db.player_journal.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return entries

@api_router.post("/player/journal")
async def create_journal_entry(
    entry_data: JournalEntryCreate,
    username: str = Depends(get_current_user)
):
    """Create a new journal entry"""
    entry = JournalEntry(
        character_id=entry_data.character_id,
        campaign_id=entry_data.campaign_id,
        title=entry_data.title,
        content=entry_data.content,
        type=entry_data.type,
        session_number=entry_data.session_number,
        tags=entry_data.tags
    )
    
    entry_dict = entry.model_dump()
    entry_dict['user_id'] = username
    
    await db.player_journal.insert_one(entry_dict)
    return {k: v for k, v in entry_dict.items() if k != '_id'}

@api_router.put("/player/journal/{entry_id}")
async def update_journal_entry(
    entry_id: str,
    entry_data: JournalEntryCreate,
    username: str = Depends(get_current_user)
):
    """Update a journal entry"""
    result = await db.player_journal.update_one(
        {'id': entry_id, 'user_id': username},
        {'$set': {
            'title': entry_data.title,
            'content': entry_data.content,
            'type': entry_data.type,
            'session_number': entry_data.session_number,
            'tags': entry_data.tags,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": "Entry updated"}

@api_router.delete("/player/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a journal entry"""
    result = await db.player_journal.delete_one({'id': entry_id, 'user_id': username})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": "Entry deleted"}

@api_router.post("/ai/generate-character")
async def ai_generate_character(
    request: AICharacterGenerateRequest,
    username: str = Depends(get_current_user)
):
    """
    AI Character Generator: Create a complete character from a description.
    The Unseen Servant manifests your character concept into reality.
    """
    # Check AI usage limits
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail={
                "error": "ai_limit_reached",
                "message": "You've reached your monthly AI generation limit. Upgrade for more AI calls!",
                "upgrade_tier": "player"
            }
        )
    
    description = request.description.strip()
    
    if not description or len(description) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description too short. Please provide at least 10 characters."
        )
    
    system_message = """You are the Unseen Servant, a magical assistant for tabletop RPG players.
Your task is to create a complete character based on the player's description.

Generate a character with:
- Appropriate race, class, and background
- Balanced ability scores (use point buy: 8-15 range, total ~72 points)
- Fitting alignment
- Personality traits, ideals, bonds, and flaws
- A compelling backstory that matches their concept

Respond in valid JSON format only. No markdown, no explanations."""

    user_prompt = f"""Player's Character Concept:
"{description}"

Create a character based on this description. Return JSON in this EXACT format:
{{
  "name": "Character name that fits the concept",
  "race": "One of: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling",
  "character_class": "One of: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard",
  "subclass": "Appropriate subclass or empty string",
  "background": "One of: Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin",
  "level": 1,
  "alignment": "One of the 9 alignments",
  "strength": 10,
  "dexterity": 10,
  "constitution": 10,
  "intelligence": 10,
  "wisdom": 10,
  "charisma": 10,
  "personality_traits": "2-3 sentences describing personality quirks",
  "ideals": "What this character believes in",
  "bonds": "Who or what this character cares about",
  "flaws": "A character flaw or weakness",
  "backstory": "3-4 paragraphs telling their story and how they became an adventurer"
}}

Make ability scores appropriate for the class (e.g., high STR for Fighter, high INT for Wizard).
Use point buy values (8-15 before racial modifiers, total around 72 points)."""

    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        # Initialize chat with correct API
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"char-gen-{username}-{uuid.uuid4().hex[:8]}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Create message and send
        user_msg = UserMessage(text=user_prompt)
        response = await chat.send_message(user_msg)
        
        response_text = response.strip() if isinstance(response, str) else str(response)
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        character_data = json.loads(response_text)
        
        # Increment AI usage counter on success
        await increment_ai_usage(username)
        
        return {
            "success": True,
            "character": character_data,
            "message": f"✨ {character_data.get('name', 'Your character')} has been manifested by the Unseen Servant!"
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI character response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned invalid format. Please try again with a more specific description."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI character generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate character: {str(e)}"
        )

class PortraitGenerateRequest(BaseModel):
    name: str
    race: str
    character_class: str
    gender: str = "neutral"
    appearance: str = ""

@api_router.post("/ai/generate-portrait")
async def ai_generate_portrait(
    request: PortraitGenerateRequest,
    username: str = Depends(get_current_user)
):
    """
    AI Portrait Generator: Create a character portrait image.
    Returns base64 encoded image data.
    """
    # Check AI usage limits
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail={
                "error": "ai_limit_reached",
                "message": "You've reached your monthly AI generation limit. Upgrade for more AI calls!",
                "upgrade_tier": "player"
            }
        )
    
    # Build portrait prompt
    appearance_desc = request.appearance if request.appearance else "fantasy adventurer"
    
    portrait_prompt = f"""Fantasy character portrait, RPG style digital art:
A {request.gender} {request.race} {request.character_class} named {request.name}.
{appearance_desc}
High quality fantasy illustration, detailed face, dramatic lighting, 
medieval fantasy style, painterly, heroic pose, portrait framing.
No text, no watermarks, professional fantasy art."""

    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        image_gen = OpenAIImageGeneration(api_key=llm_key)
        images = await image_gen.generate_images(
            prompt=portrait_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            # Increment AI usage counter on success
            await increment_ai_usage(username)
            return {
                "success": True,
                "image_base64": image_base64,
                "message": f"Portrait of {request.name} created!"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No image was generated"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portrait generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate portrait: {str(e)}"
        )

# ==================== COMBAT TOKEN GENERATION ====================

class TokenGenerateRequest(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str = "enemy"  # player, ally, enemy
    campaign_id: str
    prompt: Optional[str] = None

@api_router.post("/ai/generate-token")
async def ai_generate_token(
    request: TokenGenerateRequest,
    username: str = Depends(get_current_user)
):
    """
    AI Token Generator: Create a circular battle map token for a creature.
    Stores the token in DB and returns URL.
    """
    # Build token prompt
    token_prompt = request.prompt or f"""Circular fantasy RPG battle map token portrait of {request.entity_name}, 
    {request.entity_type} creature, dramatic lighting, detailed, dark fantasy style, 
    facing forward, head and shoulders only, suitable for tabletop RPG battle map token,
    circular frame, high contrast, no background, professional fantasy game art."""

    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        image_gen = OpenAIImageGeneration(api_key=llm_key)
        images = await image_gen.generate_images(
            prompt=token_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            
            # Store token in database
            token_doc = {
                'id': str(uuid.uuid4()),
                'entity_id': request.entity_id,
                'entity_name': request.entity_name,
                'entity_type': request.entity_type,
                'campaign_id': request.campaign_id,
                'image_base64': image_base64,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'created_by': username
            }
            
            # Upsert - update if exists, insert if not
            await db.combat_tokens.update_one(
                {'entity_id': request.entity_id, 'campaign_id': request.campaign_id},
                {'$set': token_doc},
                upsert=True
            )
            
            return {
                "success": True,
                "image_url": f"data:image/png;base64,{image_base64}",
                "entity_id": request.entity_id,
                "message": f"Token created for {request.entity_name}!"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No image was generated"
            )
            
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate token: {str(e)}"
        )

@api_router.get("/campaigns/{campaign_id}/tokens")
async def get_campaign_tokens(
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Get all combat tokens for a campaign"""
    tokens = await db.combat_tokens.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'image_base64': 0}  # Don't return full base64 in list
    ).to_list(200)
    
    # Return tokens with image URLs
    result = []
    for token in tokens:
        token_data = await db.combat_tokens.find_one(
            {'id': token['id']},
            {'_id': 0}
        )
        if token_data and token_data.get('image_base64'):
            token['image_url'] = f"data:image/png;base64,{token_data['image_base64']}"
        result.append(token)
    
    return result

@api_router.get("/campaigns/{campaign_id}/tokens/{entity_id}")
async def get_entity_token(
    campaign_id: str,
    entity_id: str,
    username: str = Depends(get_current_user)
):
    """Get a specific combat token"""
    token = await db.combat_tokens.find_one(
        {'entity_id': entity_id, 'campaign_id': campaign_id},
        {'_id': 0}
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    if token.get('image_base64'):
        token['image_url'] = f"data:image/png;base64,{token['image_base64']}"
        del token['image_base64']  # Don't expose raw base64
    
    return token

# ==================== SRD DATA API ====================

# Load SRD data at startup
SRD_DATA_PATH = ROOT_DIR / 'data' / 'srd'

def load_srd_file(filename):
    """Load a JSON file from the SRD data directory"""
    try:
        filepath = SRD_DATA_PATH / filename
        if filepath.exists():
            with open(filepath, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load SRD file {filename}: {e}")
    return None

@api_router.get("/srd/spells")
async def get_srd_spells(
    level: Optional[int] = None,
    school: Optional[str] = None,
    class_name: Optional[str] = None,
    search: Optional[str] = None
):
    """Get SRD spells with optional filtering"""
    data = load_srd_file('spells.json')
    if not data:
        return {"spells": [], "source": "SRD 5.1"}
    
    spells = data.get('spells', [])
    
    # Apply filters
    if level is not None:
        spells = [s for s in spells if s.get('level') == level]
    
    if school:
        spells = [s for s in spells if s.get('school', '').lower() == school.lower()]
    
    if class_name:
        class_lower = class_name.lower()
        spells = [s for s in spells if class_lower in [c.lower() for c in s.get('classes', [])]]
    
    if search:
        search_lower = search.lower()
        spells = [s for s in spells if search_lower in s.get('name', '').lower() or search_lower in s.get('description', '').lower()]
    
    return {
        "spells": spells,
        "count": len(spells),
        "source": "SRD 5.1 - Open Gaming License"
    }

@api_router.get("/srd/spells/{spell_name}")
async def get_srd_spell(spell_name: str):
    """Get a specific spell by name"""
    data = load_srd_file('spells.json')
    if not data:
        raise HTTPException(status_code=404, detail="Spell not found")
    
    spell_lower = spell_name.lower().replace('-', ' ').replace('_', ' ')
    for spell in data.get('spells', []):
        if spell.get('name', '').lower() == spell_lower:
            return spell
    
    raise HTTPException(status_code=404, detail="Spell not found")

@api_router.get("/srd/classes")
async def get_srd_classes():
    """Get all SRD classes with features"""
    data = load_srd_file('classes.json')
    if not data:
        return {"classes": [], "source": "SRD 5.1"}
    
    return {
        "classes": data.get('classes', []),
        "source": "SRD 5.1 - Open Gaming License"
    }

@api_router.get("/srd/classes/{class_name}")
async def get_srd_class(class_name: str):
    """Get a specific class by name"""
    data = load_srd_file('classes.json')
    if not data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_lower = class_name.lower()
    for cls in data.get('classes', []):
        if cls.get('name', '').lower() == class_lower:
            return cls
    
    raise HTTPException(status_code=404, detail="Class not found")

@api_router.get("/srd/races")
async def get_srd_races():
    """Get all SRD races"""
    data = load_srd_file('classes.json')  # Races are in the same file
    if not data:
        return {"races": [], "source": "SRD 5.1"}
    
    return {
        "races": data.get('races', []),
        "source": "SRD 5.1 - Open Gaming License"
    }

@api_router.get("/srd/feats")
async def get_srd_feats():
    """Get all SRD feats"""
    data = load_srd_file('classes.json')  # Feats are in the same file
    if not data:
        return {"feats": [], "source": "SRD 5.1"}
    
    return {
        "feats": data.get('feats', []),
        "source": "SRD 5.1 - Open Gaming License"
    }

@api_router.get("/srd/class-features/{class_name}/{level}")
async def get_class_features_at_level(class_name: str, level: int):
    """Get class features available at a specific level"""
    data = load_srd_file('classes.json')
    if not data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_lower = class_name.lower()
    for cls in data.get('classes', []):
        if cls.get('name', '').lower() == class_lower:
            features = [f for f in cls.get('features', []) if f.get('level', 1) <= level]
            return {
                "class": cls.get('name'),
                "level": level,
                "features": features
            }
    
    raise HTTPException(status_code=404, detail="Class not found")


# ==================== MODULAR PROGRESSION SYSTEM ENDPOINTS ====================

@api_router.get("/progression/systems")
async def get_rule_systems():
    """Get all available rule systems"""
    systems = await db.rule_systems.find({}, {'_id': 0}).to_list(100)
    if not systems:
        # Return default 5e system if none exist
        default_system = {
            "id": "5e-srd",
            "name": "5e SRD",
            "version": "5.1",
            "description": "Fifth Edition System Reference Document",
            "max_level": 20,
            "ability_scores": ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
        }
        return {"systems": [default_system]}
    return {"systems": systems}

@api_router.post("/progression/systems")
async def create_rule_system(system: RuleSystem, username: str = Depends(get_current_user)):
    """Create a new rule system (admin only)"""
    system_dict = system.model_dump()
    system_dict['created_by'] = username
    await db.rule_systems.insert_one(system_dict)
    return {"success": True, "system": system_dict}

@api_router.get("/progression/classes")
async def get_progression_classes(system_id: Optional[str] = None):
    """Get all classes, optionally filtered by system"""
    query = {}
    if system_id:
        query['system_id'] = system_id
    classes = await db.progression_classes.find(query, {'_id': 0}).to_list(100)
    return {"classes": classes}

@api_router.get("/progression/classes/{class_id}")
async def get_progression_class(class_id: str):
    """Get a specific class with all its level progressions"""
    cls = await db.progression_classes.find_one({'id': class_id}, {'_id': 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get level progressions for this class
    progressions = await db.class_level_progressions.find(
        {'class_id': class_id}, {'_id': 0}
    ).sort('level', 1).to_list(20)
    
    cls['level_progressions'] = progressions
    return cls

@api_router.post("/progression/classes")
async def create_progression_class(cls: ProgressionClass, username: str = Depends(get_current_user)):
    """Create a new class definition"""
    cls_dict = cls.model_dump()
    cls_dict['created_by'] = username
    await db.progression_classes.insert_one(cls_dict)
    return {"success": True, "class": cls_dict}

@api_router.get("/progression/races")
async def get_progression_races(system_id: Optional[str] = None):
    """Get all races, optionally filtered by system"""
    query = {}
    if system_id:
        query['system_id'] = system_id
    races = await db.progression_races.find(query, {'_id': 0}).to_list(100)
    return {"races": races}

@api_router.post("/progression/races")
async def create_progression_race(race: ProgressionRace, username: str = Depends(get_current_user)):
    """Create a new race definition"""
    race_dict = race.model_dump()
    race_dict['created_by'] = username
    await db.progression_races.insert_one(race_dict)
    return {"success": True, "race": race_dict}

@api_router.get("/progression/features")
async def get_progression_features(
    system_id: Optional[str] = None,
    source_type: Optional[str] = None,
    source_id: Optional[str] = None
):
    """Get features with optional filters"""
    query = {}
    if system_id:
        query['system_id'] = system_id
    if source_type:
        query['source_type'] = source_type
    if source_id:
        query['source_id'] = source_id
    
    features = await db.progression_features.find(query, {'_id': 0}).to_list(500)
    return {"features": features}

@api_router.post("/progression/features")
async def create_progression_feature(feature: ProgressionFeature, username: str = Depends(get_current_user)):
    """Create a new feature"""
    feature_dict = feature.model_dump()
    feature_dict['created_by'] = username
    await db.progression_features.insert_one(feature_dict)
    return {"success": True, "feature": feature_dict}

@api_router.get("/progression/feature-choices/{feature_id}")
async def get_feature_choices(feature_id: str):
    """Get all choices available for a feature"""
    choices = await db.feature_choices.find({'feature_id': feature_id}, {'_id': 0}).to_list(100)
    return {"choices": choices}

@api_router.post("/progression/feature-choices")
async def create_feature_choice(choice: FeatureChoice, username: str = Depends(get_current_user)):
    """Create a new feature choice"""
    choice_dict = choice.model_dump()
    choice_dict['created_by'] = username
    await db.feature_choices.insert_one(choice_dict)
    return {"success": True, "choice": choice_dict}

@api_router.get("/progression/class-level/{class_id}/{level}")
async def get_class_level_progression(class_id: str, level: int):
    """Get what a class gains at a specific level"""
    progression = await db.class_level_progressions.find_one(
        {'class_id': class_id, 'level': level}, {'_id': 0}
    )
    
    if not progression:
        # Return default progression if not customized
        progression = {
            'class_id': class_id,
            'level': level,
            'features': [],
            'choice_groups': [],
            'proficiency_bonus': 2 + ((level - 1) // 4)
        }
    
    # Fetch full feature details
    if progression.get('features'):
        features = await db.progression_features.find(
            {'id': {'$in': progression['features']}}, {'_id': 0}
        ).to_list(50)
        progression['feature_details'] = features
    
    # Fetch choice details
    if progression.get('choice_groups'):
        choices = await db.feature_choices.find(
            {'id': {'$in': progression['choice_groups']}}, {'_id': 0}
        ).to_list(50)
        progression['choice_details'] = choices
    
    return progression

@api_router.post("/progression/class-levels")
async def create_class_level_progression(
    progression: ClassLevelProgression, 
    username: str = Depends(get_current_user)
):
    """Create or update class level progression"""
    prog_dict = progression.model_dump()
    prog_dict['created_by'] = username
    
    # Upsert to allow updates
    await db.class_level_progressions.update_one(
        {'class_id': progression.class_id, 'level': progression.level},
        {'$set': prog_dict},
        upsert=True
    )
    return {"success": True, "progression": prog_dict}

@api_router.get("/progression/level-up-wizard/{character_id}")
async def get_level_up_wizard(character_id: str, username: str = Depends(get_current_user)):
    """Get the level-up wizard state for a character"""
    # Verify ownership
    character = await db.player_characters.find_one(
        {'id': character_id, 'user_id': username}, {'_id': 0}
    )
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    current_level = character.get('level', 1)
    target_level = current_level + 1
    char_class = character.get('character_class', '').lower()
    
    # Determine what choices are needed at this level
    # Standard ASI levels
    asi_levels = [4, 8, 12, 16, 19]
    if char_class == 'fighter':
        asi_levels.extend([6, 14])
    elif char_class == 'rogue':
        asi_levels.append(10)
    asi_levels.sort()
    
    is_asi_level = target_level in asi_levels
    
    # Build wizard state
    pending_choices = []
    
    # HP choice
    pending_choices.append({
        "choice_type": "hp",
        "name": "Hit Points",
        "description": "Choose how to gain HP for this level",
        "options": [
            {"id": "average", "name": "Take Average", "value": "average"},
            {"id": "roll", "name": "Roll Hit Die", "value": "roll"}
        ]
    })
    
    # ASI/Feat choice at appropriate levels
    if is_asi_level:
        pending_choices.append({
            "choice_type": "asi_or_feat",
            "name": "Ability Score Improvement",
            "description": "Increase ability scores or select a feat",
            "options": [
                {"id": "asi", "name": "Ability Score Improvement", "description": "+2 to one ability or +1 to two abilities"},
                {"id": "feat", "name": "Select a Feat", "description": "Choose a feat from the available list"}
            ]
        })
    
    # Check for subclass selection (usually level 3)
    subclass_levels = {
        'barbarian': 3, 'bard': 3, 'cleric': 1, 'druid': 2,
        'fighter': 3, 'monk': 3, 'paladin': 3, 'ranger': 3,
        'rogue': 3, 'sorcerer': 1, 'warlock': 1, 'wizard': 2
    }
    subclass_level = subclass_levels.get(char_class, 3)
    
    if target_level == subclass_level and not character.get('subclass'):
        pending_choices.append({
            "choice_type": "subclass",
            "name": "Choose Subclass",
            "description": f"Select your {char_class.title()} subclass/archetype",
            "options": []  # Would be populated from progression data
        })
    
    # Get class-specific level features
    class_progression = await db.class_level_progressions.find_one(
        {'class_id': char_class, 'level': target_level}, {'_id': 0}
    )
    
    pending_features = []
    if class_progression and class_progression.get('features'):
        features = await db.progression_features.find(
            {'id': {'$in': class_progression['features']}}, {'_id': 0}
        ).to_list(50)
        pending_features = features
    
    wizard_state = {
        "character_id": character_id,
        "character_name": character.get('name'),
        "character_class": character.get('character_class'),
        "current_level": current_level,
        "target_level": target_level,
        "is_asi_level": is_asi_level,
        "pending_features": pending_features,
        "pending_choices": pending_choices,
        "hit_die": {
            'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
            'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8, 'rogue': 8, 'warlock': 8,
            'sorcerer': 6, 'wizard': 6
        }.get(char_class, 8),
        "proficiency_bonus": 2 + ((target_level - 1) // 4)
    }
    
    return wizard_state

@api_router.post("/progression/character-features")
async def save_character_feature_selection(
    selection: CharacterFeatureSelection,
    username: str = Depends(get_current_user)
):
    """Save a character's feature selection"""
    # Verify ownership
    character = await db.player_characters.find_one(
        {'id': selection.character_id, 'user_id': username}
    )
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    selection_dict = selection.model_dump()
    await db.character_features.insert_one(selection_dict)
    return {"success": True, "selection": selection_dict}

@api_router.get("/progression/character-features/{character_id}")
async def get_character_features(character_id: str, username: str = Depends(get_current_user)):
    """Get all feature selections for a character"""
    # Verify ownership
    character = await db.player_characters.find_one(
        {'id': character_id, 'user_id': username}
    )
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    features = await db.character_features.find(
        {'character_id': character_id, 'is_active': True}, {'_id': 0}
    ).to_list(100)
    
    return {"features": features}

@api_router.post("/progression/seed-default-data")
async def seed_default_progression_data(username: str = Depends(get_current_user)):
    """Seed the database with default 5e progression data"""
    # Check if admin
    admin_users = ['rookiequestadmin', 'criticalfusion', 'admin']
    if not any(admin in username.lower() for admin in admin_users):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create default 5e system
    default_system = {
        "id": "5e-srd",
        "name": "5e SRD",
        "version": "5.1",
        "description": "Fifth Edition System Reference Document",
        "max_level": 20,
        "ability_scores": ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rule_systems.update_one({'id': '5e-srd'}, {'$set': default_system}, upsert=True)
    
    # Create default classes
    classes_data = [
        {"id": "5e-fighter", "system_id": "5e-srd", "name": "Fighter", "hit_die": 10, "primary_ability": "strength", "saving_throw_proficiencies": ["strength", "constitution"], "skill_choices": 2, "subclass_level": 3},
        {"id": "5e-wizard", "system_id": "5e-srd", "name": "Wizard", "hit_die": 6, "primary_ability": "intelligence", "saving_throw_proficiencies": ["intelligence", "wisdom"], "skill_choices": 2, "subclass_level": 2},
        {"id": "5e-rogue", "system_id": "5e-srd", "name": "Rogue", "hit_die": 8, "primary_ability": "dexterity", "saving_throw_proficiencies": ["dexterity", "intelligence"], "skill_choices": 4, "subclass_level": 3},
        {"id": "5e-cleric", "system_id": "5e-srd", "name": "Cleric", "hit_die": 8, "primary_ability": "wisdom", "saving_throw_proficiencies": ["wisdom", "charisma"], "skill_choices": 2, "subclass_level": 1},
        {"id": "5e-barbarian", "system_id": "5e-srd", "name": "Barbarian", "hit_die": 12, "primary_ability": "strength", "saving_throw_proficiencies": ["strength", "constitution"], "skill_choices": 2, "subclass_level": 3},
        {"id": "5e-bard", "system_id": "5e-srd", "name": "Bard", "hit_die": 8, "primary_ability": "charisma", "saving_throw_proficiencies": ["dexterity", "charisma"], "skill_choices": 3, "subclass_level": 3},
        {"id": "5e-druid", "system_id": "5e-srd", "name": "Druid", "hit_die": 8, "primary_ability": "wisdom", "saving_throw_proficiencies": ["intelligence", "wisdom"], "skill_choices": 2, "subclass_level": 2},
        {"id": "5e-monk", "system_id": "5e-srd", "name": "Monk", "hit_die": 8, "primary_ability": "dexterity", "saving_throw_proficiencies": ["strength", "dexterity"], "skill_choices": 2, "subclass_level": 3},
        {"id": "5e-paladin", "system_id": "5e-srd", "name": "Paladin", "hit_die": 10, "primary_ability": "strength", "saving_throw_proficiencies": ["wisdom", "charisma"], "skill_choices": 2, "subclass_level": 3},
        {"id": "5e-ranger", "system_id": "5e-srd", "name": "Ranger", "hit_die": 10, "primary_ability": "dexterity", "saving_throw_proficiencies": ["strength", "dexterity"], "skill_choices": 3, "subclass_level": 3},
        {"id": "5e-sorcerer", "system_id": "5e-srd", "name": "Sorcerer", "hit_die": 6, "primary_ability": "charisma", "saving_throw_proficiencies": ["constitution", "charisma"], "skill_choices": 2, "subclass_level": 1},
        {"id": "5e-warlock", "system_id": "5e-srd", "name": "Warlock", "hit_die": 8, "primary_ability": "charisma", "saving_throw_proficiencies": ["wisdom", "charisma"], "skill_choices": 2, "subclass_level": 1}
    ]
    
    for cls in classes_data:
        await db.progression_classes.update_one({'id': cls['id']}, {'$set': cls}, upsert=True)
    
    # Create default races
    races_data = [
        {"id": "5e-human", "system_id": "5e-srd", "name": "Human", "ability_bonuses": {"strength": 1, "dexterity": 1, "constitution": 1, "intelligence": 1, "wisdom": 1, "charisma": 1}, "size": "Medium", "speed": 30},
        {"id": "5e-elf", "system_id": "5e-srd", "name": "Elf", "ability_bonuses": {"dexterity": 2}, "size": "Medium", "speed": 30, "traits": ["darkvision", "fey_ancestry", "trance"]},
        {"id": "5e-dwarf", "system_id": "5e-srd", "name": "Dwarf", "ability_bonuses": {"constitution": 2}, "size": "Medium", "speed": 25, "traits": ["darkvision", "dwarven_resilience", "stonecunning"]},
        {"id": "5e-halfling", "system_id": "5e-srd", "name": "Halfling", "ability_bonuses": {"dexterity": 2}, "size": "Small", "speed": 25, "traits": ["lucky", "brave", "halfling_nimbleness"]},
        {"id": "5e-dragonborn", "system_id": "5e-srd", "name": "Dragonborn", "ability_bonuses": {"strength": 2, "charisma": 1}, "size": "Medium", "speed": 30, "traits": ["breath_weapon", "damage_resistance"]},
        {"id": "5e-gnome", "system_id": "5e-srd", "name": "Gnome", "ability_bonuses": {"intelligence": 2}, "size": "Small", "speed": 25, "traits": ["darkvision", "gnome_cunning"]},
        {"id": "5e-half-elf", "system_id": "5e-srd", "name": "Half-Elf", "ability_bonuses": {"charisma": 2}, "size": "Medium", "speed": 30, "traits": ["darkvision", "fey_ancestry", "skill_versatility"]},
        {"id": "5e-half-orc", "system_id": "5e-srd", "name": "Half-Orc", "ability_bonuses": {"strength": 2, "constitution": 1}, "size": "Medium", "speed": 30, "traits": ["darkvision", "menacing", "relentless_endurance", "savage_attacks"]},
        {"id": "5e-tiefling", "system_id": "5e-srd", "name": "Tiefling", "ability_bonuses": {"charisma": 2, "intelligence": 1}, "size": "Medium", "speed": 30, "traits": ["darkvision", "hellish_resistance", "infernal_legacy"]}
    ]
    
    for race in races_data:
        await db.progression_races.update_one({'id': race['id']}, {'$set': race}, upsert=True)
    
    # Create common features (ASI)
    asi_feature = {
        "id": "5e-asi",
        "system_id": "5e-srd",
        "name": "Ability Score Improvement",
        "description": "Increase one ability score by 2, or two ability scores by 1 each. Alternatively, choose a feat.",
        "source_type": "class",
        "is_choice": True
    }
    await db.progression_features.update_one({'id': '5e-asi'}, {'$set': asi_feature}, upsert=True)
    
    # Create ASI choice
    asi_choice = {
        "id": "5e-asi-choice",
        "feature_id": "5e-asi",
        "choice_type": "asi_or_feat",
        "name": "Ability Score Improvement or Feat",
        "description": "Choose to increase ability scores or select a feat",
        "options": [
            {"id": "asi", "name": "Ability Score Improvement", "type": "asi"},
            {"id": "feat", "name": "Feat", "type": "feat"}
        ],
        "num_choices": 1
    }
    await db.feature_choices.update_one({'id': '5e-asi-choice'}, {'$set': asi_choice}, upsert=True)
    
    return {
        "success": True,
        "message": "Default 5e progression data seeded",
        "systems": 1,
        "classes": len(classes_data),
        "races": len(races_data),
        "features": 1
    }


# ==================== AI SESSION RECAP ====================

class SessionRecapRequest(BaseModel):
    campaign_id: str
    notes: str
    style: str = "narrative"  # narrative, bullet, detailed
    sections: List[str] = ["summary", "keyEvents", "npcsEncountered", "combatHighlights", "lootObtained", "nextSessionHooks"]

@api_router.post("/ai/session-recap")
async def generate_session_recap(request: SessionRecapRequest, username: str = Depends(get_current_user)):
    """Generate an AI-powered session recap from notes"""
    
    # Build prompt based on style and sections
    sections_text = ", ".join(request.sections)
    
    style_instructions = {
        "narrative": "Write in a flowing narrative style, like a story being told by a bard.",
        "bullet": "Use concise bullet points for each key element.",
        "detailed": "Provide a detailed, comprehensive log with timestamps and full descriptions."
    }
    
    prompt = f"""You are a Game Master's assistant. Generate a session recap from the following notes.

Style: {style_instructions.get(request.style, style_instructions['narrative'])}

Include these sections (if relevant content exists): {sections_text}

Session Notes:
{request.notes}

Generate a well-formatted recap that captures the key events, NPCs, locations, combat highlights, and any plot developments. Make it useful for both the GM to reference later and to share with players as a "previously on" summary.

Format the output in Markdown."""

    try:
        # Try to use ROOK AI
        from emergentintegrations.llm.chat import chat, UserMessage
        
        emergent_api_key = os.environ.get('EMERGENT_API_KEY')
        if not emergent_api_key:
            raise Exception("No API key")
        
        response = await asyncio.to_thread(
            chat,
            api_key=emergent_api_key,
            messages=[UserMessage(content=prompt)],
            model="gpt-4o-mini"
        )
        
        content = response.content
        
    except Exception as e:
        logging.warning(f"AI recap generation failed: {e}")
        # Fallback to simple extraction
        lines = request.notes.split('\n')
        content = "# Session Recap\n\n"
        content += "*Auto-generated summary*\n\n"
        content += "## Key Events\n"
        for line in lines[:10]:
            if line.strip():
                content += f"- {line.strip()}\n"
        content += "\n## Next Session\n- Continue from current situation\n"
    
    recap = {
        "content": content,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "style": request.style,
        "word_count": len(content.split())
    }
    
    # Optionally save to database
    recap['campaign_id'] = request.campaign_id
    recap['generated_by'] = username
    recap['id'] = str(uuid.uuid4())
    await db.session_recaps.insert_one(recap)
    
    return recap

@api_router.get("/ai/session-recaps/{campaign_id}")
async def get_session_recaps(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all session recaps for a campaign"""
    recaps = await db.session_recaps.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('generated_at', -1).to_list(50)
    return {"recaps": recaps}


# ==================== NPC RELATIONSHIP WEB ROUTES ====================

class NPCRelationship(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    source_id: str  # NPC who has the relationship
    target_id: str  # NPC they're related to
    relationship_type: str = "neutral"  # ally, enemy, family, romantic, business, rival, neutral, servant
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NPCRelationshipCreate(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str = "neutral"
    description: str = ""

@api_router.post("/campaigns/{campaign_id}/npc-relationships", status_code=status.HTTP_201_CREATED)
async def create_npc_relationship(campaign_id: str, rel_data: NPCRelationshipCreate, username: str = Depends(get_current_user)):
    """Create a relationship between two NPCs"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Validate that both NPCs exist
    source = await db.npcs.find_one({'id': rel_data.source_id, 'campaign_id': campaign_id})
    target = await db.npcs.find_one({'id': rel_data.target_id, 'campaign_id': campaign_id})
    
    if not source or not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both NPCs not found")
    
    # Check if relationship already exists
    existing = await db.npc_relationships.find_one({
        'campaign_id': campaign_id,
        '$or': [
            {'source_id': rel_data.source_id, 'target_id': rel_data.target_id},
            {'source_id': rel_data.target_id, 'target_id': rel_data.source_id}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Relationship already exists between these NPCs")
    
    relationship = NPCRelationship(campaign_id=campaign_id, **rel_data.model_dump())
    doc = relationship.model_dump()
    await db.npc_relationships.insert_one(doc)
    # Remove _id before returning
    doc.pop('_id', None)
    return doc

@api_router.get("/campaigns/{campaign_id}/npc-relationships")
async def get_npc_relationships(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all NPC relationships for a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    relationships = await db.npc_relationships.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).to_list(500)
    return relationships

@api_router.delete("/campaigns/{campaign_id}/npc-relationships/{relationship_id}")
async def delete_npc_relationship(campaign_id: str, relationship_id: str, username: str = Depends(get_current_user)):
    """Delete an NPC relationship"""
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.npc_relationships.delete_one({'id': relationship_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")
    return {'message': 'NPC relationship deleted successfully'}


# ==================== RULE SYSTEM & CONTENT MANAGEMENT ====================

class RuleSystem(BaseModel):
    """A complete rule system (e.g., Fantasy d20, Sci-Fi, Custom Homebrew)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "Fantasy d20", "Sci-Fi RPG", "My Homebrew"
    short_code: str  # "fantasy_d20", "scifi_rpg", "homebrew_v1"
    description: str = ""
    is_official: bool = False  # Reserved for future use
    owner_id: Optional[str] = None  # Who created this system
    base_system: Optional[str] = None  # Parent system for variants
    # Core mechanics
    ability_scores: List[str] = Field(default_factory=lambda: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"])
    skills: List[Dict[str, Any]] = Field(default_factory=list)  # [{name, ability, description}]
    # Feature flags
    has_spells: bool = True
    has_classes: bool = True
    has_races: bool = True
    max_level: int = 20
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RuleSystemCreate(BaseModel):
    name: str
    short_code: str
    description: str = ""
    base_system: Optional[str] = None
    ability_scores: List[str] = Field(default_factory=lambda: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"])
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    has_spells: bool = True
    has_classes: bool = True
    has_races: bool = True
    max_level: int = 20

class GameClass(BaseModel):
    """A character class within a rule system"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str  # Which rule system this belongs to
    name: str
    description: str = ""
    hit_die: int = 8  # d6, d8, d10, d12
    primary_ability: str = ""  # "Strength", "Dexterity", etc.
    saving_throw_proficiencies: List[str] = Field(default_factory=list)
    armor_proficiencies: List[str] = Field(default_factory=list)
    weapon_proficiencies: List[str] = Field(default_factory=list)
    tool_proficiencies: List[str] = Field(default_factory=list)
    skill_choices: Dict[str, Any] = Field(default_factory=dict)  # {count: 2, options: ["Acrobatics", ...]}
    starting_equipment: List[str] = Field(default_factory=list)
    spellcasting_ability: Optional[str] = None  # "Intelligence", "Wisdom", "Charisma", or None
    spellcasting_type: Optional[str] = None  # "full", "half", "third", "pact", None
    subclass_level: int = 3  # Level at which subclass is chosen
    # Multiclass requirements
    multiclass_requirements: Dict[str, int] = Field(default_factory=dict)  # {"Strength": 13} or {"Strength": 13, "Charisma": 13}
    multiclass_proficiencies: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameSubclass(BaseModel):
    """A subclass/archetype within a class"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    class_id: str
    name: str
    description: str = ""
    features: List[Dict[str, Any]] = Field(default_factory=list)  # [{level, name, description}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameRace(BaseModel):
    """A playable race/species"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    description: str = ""
    size: str = "Medium"
    speed: int = 30
    ability_score_increases: Dict[str, int] = Field(default_factory=dict)
    traits: List[Dict[str, Any]] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    darkvision: int = 0
    subraces: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClassLevelFeature(BaseModel):
    """Features gained at specific class levels"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    class_id: str
    level: int
    name: str
    description: str = ""
    has_choices: bool = False
    choice_type: Optional[str] = None
    choice_count: int = 1
    choice_options: List[str] = Field(default_factory=list)
    grants_spell_slots: bool = False
    spell_slots: Dict[str, int] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameSpell(BaseModel):
    """A spell in the system"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    level: int  # 0 for cantrips
    school: str = ""
    casting_time: str = ""
    range: str = ""
    components: str = ""
    duration: str = ""
    description: str = ""
    higher_levels: str = ""
    classes: List[str] = Field(default_factory=list)
    ritual: bool = False
    concentration: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameItem(BaseModel):
    """An item (weapon, armor, equipment, magic item)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    type: str = "equipment"
    rarity: str = "common"
    description: str = ""
    weight: float = 0
    cost: str = ""
    damage: str = ""
    damage_type: str = ""
    properties: List[str] = Field(default_factory=list)
    armor_class: int = 0
    armor_type: str = ""
    stealth_disadvantage: bool = False
    strength_requirement: int = 0
    requires_attunement: bool = False
    attunement_requirements: str = ""
    magic_properties: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameFeat(BaseModel):
    """A feat or special ability"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    description: str = ""
    prerequisites: str = ""
    benefits: List[str] = Field(default_factory=list)
    ability_score_increase: Dict[str, int] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameMonster(BaseModel):
    """A monster/creature stat block"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    system_id: str
    name: str
    size: str = "Medium"
    type: str = ""
    alignment: str = ""
    armor_class: int = 10
    hit_points: int = 10
    hit_dice: str = ""
    speed: Dict[str, int] = Field(default_factory=lambda: {"walk": 30})
    ability_scores: Dict[str, int] = Field(default_factory=lambda: {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10})
    challenge_rating: str = "0"
    xp: int = 0
    traits: List[Dict[str, str]] = Field(default_factory=list)
    actions: List[Dict[str, str]] = Field(default_factory=list)
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContentUpload(BaseModel):
    """Request for bulk content upload"""
    system_id: str
    content_type: str
    data: List[Dict[str, Any]]
    overwrite_existing: bool = False


# ==================== RULE SYSTEM ROUTES ====================

@api_router.get("/rule-systems")
async def get_rule_systems(username: str = Depends(get_current_user)):
    """Get all available rule systems (official + user's custom)"""
    systems = await db.rule_systems.find(
        {'$or': [{'is_official': True}, {'owner_id': username}]},
        {'_id': 0}
    ).to_list(100)
    return {"systems": systems}

@api_router.get("/rule-systems/{system_id}")
async def get_rule_system(system_id: str, username: str = Depends(get_current_user)):
    """Get a specific rule system with all its content counts"""
    system = await db.rule_systems.find_one({'id': system_id}, {'_id': 0})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    counts = {
        'classes': await db.game_classes.count_documents({'system_id': system_id}),
        'subclasses': await db.game_subclasses.count_documents({'system_id': system_id}),
        'races': await db.game_races.count_documents({'system_id': system_id}),
        'spells': await db.game_spells.count_documents({'system_id': system_id}),
        'items': await db.game_items.count_documents({'system_id': system_id}),
        'feats': await db.game_feats.count_documents({'system_id': system_id}),
        'monsters': await db.game_monsters.count_documents({'system_id': system_id}),
        'features': await db.class_level_features.count_documents({'system_id': system_id}),
    }
    return {"system": system, "content_counts": counts}

@api_router.post("/rule-systems", status_code=status.HTTP_201_CREATED)
async def create_rule_system(system_data: RuleSystemCreate, username: str = Depends(get_current_user)):
    """Create a new custom rule system"""
    existing = await db.rule_systems.find_one({'short_code': system_data.short_code})
    if existing:
        raise HTTPException(status_code=400, detail="A system with this short code already exists")
    
    system = RuleSystem(**system_data.model_dump(), is_official=False, owner_id=username)
    doc = system.model_dump()
    await db.rule_systems.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/rule-systems/{system_id}")
async def update_rule_system(system_id: str, update_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a custom rule system (only owner can update)"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    if system.get('is_official'):
        raise HTTPException(status_code=403, detail="Cannot modify official rule systems")
    if system.get('owner_id') != username:
        raise HTTPException(status_code=403, detail="Only the owner can modify this rule system")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.rule_systems.update_one({'id': system_id}, {'$set': update_data})
    updated = await db.rule_systems.find_one({'id': system_id}, {'_id': 0})
    return updated


# ==================== CONTENT ROUTES ====================

@api_router.get("/rule-systems/{system_id}/classes")
async def get_system_classes(system_id: str, username: str = Depends(get_current_user)):
    classes = await db.game_classes.find({'system_id': system_id}, {'_id': 0}).to_list(100)
    return {"classes": classes}

@api_router.get("/rule-systems/{system_id}/classes/{class_id}")
async def get_class_details(system_id: str, class_id: str, username: str = Depends(get_current_user)):
    game_class = await db.game_classes.find_one({'id': class_id, 'system_id': system_id}, {'_id': 0})
    if not game_class:
        raise HTTPException(status_code=404, detail="Class not found")
    subclasses = await db.game_subclasses.find({'class_id': class_id, 'system_id': system_id}, {'_id': 0}).to_list(50)
    features = await db.class_level_features.find({'class_id': class_id, 'system_id': system_id}, {'_id': 0}).sort('level', 1).to_list(100)
    return {"class": game_class, "subclasses": subclasses, "features": features}

@api_router.get("/rule-systems/{system_id}/races")
async def get_system_races(system_id: str, username: str = Depends(get_current_user)):
    races = await db.game_races.find({'system_id': system_id}, {'_id': 0}).to_list(100)
    return {"races": races}

@api_router.get("/rule-systems/{system_id}/spells")
async def get_system_spells(system_id: str, class_name: Optional[str] = None, level: Optional[int] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if class_name:
        query['classes'] = class_name
    if level is not None:
        query['level'] = level
    spells = await db.game_spells.find(query, {'_id': 0}).sort('level', 1).to_list(1000)
    return {"spells": spells}

@api_router.get("/rule-systems/{system_id}/items")
async def get_system_items(system_id: str, item_type: Optional[str] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if item_type:
        query['type'] = item_type
    items = await db.game_items.find(query, {'_id': 0}).to_list(1000)
    return {"items": items}

@api_router.get("/rule-systems/{system_id}/feats")
async def get_system_feats(system_id: str, username: str = Depends(get_current_user)):
    feats = await db.game_feats.find({'system_id': system_id}, {'_id': 0}).to_list(200)
    return {"feats": feats}

@api_router.get("/rule-systems/{system_id}/monsters")
async def get_system_monsters(system_id: str, cr: Optional[str] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if cr:
        query['challenge_rating'] = cr
    monsters = await db.game_monsters.find(query, {'_id': 0}).to_list(1000)
    return {"monsters": monsters}


# ==================== BULK UPLOAD ROUTES ====================

async def is_admin(username: str) -> bool:
    """Check if user is an admin"""
    user = await db.users.find_one({'username': username}, {'_id': 0})
    return user.get('is_admin', False) if user else False

@api_router.post("/rule-systems/{system_id}/upload")
async def bulk_upload_content(system_id: str, upload: ContentUpload, username: str = Depends(get_current_user)):
    """Bulk upload content to a rule system"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    # Allow upload if user is owner, admin, or system has no owner (shared)
    is_admin_user = await is_admin(username)
    is_owner = system.get('owner_id') == username
    is_shared = system.get('owner_id') is None
    
    if not (is_admin_user or is_owner or is_shared):
        raise HTTPException(status_code=403, detail="You don't have permission to upload to this rule system")
    
    collection_map = {
        'classes': db.game_classes,
        'subclasses': db.game_subclasses,
        'races': db.game_races,
        'spells': db.game_spells,
        'items': db.game_items,
        'feats': db.game_feats,
        'monsters': db.game_monsters,
        'features': db.class_level_features,
    }
    
    if upload.content_type not in collection_map:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {upload.content_type}")
    
    collection = collection_map[upload.content_type]
    created, updated, errors = 0, 0, []
    
    for i, item in enumerate(upload.data):
        try:
            item['system_id'] = system_id
            if 'id' not in item:
                item['id'] = str(uuid.uuid4())
            if 'created_at' not in item:
                item['created_at'] = datetime.now(timezone.utc).isoformat()
            
            existing = await collection.find_one({'system_id': system_id, 'name': item.get('name', '')})
            if existing:
                if upload.overwrite_existing:
                    await collection.update_one({'system_id': system_id, 'name': item['name']}, {'$set': item})
                    updated += 1
                else:
                    errors.append(f"Item {i}: '{item.get('name', 'Unknown')}' already exists")
            else:
                await collection.insert_one(item)
                created += 1
        except Exception as e:
            errors.append(f"Item {i}: {str(e)}")
    
    return {"success": len(errors) == 0, "content_type": upload.content_type, "total_records": len(upload.data), "created": created, "updated": updated, "errors": errors}

@api_router.post("/rule-systems/{system_id}/upload-file")
async def upload_content_file(system_id: str, content_type: str, file: UploadFile = File(...), overwrite: bool = False, username: str = Depends(get_current_user)):
    """Upload content from a JSON or CSV file"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    # Allow upload if user is owner, admin, or system has no owner (shared)
    is_admin_user = await is_admin(username)
    is_owner = system.get('owner_id') == username
    is_shared = system.get('owner_id') is None
    
    if not (is_admin_user or is_owner or is_shared):
        raise HTTPException(status_code=403, detail="You don't have permission to upload to this rule system")
    
    content = await file.read()
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
        elif filename.endswith('.csv'):
            import csv
            import io
            reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
            data = list(reader)
            for item in data:
                for key, value in item.items():
                    if isinstance(value, str):
                        if value.isdigit():
                            item[key] = int(value)
                        elif value.replace('.', '').isdigit():
                            item[key] = float(value)
                        elif value.lower() == 'true':
                            item[key] = True
                        elif value.lower() == 'false':
                            item[key] = False
        else:
            raise HTTPException(status_code=400, detail="File must be .json or .csv")
        
        if not isinstance(data, list):
            data = [data]
        
        upload = ContentUpload(system_id=system_id, content_type=content_type, data=data, overwrite_existing=overwrite)
        return await bulk_upload_content(system_id, upload, username)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")


# ==================== AI WITH RULE SYSTEM AWARENESS ====================

async def get_campaign_rule_system(campaign_id: str) -> Dict[str, Any]:
    """Get the rule system for a campaign"""
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        return None
    
    system_name = campaign.get('system', 'Fantasy d20')
    # Try to find a matching rule system by name
    system = await db.rule_systems.find_one({'name': {'$regex': system_name, '$options': 'i'}}, {'_id': 0})
    if not system:
        # Try by short_code
        system = await db.rule_systems.find_one({'short_code': {'$regex': system_name.replace(' ', '_').lower(), '$options': 'i'}}, {'_id': 0})
    return system

@api_router.post("/ai/generate-with-rules")
async def ai_generate_with_rules(request: Dict[str, Any], username: str = Depends(get_current_user)):
    """AI generation that respects the campaign's rule system"""
    campaign_id = request.get('campaign_id')
    prompt_type = request.get('type')
    context = request.get('context', '')
    
    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id is required")
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    rule_system = await get_campaign_rule_system(campaign_id)
    system_name = campaign.get('system', 'Fantasy d20')
    
    # Build context from uploaded content in the rule system
    system_context = ""
    if rule_system:
        system_id = rule_system.get('id')
        classes = await db.game_classes.find({'system_id': system_id}, {'_id': 0, 'name': 1}).to_list(10)
        races = await db.game_races.find({'system_id': system_id}, {'_id': 0, 'name': 1}).to_list(10)
        if classes or races:
            system_context = "\n\nContent available in this campaign's rule system:\n"
            if classes:
                system_context += f"Classes: {', '.join(c['name'] for c in classes)}\n"
            if races:
                system_context += f"Races/Species: {', '.join(r['name'] for r in races)}\n"
    
    # Generic rule instructions based on campaign system setting
    rule_instructions = f"You are a TTRPG assistant for a campaign using the {system_name} rules.\n\n"
    rule_instructions += "Generate content that fits this campaign's setting and rule system. "
    rule_instructions += "Use appropriate terminology and mechanics for the system being used.\n"
    rule_instructions += system_context
    
    prompts = {
        'npc': f"{rule_instructions}\n\nGenerate an NPC. Context: {context}\n\nProvide: name, race/species, class, background, personality, and a secret.",
        'encounter': f"{rule_instructions}\n\nGenerate a combat encounter. Context: {context}\n\nProvide: enemies, quantity, tactics, and loot.",
        'item': f"{rule_instructions}\n\nGenerate a magic item. Context: {context}\n\nProvide: name, rarity, effects using {system_name} rules.",
        'location': f"{rule_instructions}\n\nGenerate a location. Context: {context}\n\nProvide: name, description, features, and secrets.",
        'plot_hook': f"{rule_instructions}\n\nGenerate a plot hook. Context: {context}\n\nProvide: hook, complications, NPCs, and rewards.",
    }
    
    prompt = prompts.get(prompt_type, f"{rule_instructions}\n\n{context}")
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ai-gen-{username}-{uuid.uuid4().hex[:8]}",
            system_message="You are a creative TTRPG game master assistant. Generate content that is engaging, balanced, and fits the specified rule system."
        ).with_model("openai", "gpt-5.2")
        
        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)
        response_text = response.strip() if isinstance(response, str) else str(response)
        
        return {"result": response_text, "rule_system": system_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ==================== CHARACTER MULTICLASS SUPPORT ====================

@api_router.post("/characters/{character_id}/multiclass")
async def add_multiclass(character_id: str, class_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a new class to a character (multiclassing)"""
    # Try player_characters first, then characters
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    collection = db.player_characters
    owner_field = 'user_id'
    
    if not character:
        character = await db.characters.find_one({'id': character_id, 'owner': username}, {'_id': 0})
        collection = db.characters
        owner_field = 'owner'
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    new_class_name = class_data.get('class_name')
    if not new_class_name:
        raise HTTPException(status_code=400, detail="class_name is required")
    
    campaign_id = character.get('campaign_id')
    rule_system = await get_campaign_rule_system(campaign_id) if campaign_id else None
    
    game_class = None
    if rule_system:
        game_class = await db.game_classes.find_one({
            'system_id': rule_system.get('id'),
            'name': {'$regex': f'^{new_class_name}$', '$options': 'i'}
        }, {'_id': 0})
    
    if game_class and game_class.get('multiclass_requirements'):
        for ability, min_score in game_class['multiclass_requirements'].items():
            char_score = character.get('ability_scores', {}).get(ability.lower()[:3], 10)
            if char_score < min_score:
                raise HTTPException(status_code=400, detail=f"Multiclassing into {new_class_name} requires {ability} {min_score}. You have {char_score}.")
    
    classes = character.get('classes', [])
    if not classes:
        current_class = character.get('character_class', character.get('class', 'Unknown'))
        current_level = character.get('level', 1)
        classes = [{'name': current_class, 'level': current_level}]
    
    existing_class = next((c for c in classes if c['name'].lower() == new_class_name.lower()), None)
    if existing_class:
        raise HTTPException(status_code=400, detail=f"Character already has levels in {new_class_name}")
    
    classes.append({'name': new_class_name, 'level': 1, 'subclass': None})
    total_level = sum(c['level'] for c in classes)
    
    new_proficiencies = []
    if game_class and game_class.get('multiclass_proficiencies'):
        new_proficiencies = game_class['multiclass_proficiencies']
    
    current_proficiencies = character.get('proficiencies', [])
    updated_proficiencies = list(set(current_proficiencies + new_proficiencies))
    
    # Build multiclass_levels dict for frontend compatibility
    multiclass_levels = {}
    for cls in classes:
        multiclass_levels[cls['name']] = cls['level']
    
    await collection.update_one(
        {'id': character_id},
        {'$set': {
            'classes': classes, 
            'level': total_level, 
            'proficiencies': updated_proficiencies,
            'multiclass_levels': multiclass_levels,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await collection.find_one({'id': character_id}, {'_id': 0})
    return updated

@api_router.post("/characters/{character_id}/level-up-class")
async def level_up_specific_class(character_id: str, class_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Level up a specific class for a multiclass character"""
    import random
    
    # Try player_characters first, then characters
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    collection = db.player_characters
    
    if not character:
        character = await db.characters.find_one({'id': character_id, 'owner': username}, {'_id': 0})
        collection = db.characters
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    class_name = class_data.get('class_name')
    if not class_name:
        raise HTTPException(status_code=400, detail="class_name is required")
    
    classes = character.get('classes', [])
    if not classes:
        if character.get('class', '').lower() == class_name.lower():
            classes = [{'name': character['class'], 'level': character.get('level', 1)}]
        else:
            raise HTTPException(status_code=400, detail=f"Character doesn't have levels in {class_name}")
    
    class_found = False
    for c in classes:
        if c['name'].lower() == class_name.lower():
            c['level'] += 1
            class_found = True
            break
    
    if not class_found:
        raise HTTPException(status_code=400, detail=f"Character doesn't have levels in {class_name}")
    
    total_level = sum(c['level'] for c in classes)
    campaign_id = character.get('campaign_id')
    rule_system = await get_campaign_rule_system(campaign_id) if campaign_id else None
    
    hit_die = 8
    if rule_system:
        game_class = await db.game_classes.find_one({
            'system_id': rule_system.get('id'),
            'name': {'$regex': f'^{class_name}$', '$options': 'i'}
        }, {'_id': 0})
        if game_class:
            hit_die = game_class.get('hit_die', 8)
    
    con_mod = (character.get('ability_scores', {}).get('con', 10) - 10) // 2
    hp_roll = random.randint(1, hit_die)
    hp_gain = max(1, hp_roll + con_mod)
    new_max_hp = character.get('max_hp', 10) + hp_gain
    
    # Build multiclass_levels dict for frontend compatibility
    multiclass_levels = {}
    for cls in classes:
        multiclass_levels[cls['name']] = cls['level']
    
    await collection.update_one(
        {'id': character_id},
        {'$set': {
            'classes': classes, 
            'level': total_level, 
            'max_hp': new_max_hp, 
            'current_hp': new_max_hp,
            'multiclass_levels': multiclass_levels,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await collection.find_one({'id': character_id}, {'_id': 0})
    return {"character": updated, "hp_gained": hp_gain, "hp_roll": hp_roll, "class_leveled": class_name}


# ==================== INITIALIZE DEFAULT RULE SYSTEMS ====================

async def initialize_rule_systems():
    """Create default generic rule systems if none exist - users add their own content"""
    existing = await db.rule_systems.count_documents({})
    if existing > 0:
        return
    
    # Generic fantasy skills that work with most d20 systems
    generic_skills = [
        {"name": "Acrobatics", "ability": "Dexterity"},
        {"name": "Animal Handling", "ability": "Wisdom"},
        {"name": "Arcana", "ability": "Intelligence"},
        {"name": "Athletics", "ability": "Strength"},
        {"name": "Deception", "ability": "Charisma"},
        {"name": "History", "ability": "Intelligence"},
        {"name": "Insight", "ability": "Wisdom"},
        {"name": "Intimidation", "ability": "Charisma"},
        {"name": "Investigation", "ability": "Intelligence"},
        {"name": "Medicine", "ability": "Wisdom"},
        {"name": "Nature", "ability": "Intelligence"},
        {"name": "Perception", "ability": "Wisdom"},
        {"name": "Performance", "ability": "Charisma"},
        {"name": "Persuasion", "ability": "Charisma"},
        {"name": "Religion", "ability": "Intelligence"},
        {"name": "Sleight of Hand", "ability": "Dexterity"},
        {"name": "Stealth", "ability": "Dexterity"},
        {"name": "Survival", "ability": "Wisdom"},
    ]
    
    # Create a single generic starter system - users can rename or create their own
    starter_system = RuleSystem(
        id="starter-fantasy",
        name="Fantasy d20 System",
        short_code="fantasy_d20",
        description="A generic d20 fantasy rule system. Upload your own classes, races, spells, and more!",
        is_official=False,
        owner_id=None,  # Shared system anyone can use as a base
        skills=generic_skills,
    )
    
    await db.rule_systems.insert_one(starter_system.model_dump())
    logger.info("Initialized starter rule system (Fantasy d20)")


# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/campaign/{campaign_id}")
async def websocket_campaign_sync(websocket: WebSocket, campaign_id: str):
    """WebSocket endpoint for real-time campaign synchronization"""
    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4002, reason="Token expired")
        return
    except jwt.InvalidTokenError:
        await websocket.close(code=4003, reason="Invalid token")
        return
    
    # Verify user has access to this campaign
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        await websocket.close(code=4004, reason="Campaign not found")
        return
    
    # Check if user is GM or a member
    is_gm = campaign.get("dm_user_id") == user_id
    member = await db.campaign_members.find_one({"campaign_id": campaign_id, "user_id": user_id})
    
    if not is_gm and not member:
        await websocket.close(code=4005, reason="Not a member of this campaign")
        return
    
    await ws_manager.connect(websocket, user_id, campaign_id)
    
    try:
        # Send initial state
        await websocket.send_json({
            "type": "connected",
            "campaign_id": campaign_id,
            "user_id": user_id,
            "is_gm": is_gm,
            "online_users": list(ws_manager.get_campaign_users(campaign_id))
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "character_update":
                # Broadcast character HP, conditions, etc.
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "character_update",
                    "character_id": data.get("character_id"),
                    "updates": data.get("updates"),
                    "from_user": user_id
                }, exclude=websocket)
                
            elif message_type == "dice_roll":
                # Broadcast dice roll to campaign
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "dice_roll",
                    "roller": data.get("roller_name", "Unknown"),
                    "roll_type": data.get("roll_type"),
                    "dice": data.get("dice"),
                    "result": data.get("result"),
                    "total": data.get("total"),
                    "from_user": user_id
                }, exclude=websocket)
                
            elif message_type == "combat_update":
                # GM broadcasts combat state
                if is_gm:
                    await ws_manager.broadcast_to_campaign(campaign_id, {
                        "type": "combat_update",
                        "combat_data": data.get("combat_data")
                    }, exclude=websocket)
                    
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id, campaign_id)
        await ws_manager.broadcast_to_campaign(campaign_id, {
            "type": "user_left",
            "user_id": user_id
        })


# ==================== CUSTOM RULES ENDPOINTS ====================

@api_router.post("/rulesets")
async def upload_custom_ruleset(ruleset: CustomRulesUpload, username: str = Depends(get_current_user)):
    """Upload a custom ruleset (classes, races, spells, etc.)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate rules_type
    valid_types = ["classes", "races", "spells", "items", "feats", "backgrounds", "full", "monsters"]
    if ruleset.rules_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid rules_type. Must be one of: {valid_types}")
    
    new_ruleset = CustomRuleset(
        owner_id=str(user.get("_id")),
        name=ruleset.name,
        description=ruleset.description,
        rules_type=ruleset.rules_type,
        content=ruleset.content,
        is_public=ruleset.is_public
    )
    
    await db.custom_rulesets.insert_one(new_ruleset.model_dump())
    
    return {"message": "Ruleset uploaded successfully", "ruleset_id": new_ruleset.id}

@api_router.get("/rulesets")
async def get_user_rulesets(username: str = Depends(get_current_user)):
    """Get all rulesets available to the user (owned + shared + public)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    # Get owned rulesets
    owned = await db.custom_rulesets.find({"owner_id": user_id}).to_list(100)
    
    # Get rulesets shared with user
    shared = await db.custom_rulesets.find({"shared_with": user_id}).to_list(100)
    
    # Get public rulesets
    public = await db.custom_rulesets.find({"is_public": True, "owner_id": {"$ne": user_id}}).to_list(50)
    
    # Clean _id from results
    for r in owned + shared + public:
        r.pop("_id", None)
    
    return {
        "owned": owned,
        "shared": shared,
        "public": public
    }

@api_router.get("/rulesets/{ruleset_id}")
async def get_ruleset(ruleset_id: str, username: str = Depends(get_current_user)):
    """Get a specific ruleset"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    # Check access
    is_owner = ruleset.get("owner_id") == user_id
    is_shared = user_id in ruleset.get("shared_with", [])
    is_public = ruleset.get("is_public", False)
    
    if not (is_owner or is_shared or is_public):
        raise HTTPException(status_code=403, detail="Access denied")
    
    ruleset.pop("_id", None)
    return ruleset

@api_router.put("/rulesets/{ruleset_id}")
async def update_ruleset(ruleset_id: str, updates: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a ruleset (owner only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can update ruleset")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.custom_rulesets.update_one({"id": ruleset_id}, {"$set": updates})
    
    return {"message": "Ruleset updated"}

@api_router.delete("/rulesets/{ruleset_id}")
async def delete_ruleset(ruleset_id: str, username: str = Depends(get_current_user)):
    """Delete a ruleset (owner only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can delete ruleset")
    
    await db.custom_rulesets.delete_one({"id": ruleset_id})
    return {"message": "Ruleset deleted"}

@api_router.post("/rulesets/{ruleset_id}/share")
async def share_ruleset(ruleset_id: str, share_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Share a ruleset with users or campaigns"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can share ruleset")
    
    updates = {}
    
    # Share with specific users
    if "user_ids" in share_data:
        current_shared = ruleset.get("shared_with", [])
        new_shared = list(set(current_shared + share_data["user_ids"]))
        updates["shared_with"] = new_shared
    
    # Share with campaigns
    if "campaign_ids" in share_data:
        current_campaigns = ruleset.get("shared_campaigns", [])
        new_campaigns = list(set(current_campaigns + share_data["campaign_ids"]))
        updates["shared_campaigns"] = new_campaigns
    
    if updates:
        await db.custom_rulesets.update_one({"id": ruleset_id}, {"$set": updates})
    
    return {"message": "Ruleset sharing updated"}


# ==================== CAMPAIGN INVITE/JOIN ENDPOINTS ====================

@api_router.post("/campaigns/{campaign_id}/invite")
async def create_campaign_invite(campaign_id: str, invite_data: Dict[str, Any] = None, username: str = Depends(get_current_user)):
    """Create an invite link for a campaign (GM only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("dm_user_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only GM can create invites")
    
    invite_data = invite_data or {}
    
    invite = CampaignInvite(
        campaign_id=campaign_id,
        created_by=str(user.get("_id")),
        max_uses=invite_data.get("max_uses"),
        expires_at=(datetime.now(timezone.utc) + timedelta(days=invite_data.get("expires_days", 7))).isoformat() if invite_data.get("expires_days") else None
    )
    
    await db.campaign_invites.insert_one(invite.model_dump())
    
    return {
        "invite_code": invite.code,
        "invite_url": f"/join/{invite.code}",
        "expires_at": invite.expires_at
    }

@api_router.post("/campaigns/join/{invite_code}")
async def join_campaign_by_invite(invite_code: str, username: str = Depends(get_current_user)):
    """Join a campaign using an invite code"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    invite = await db.campaign_invites.find_one({"code": invite_code})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Check expiration
    if invite.get("expires_at"):
        if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite has expired")
    
    # Check max uses
    if invite.get("max_uses") and invite.get("uses", 0) >= invite["max_uses"]:
        raise HTTPException(status_code=400, detail="Invite has reached max uses")
    
    campaign_id = invite["campaign_id"]
    
    # Check if already a member
    existing = await db.campaign_members.find_one({"campaign_id": campaign_id, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this campaign")
    
    # Get campaign details
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Can't join your own campaign as a player
    if campaign.get("dm_user_id") == user_id:
        raise HTTPException(status_code=400, detail="You are the GM of this campaign")
    
    # Get rulesets shared with this campaign
    shared_rulesets = await db.custom_rulesets.find({"shared_campaigns": campaign_id}).to_list(50)
    shared_ruleset_ids = [r["id"] for r in shared_rulesets]
    
    # Create membership
    member = CampaignMember(
        campaign_id=campaign_id,
        user_id=user_id,
        username=user.get("username", user.get("email")),
        shared_rulesets=shared_ruleset_ids
    )
    
    await db.campaign_members.insert_one(member.model_dump())
    
    # Update invite uses
    await db.campaign_invites.update_one({"code": invite_code}, {"$inc": {"uses": 1}})
    
    # Copy shared rulesets to user's shared list
    for ruleset_id in shared_ruleset_ids:
        await db.custom_rulesets.update_one(
            {"id": ruleset_id},
            {"$addToSet": {"shared_with": user_id}}
        )
    
    # Notify GM via WebSocket if connected
    await ws_manager.send_to_user(campaign.get("dm_user_id"), {
        "type": "player_joined",
        "campaign_id": campaign_id,
        "player": {
            "user_id": user_id,
            "username": user.get("username")
        }
    })
    
    return {
        "message": "Successfully joined campaign",
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "shared_rulesets": shared_ruleset_ids
    }

@api_router.get("/campaigns/{campaign_id}/members")
async def get_campaign_members(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all members of a campaign"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    members = await db.campaign_members.find({"campaign_id": campaign_id}).to_list(100)
    for m in members:
        m.pop("_id", None)
    
    # Add GM info
    gm_user = await db.users.find_one({"_id": campaign.get("dm_user_id")}) if campaign.get("dm_user_id") else None
    
    return {
        "gm": {
            "user_id": campaign.get("dm_user_id"),
            "username": gm_user.get("username") if gm_user else "Unknown"
        },
        "members": members,
        "online_users": list(ws_manager.get_campaign_users(campaign_id))
    }

@api_router.post("/campaigns/{campaign_id}/share-rulesets")
async def share_rulesets_with_campaign(campaign_id: str, data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Share rulesets with all members of a campaign (GM only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("dm_user_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only GM can share rulesets")
    
    ruleset_ids = data.get("ruleset_ids", [])
    
    # Verify ownership of rulesets
    for ruleset_id in ruleset_ids:
        ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
        if not ruleset or ruleset.get("owner_id") != str(user.get("_id")):
            raise HTTPException(status_code=403, detail=f"Cannot share ruleset {ruleset_id}")
    
    # Get all campaign members
    members = await db.campaign_members.find({"campaign_id": campaign_id}).to_list(100)
    member_ids = [m["user_id"] for m in members]
    
    # Share rulesets with campaign and all members
    for ruleset_id in ruleset_ids:
        await db.custom_rulesets.update_one(
            {"id": ruleset_id},
            {
                "$addToSet": {
                    "shared_campaigns": campaign_id,
                    "shared_with": {"$each": member_ids}
                }
            }
        )
        
        # Update each member's shared_rulesets
        await db.campaign_members.update_many(
            {"campaign_id": campaign_id},
            {"$addToSet": {"shared_rulesets": ruleset_id}}
        )
    
    # Notify all members via WebSocket
    await ws_manager.broadcast_to_campaign(campaign_id, {
        "type": "rulesets_shared",
        "ruleset_ids": ruleset_ids,
        "from_gm": True
    })
    
    return {"message": f"Shared {len(ruleset_ids)} rulesets with campaign members"}

@api_router.post("/rulesets/upload-file")
async def upload_ruleset_file(file: UploadFile = File(...), username: str = Depends(get_current_user)):
    """Upload a JSON file containing custom rules"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON file")
    
    # Read and parse the file
    try:
        content = await file.read()
        rules_data = json.loads(content.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    
    # Determine rules type from content
    rules_type = "full"
    if "classes" in rules_data and len(rules_data) == 1:
        rules_type = "classes"
    elif "races" in rules_data and len(rules_data) == 1:
        rules_type = "races"
    elif "spells" in rules_data and len(rules_data) == 1:
        rules_type = "spells"
    elif "feats" in rules_data and len(rules_data) == 1:
        rules_type = "feats"
    elif "backgrounds" in rules_data and len(rules_data) == 1:
        rules_type = "backgrounds"
    elif "monsters" in rules_data and len(rules_data) == 1:
        rules_type = "monsters"
    
    # Create the ruleset
    new_ruleset = CustomRuleset(
        owner_id=str(user.get("_id")),
        name=file.filename.replace('.json', ''),
        description=f"Uploaded from {file.filename}",
        rules_type=rules_type,
        content=rules_data,
        is_public=False
    )
    
    await db.custom_rulesets.insert_one(new_ruleset.model_dump())
    
    return {
        "message": "Ruleset uploaded successfully",
        "ruleset_id": new_ruleset.id,
        "rules_type": rules_type,
        "name": new_ruleset.name
    }


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

# Health check endpoint for Kubernetes
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment readiness"""
    return {"status": "healthy", "service": "rook-backend"}

@app.on_event("startup")
async def startup_event():
    """Initialize systems on startup"""
    # Log Stripe status
    if STRIPE_ENABLED and STRIPE_API_KEY:
        logger.info("Stripe integration ENABLED - paid subscriptions available")
    else:
        logger.info("Stripe integration DISABLED - using promo codes only")
    
    # Rule systems - always initialize
    await initialize_rule_systems()
    logger.info("Rule systems initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
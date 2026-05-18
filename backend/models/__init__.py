"""All Pydantic models for the ROOK backend."""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import secrets

class RulesetUpload(BaseModel):
    """Model for uploading custom rules JSON (used by rulesets system)"""
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


class UserRegister(BaseModel):
    email: EmailStr
    username: str  # Display name
    password: str

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
    rules_edition: str = "2024"  # "2014" or "2024" — controls AI prompts + class rules across the GM screen
    world_setting: str = "custom"  # Tone label only; concrete lore must come from GM-saved content
    world_setting_notes: str = ""  # GM-provided notes about the setting for AI context
    campaign_environment: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    system: str = "5e 2024 Compatible"
    rules_edition: str = "2024"
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
    world_setting: str = "custom"  # Tone label only: high_fantasy, magipunk_noir, classic_fantasy, epic_fantasy, gothic_horror, fantasy_space, planar_adventure, custom
    world_setting_notes: str = ""  # GM-authored context for the AI

class CampaignEnvironmentUpdate(BaseModel):
    weather: str = "clear"
    lighting: str = "daylight"
    mood: str = "neutral"
    location: str = ""
    notes: str = ""
    background_image: str = ""
    background_prompt: str = ""

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


class PlayerCharacter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the character
    campaign_id: Optional[str] = None  # None if not linked to campaign yet
    
    # Basic Info
    name: str
    race: str  # Human, Elf, Dwarf, etc.
    subrace: str = ""  # High Elf, Hill Dwarf, etc.
    character_class: str  # Fighter, Wizard, etc.
    subclass: str = ""
    background: str = ""
    level: int = 1
    experience_points: int = 0
    edition: str = "2014"  # D&D edition: "2014" or "2024"
    ruleset_id: str = "dnd5e_2014"  # canonical ruleset key
    
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
    
    # Class Resources (Ki Points, Rage, Sorcery Points, etc.)
    # { "ki_points": 3, "rage": 2 } = current remaining uses
    resources: Dict[str, int] = {}
    # Max resources are computed on the frontend from class data
    
    # Combat State (tracked by Combat Tab)
    conditions: List[str] = []  # ["blinded", "poisoned"]
    inspiration: bool = False
    concentrating_on: str = ""
    used_spell_slots: Dict[str, int] = {}  # {"1": 2, "pact": 1} = used slots per level
    
    # Meta
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerCharacterCreate(BaseModel):
    name: str
    race: str
    subrace: Optional[str] = ""
    character_class: str
    subclass: str = ""
    background: str = ""
    level: int = 1
    edition: str = "2014"  # D&D edition: "2014" or "2024"
    ruleset_id: str = "dnd5e_2014"
    
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

    # Proficiencies & traits chosen during character creation
    skill_proficiencies: Optional[List[str]] = []
    saving_throw_proficiencies: Optional[List[str]] = []
    weapon_proficiencies: Optional[List[str]] = []
    armor_proficiencies: Optional[List[str]] = []
    tool_proficiencies: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    racial_traits: Optional[List[Dict[str, str]]] = []
    class_features: Optional[List[Dict[str, str]]] = []
    
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
    subrace: Optional[str] = None
    character_class: Optional[str] = None
    subclass: Optional[str] = None
    background: Optional[str] = None
    level: Optional[int] = None
    experience_points: Optional[int] = None
    edition: Optional[str] = None  # "2014" or "2024"
    rules_edition: Optional[str] = None  # Alias for edition
    ruleset_id: Optional[str] = None
    
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
    tool_proficiencies: Optional[List[str]] = None
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
    
    # Resources
    resources: Optional[Dict[str, int]] = None
    
    # Combat State
    death_saves_successes: Optional[int] = None
    death_saves_failures: Optional[int] = None
    conditions: Optional[List[str]] = None
    inspiration: Optional[bool] = None
    concentrating_on: Optional[str] = None
    used_spell_slots: Optional[Dict[str, int]] = None
    
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

class ProgressionRuleSystem(BaseModel):
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
    hp_method: str = "average"  # "average", "roll", or "manual"
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
    color: str = "#D4A017"
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
    color: str = "#D4A017"
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
    campaign_id: Optional[str] = None

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
    image_url: str = ""
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
    image_url: str = ""

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
    image_url: Optional[str] = None

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
    image_url: str = ""
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
    image_url: str = ""

class CustomItemUpdate(BaseModel):
    name: Optional[str] = None
    item_type: Optional[str] = None
    rarity: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[str] = None
    attunement: Optional[bool] = None
    value: Optional[str] = None
    weight: Optional[float] = None
    image_url: Optional[str] = None


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


class SiteSettingsUpdate(BaseModel):
    announcement_enabled: bool = False
    announcement_text: str = Field(default="", max_length=240)
    maintenance_mode: bool = False

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

class GenerateNPCRequest(BaseModel):
    prompt: str = ""
    race: str = ""
    class_name: str = ""
    level: int = 5
    role: str = ""


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


class LevelUpRequest(BaseModel):
    new_level: int
    choice_type: str = "standard"  # "asi", "feat", or "standard"
    # For ASI: {"ability1": "strength", "ability2": "dexterity"} or {"ability1": "strength", "ability2": "strength"} for +2 to one
    asi_choices: Optional[Dict[str, str]] = None
    # For Feat: {"name": "Alert", "description": "..."}
    feat_choice: Optional[Dict[str, str]] = None
    # Optional HP die result (virtual roll or manually entered physical roll)
    hp_roll: Optional[int] = None
    hp_method: Optional[str] = None  # "average", "roll", or "manual"
    # Spellcasting: new spells learned at this level
    new_spells: Optional[List[Dict[str, Any]]] = None
    new_cantrips: Optional[List[Dict[str, Any]]] = None
    # Fighter-specific
    fighting_style: Optional[str] = None
    subclass: Optional[str] = None
    maneuvers: Optional[List[str]] = None
    # Multiclass
    multiclass: Optional[bool] = None
    new_class: Optional[str] = None


class TemplateMatchRequest(BaseModel):
    ruleset_id: str = "dnd5e_2014"
    description: str = ""


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


class PortraitGenerateRequest(BaseModel):
    name: str
    race: str
    character_class: str
    gender: str = "neutral"
    appearance: str = ""


class TokenGenerateRequest(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str = "enemy"  # player, ally, enemy
    campaign_id: str
    prompt: Optional[str] = None


class SessionRecapRequest(BaseModel):
    campaign_id: str
    notes: str
    style: str = "narrative"  # narrative, bullet, detailed
    sections: List[str] = ["summary", "keyEvents", "npcsEncountered", "combatHighlights", "lootObtained", "nextSessionHooks"]


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


class RookChatRequest(BaseModel):
    message: str
    campaign_id: str = ""
    context: str = ""

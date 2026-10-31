"""Progression routes: modular level-up system with rule system awareness."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, HIT_DICE, logger, get_subclass_unlock_level
from utils.auth import get_current_user, is_admin
from models import (
    ProgressionRuleSystem, ProgressionClass, ProgressionRace,
    ProgressionFeature, FeatureChoice, ClassLevelProgression,
    CharacterFeatureSelection, LevelUpWizardState, ProgressionQueryRequest
)
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime, timezone

router = APIRouter()


async def require_admin(username: str) -> None:
    """Gate the global, cross-tenant progression writes.

    The collections these endpoints write -- rule_systems, progression_classes,
    progression_races, progression_features, feature_choices and
    class_level_progressions -- are global reference data, not per-user rows.
    They are served to every player by the level-up wizard and are read by
    get_campaign_rule_system, so an ordinary account must not be able to
    create or overwrite them.

    Uses the shared utils.auth.is_admin (ADMIN_USERNAMES) rather than a local
    list, so there is one definition of who is an admin.
    """
    if not await is_admin(username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

@router.get("/progression/systems")
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

@router.post("/progression/systems")
async def create_rule_system(system: ProgressionRuleSystem, username: str = Depends(get_current_user)):
    """Create a new rule system (admin only)"""
    await require_admin(username)
    system_dict = system.model_dump()
    system_dict['created_by'] = username
    await db.rule_systems.insert_one(system_dict)
    return {"success": True, "system": system_dict}

@router.get("/progression/classes")
async def get_progression_classes(system_id: Optional[str] = None):
    """Get all classes, optionally filtered by system"""
    query = {}
    if system_id:
        query['system_id'] = system_id
    classes = await db.progression_classes.find(query, {'_id': 0}).to_list(100)
    return {"classes": classes}

@router.get("/progression/classes/{class_id}")
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

@router.post("/progression/classes")
async def create_progression_class(cls: ProgressionClass, username: str = Depends(get_current_user)):
    """Create a new class definition"""
    await require_admin(username)
    cls_dict = cls.model_dump()
    cls_dict['created_by'] = username
    await db.progression_classes.insert_one(cls_dict)
    return {"success": True, "class": cls_dict}

@router.get("/progression/races")
async def get_progression_races(system_id: Optional[str] = None):
    """Get all races, optionally filtered by system"""
    query = {}
    if system_id:
        query['system_id'] = system_id
    races = await db.progression_races.find(query, {'_id': 0}).to_list(100)
    return {"races": races}

@router.post("/progression/races")
async def create_progression_race(race: ProgressionRace, username: str = Depends(get_current_user)):
    """Create a new race definition"""
    await require_admin(username)
    race_dict = race.model_dump()
    race_dict['created_by'] = username
    await db.progression_races.insert_one(race_dict)
    return {"success": True, "race": race_dict}

@router.get("/progression/features")
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

@router.post("/progression/features")
async def create_progression_feature(feature: ProgressionFeature, username: str = Depends(get_current_user)):
    """Create a new feature"""
    await require_admin(username)
    feature_dict = feature.model_dump()
    feature_dict['created_by'] = username
    await db.progression_features.insert_one(feature_dict)
    return {"success": True, "feature": feature_dict}

@router.get("/progression/feature-choices/{feature_id}")
async def get_feature_choices(feature_id: str):
    """Get all choices available for a feature"""
    choices = await db.feature_choices.find({'feature_id': feature_id}, {'_id': 0}).to_list(100)
    return {"choices": choices}

@router.post("/progression/feature-choices")
async def create_feature_choice(choice: FeatureChoice, username: str = Depends(get_current_user)):
    """Create a new feature choice"""
    await require_admin(username)
    choice_dict = choice.model_dump()
    choice_dict['created_by'] = username
    await db.feature_choices.insert_one(choice_dict)
    return {"success": True, "choice": choice_dict}

@router.get("/progression/class-level/{class_id}/{level}")
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

@router.post("/progression/class-levels")
async def create_class_level_progression(
    progression: ClassLevelProgression, 
    username: str = Depends(get_current_user)
):
    """Create or update class level progression"""
    await require_admin(username)
    prog_dict = progression.model_dump()
    prog_dict['created_by'] = username
    
    # Upsert to allow updates
    await db.class_level_progressions.update_one(
        {'class_id': progression.class_id, 'level': progression.level},
        {'$set': prog_dict},
        upsert=True
    )
    return {"success": True, "progression": prog_dict}

@router.get("/progression/level-up-wizard/{character_id}")
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

@router.post("/progression/character-features")
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

@router.get("/progression/character-features/{character_id}")
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

@router.post("/progression/seed-default-data")
async def seed_default_progression_data(username: str = Depends(get_current_user)):
    """Seed the database with default 5e progression data"""
    # Previously gated by a substring test against a hardcoded name list, so
    # any username merely containing the word admin cleared it -- "admin1",
    # "myadmin" and "badminton" all passed, and SAFE_USERNAME_RE accepts those.
    # It also ignored ADMIN_USERNAMES, so the configured admin was not covered.
    await require_admin(username)
    
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

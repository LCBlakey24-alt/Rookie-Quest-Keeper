"""Character routes: CRUD, level up, multiclass, journal, campaign linking."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, HIT_DICE, logger, get_subclass_unlock_level
from utils.auth import (
    get_current_user, verify_campaign_ownership, verify_campaign_membership,
    check_premium_feature, increment_ai_usage, get_user_subscription,
    get_campaign_rule_system
)
from models import (
    PlayerCharacter, PlayerCharacterCreate, PlayerCharacterUpdate,
    LevelUpRequest, CampaignJoinRequest, AICharacterGenerateRequest,
    JournalEntry, JournalEntryCreate, SUBSCRIPTION_PLANS, TemplateMatchRequest
)
from typing import Optional, Dict, Any, List
import uuid
import json
import os
from datetime import datetime, timezone

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
except ImportError:
    LlmChat = None
    UserMessage = None
    EMERGENT_KEY = None

router = APIRouter()


def normalize_ruleset_id(edition: str, explicit_ruleset_id: str = "") -> str:
    if explicit_ruleset_id:
        return explicit_ruleset_id
    return "dnd5e_2024" if str(edition) == "2024" else "dnd5e_2014"

@router.get("/characters")
async def get_user_characters(username: str = Depends(get_current_user)):
    """Get all characters owned by the current user"""
    characters = await db.player_characters.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)  # Limit to 100 characters per user
    return characters

@router.post("/characters", response_model=dict)
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
    ruleset_id = normalize_ruleset_id(edition, getattr(character, 'ruleset_id', ''))
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
                       'portrait_url', 'campaign_id', 'ruleset_id']
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
        spellcasting_ability=spellcasting_ability,
        ruleset_id=ruleset_id
    )
    
    await db.player_characters.insert_one(new_character.model_dump())
    
    return {
        "success": True,
        "message": f"{new_character.name} created successfully!",
        "character_id": new_character.id,
        "character": new_character.model_dump()
    }

@router.get("/characters/{character_id}")
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

@router.put("/characters/{character_id}")
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
    if 'rules_edition' in update_data and update_data['rules_edition'] and 'edition' not in update_data:
        update_data['edition'] = update_data['rules_edition']

    if 'edition' in update_data and 'ruleset_id' not in update_data:
        update_data['ruleset_id'] = normalize_ruleset_id(update_data['edition'])

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
@router.post("/characters/{character_id}/level-up")
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

    # Persist new spells/cantrips from level-up selections
    # Rules guardrails:
    # - Wizard learns exactly 2 spells per wizard level.
    # - Known casters can only learn net gain for that level.
    known_caster_progression = {
        'bard': {1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 12: 15, 13: 16, 14: 18, 15: 19, 16: 19, 17: 20, 18: 22, 19: 22, 20: 22},
        'sorcerer': {1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 15, 20: 15},
        'warlock': {1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10, 11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15},
        'ranger': {2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6, 11: 7, 12: 7, 13: 8, 14: 8, 15: 9, 16: 9, 17: 10, 18: 10, 19: 11, 20: 11},
    }
    new_spells = level_up.new_spells or []
    if char_class == 'wizard' and len(new_spells) not in (0, 2):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wizard level-up requires exactly 2 new spells.")
    if char_class in known_caster_progression:
        table = known_caster_progression[char_class]
        old_known = table.get(current_level, 0)
        new_known = table.get(level_up.new_level, old_known)
        expected_gain = max(0, new_known - old_known)
        if len(new_spells) not in (0, expected_gain):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{existing.get('character_class')} level-up expects {expected_gain} new spell(s)."
            )

    if new_spells:
        existing_spells = existing.get('spells_known', [])
        for spell in new_spells:
            if not any(s.get('name') == spell.get('name') for s in existing_spells):
                existing_spells.append(spell)
        update_data['spells_known'] = existing_spells

    if level_up.new_cantrips:
        existing_cantrips = existing.get('cantrips_known', [])
        for cantrip in level_up.new_cantrips:
            if not any(c.get('name') == cantrip.get('name') for c in existing_cantrips):
                existing_cantrips.append(cantrip)
        update_data['cantrips_known'] = existing_cantrips

    # Handle class-specific level-up fields
    if hasattr(level_up, 'fighting_style') and level_up.fighting_style:
        update_data['fighting_style'] = level_up.fighting_style
    if hasattr(level_up, 'subclass') and level_up.subclass:
        update_data['subclass'] = level_up.subclass
    if hasattr(level_up, 'maneuvers') and level_up.maneuvers:
        existing_maneuvers = existing.get('maneuvers', [])
        for m in level_up.maneuvers:
            if m not in existing_maneuvers:
                existing_maneuvers.append(m)
        update_data['maneuvers'] = existing_maneuvers

    # Auto-scale Fighter resources based on level
    if char_class == 'fighter':
        # Extra Attack scaling
        if level_up.new_level >= 20:
            update_data['extra_attacks'] = 3
        elif level_up.new_level >= 11:
            update_data['extra_attacks'] = 2
        elif level_up.new_level >= 5:
            update_data['extra_attacks'] = 1

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


@router.delete("/characters/{character_id}")
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


@router.patch("/characters/{character_id}")
async def patch_character(
    character_id: str,
    updates: Dict[str, Any],
    username: str = Depends(get_current_user)
):
    """Partial update for character fields (HP, combat state, etc.)"""
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    
    # Whitelist of fields allowed via PATCH
    allowed = {
        'hp', 'current_hit_points', 'max_hit_points', 'temporary_hit_points',
        'hit_dice_remaining', 'death_saves_successes', 'death_saves_failures',
        'conditions', 'inspiration', 'concentrating_on', 'used_spell_slots',
        'resources', 'notes', 'equipped', 'equipment', 'inventory',
        'armor_class', 'speed', 'currency', 'gold', 'attuned_items',
        'exhaustion_level', 'backstory',
    }
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid fields to update")
    
    # Map 'hp' shorthand to 'current_hit_points'
    if 'hp' in filtered:
        filtered['current_hit_points'] = filtered.pop('hp')
    
    filtered['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': filtered}
    )
    
    updated = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return updated


@router.put("/characters/{character_id}/resources")
async def update_character_resources(
    character_id: str,
    resources: Dict[str, int],
    username: str = Depends(get_current_user)
):
    """Update character class resources (Ki Points, Rage, etc.)"""
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': {'resources': resources, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {"resources": resources}


@router.post("/characters/{character_id}/short-rest")
async def short_rest(
    character_id: str,
    hit_dice_to_spend: Optional[int] = 0,
    username: str = Depends(get_current_user)
):
    """
    Short rest: restore short-rest resources, optionally spend hit dice to heal.
    Resources to restore are determined by the frontend based on class data.
    The frontend sends the new resource values after computing restores.
    """
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    update = {'updated_at': datetime.now(timezone.utc).isoformat()}

    # Spend hit dice to heal
    if hit_dice_to_spend and hit_dice_to_spend > 0:
        remaining_dice = existing.get('hit_dice_remaining', existing.get('level', 1))
        dice_to_spend = min(hit_dice_to_spend, remaining_dice)
        if dice_to_spend > 0:
            char_class = existing.get('character_class', '').lower()
            hit_die_size = HIT_DICE.get(char_class.title(), 8)
            con_mod = (existing.get('constitution', 10) - 10) // 2
            # Average roll per die + CON mod
            hp_healed = dice_to_spend * ((hit_die_size // 2 + 1) + con_mod)
            hp_healed = max(dice_to_spend, hp_healed)  # min 1 HP per die
            new_hp = min(
                existing.get('max_hit_points', 10),
                existing.get('current_hit_points', 0) + hp_healed
            )
            update['current_hit_points'] = new_hp
            update['hit_dice_remaining'] = remaining_dice - dice_to_spend

    # Warlock pact magic restores on short rest
    char_class = existing.get('character_class', '').lower()
    if char_class == 'warlock':
        spell_slots = existing.get('spell_slots', {})
        for level_str, max_slots in spell_slots.items():
            update[f'spell_slots_{level_str}_used'] = 0

    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update}
    )

    updated = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return updated


@router.post("/characters/{character_id}/long-rest")
async def long_rest(
    character_id: str,
    username: str = Depends(get_current_user)
):
    """
    Long rest: restore all HP, half hit dice (min 1), all spell slots,
    and all resources (both short-rest and long-rest).
    """
    existing = await db.player_characters.find_one({'id': character_id, 'user_id': username})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    level = existing.get('level', 1)
    max_hp = existing.get('max_hit_points', 10)

    update = {
        'current_hit_points': max_hp,
        'hit_dice_remaining': min(level, existing.get('hit_dice_remaining', 0) + max(1, level // 2)),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }

    # Cap hit dice at level
    if update['hit_dice_remaining'] > level:
        update['hit_dice_remaining'] = level

    # Restore all spell slots
    spell_slots = existing.get('spell_slots', {})
    if spell_slots:
        for level_str in spell_slots:
            update[f'spell_slots_{level_str}_used'] = 0
    # Also check individual spell_slots_N fields
    for key in existing:
        if key.startswith('spell_slots_') and key.endswith('_used'):
            update[key] = 0

    # Resources are reset by frontend (sends full resource dict)
    # But we can clear resources to empty so frontend re-initializes them to max
    update['resources'] = {}

    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update}
    )

    updated = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return updated


@router.get("/characters/{character_id}/level-up-info")
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

@router.post("/characters/{character_id}/link-campaign")
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

@router.get("/campaigns/{campaign_id}/join-code")
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

@router.post("/campaigns/join")
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

@router.get("/campaigns/{campaign_id}/players")
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

@router.get("/player/campaigns")
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

@router.get("/player/campaign/{campaign_id}/inventory")
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

@router.get("/player/journal")
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

@router.post("/player/journal")
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

@router.put("/player/journal/{entry_id}")
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

@router.delete("/player/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a journal entry"""
    result = await db.player_journal.delete_one({'id': entry_id, 'user_id': username})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": "Entry deleted"}

@router.post("/ai/generate-character")
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

@router.post("/characters/{character_id}/multiclass")
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

@router.post("/characters/{character_id}/level-up-class")
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


@router.post("/characters/{character_id}/send-item")
async def send_item_to_character(
    character_id: str,
    item_data: Dict[str, Any],
    username: str = Depends(get_current_user)
):
    """GM sends a magical item or gear to a character."""
    character = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    campaign_id = character.get('campaign_id')
    if campaign_id:
        await verify_campaign_ownership(campaign_id, username)

    item = {
        'id': str(uuid.uuid4()),
        'name': item_data.get('name', 'Unknown Item'),
        'type': item_data.get('type', 'wondrous'),
        'rarity': item_data.get('rarity', 'common'),
        'description': item_data.get('description', ''),
        'requires_attunement': item_data.get('requires_attunement', False),
        'attuned': False,
        'equipped': False,
        'properties': item_data.get('properties', []),
        'sent_by_gm': True,
        'sent_at': datetime.now(timezone.utc).isoformat(),
    }

    inventory = character.get('inventory', [])
    inventory.append(item)

    await db.player_characters.update_one(
        {'id': character_id},
        {'$set': {'inventory': inventory, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )

    return {"success": True, "item": item, "message": f"{item['name']} sent to {character.get('name', 'character')}"}


@router.patch("/characters/{character_id}/attunement")
async def update_attunement(
    character_id: str,
    data: Dict[str, Any],
    username: str = Depends(get_current_user)
):
    """Toggle attunement on an item."""
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    item_id = data.get('item_id')
    attune = data.get('attune', False)

    inventory = character.get('inventory', [])
    attuned_count = sum(1 for i in inventory if i.get('attuned'))

    for item in inventory:
        if item.get('id') == item_id:
            if attune and not item.get('attuned'):
                if attuned_count >= 3:
                    raise HTTPException(status_code=400, detail="Maximum 3 attuned items. Unattune one first.")
                item['attuned'] = True
            elif not attune:
                item['attuned'] = False
            break

    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': {'inventory': inventory, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )

    updated = await db.player_characters.find_one({'id': character_id}, {'_id': 0})
    return updated

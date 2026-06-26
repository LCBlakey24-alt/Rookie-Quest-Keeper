"""Character routes: CRUD, level up, multiclass, journal, campaign linking."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, HIT_DICE, logger, get_subclass_unlock_level
from utils.auth import (
    get_current_user, verify_campaign_ownership, verify_campaign_membership,
    check_ai_access, record_ai_usage,
    get_campaign_rule_system
)
from models import (
    PlayerCharacter, PlayerCharacterCreate, PlayerCharacterUpdate,
    LevelUpRequest, CampaignJoinRequest, AICharacterGenerateRequest,
    JournalEntry, JournalEntryCreate, TemplateMatchRequest
)
from typing import Optional, Dict, Any, List
import uuid
import json
from datetime import datetime, timezone
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key

router = APIRouter()

# ── Spell slot helpers ────────────────────────────────────────────────────────

_FULL_CASTER_SLOTS = {
    1: {1: 2}, 2: {1: 3}, 3: {1: 4, 2: 2}, 4: {1: 4, 2: 3},
    5: {1: 4, 2: 3, 3: 2}, 6: {1: 4, 2: 3, 3: 3}, 7: {1: 4, 2: 3, 3: 3, 4: 1},
    8: {1: 4, 2: 3, 3: 3, 4: 2}, 9: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
    10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}, 11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
    12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1}, 13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
    14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1}, 15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
    16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1}, 17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
    18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1}, 19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1},
    20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1},
}

_FULL_CASTERS = {'bard', 'cleric', 'druid', 'sorcerer', 'wizard'}
_HALF_CASTERS = {'paladin', 'ranger'}
_PACT_MAGIC = {'warlock'}


def compute_multiclass_spell_slots(classes: list) -> dict:
    """D&D 5e combined multiclass spell slot table.

    Full-caster levels count fully; half-caster levels count as half (floor);
    Warlock uses its own Pact Magic table separately and does not combine.
    Returns {'1': n, '2': n, ...} matching spell_slots field format.
    """
    combined_level = 0
    for cls in classes:
        name = cls.get('name', '').lower()
        level = int(cls.get('level', 0))
        if name in _FULL_CASTERS:
            combined_level += level
        elif name in _HALF_CASTERS:
            combined_level += level // 2
    # Epic / beyond-20 campaigns can keep adding class levels, but the
    # standard 5e multiclass spell-slot table tops out at caster level 20.
    # Cap the lookup so a level 21+ combined caster does not lose spell slots.
    capped_level = min(max(combined_level, 0), 20)
    slots = _FULL_CASTER_SLOTS.get(capped_level, {})
    return {str(k): int(v) for k, v in slots.items()}


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
    proficiency_bonus = character.proficiency_bonus or (2 + ((character.level - 1) // 4))
    
    # Calculate AC from dexterity if not provided
    armor_class = character.armor_class
    if armor_class is None:
        dexterity_modifier = (character.dexterity - 10) // 2
        armor_class = 10 + dexterity_modifier
    
    # Prepare character data, excluding fields that will be calculated or explicitly set
    char_data = character.model_dump()
    excluded_fields = ['max_hit_points', 'current_hit_points', 'temporary_hit_points', 'temp_hp', 'proficiency_bonus', 'armor_class',
                       'hit_dice', 'hit_dice_remaining',
                       'spells_known', 'spells_prepared', 'cantrips_known', 'feats', 'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus', 'spell_slots', 'spell_slots_remaining', 'edition',
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
    spellcasting_ability = character.spellcasting_ability or SPELLCASTING_ABILITIES.get(character.character_class, '')
    
    new_character = PlayerCharacter(
        user_id=username,
        **char_data,
        max_hit_points=max_hp,
        current_hit_points=character.current_hit_points if character.current_hit_points is not None else max_hp,
        temporary_hit_points=character.temporary_hit_points if character.temporary_hit_points is not None else character.temp_hp or 0,
        temp_hp=character.temporary_hit_points if character.temporary_hit_points is not None else character.temp_hp or 0,
        proficiency_bonus=proficiency_bonus,
        armor_class=armor_class,
        hit_dice=character.hit_dice or f"1d{hit_die}",
        hit_dice_remaining=character.hit_dice_remaining if character.hit_dice_remaining is not None else character.level,
        spells_known=normalized_spells_known,
        spells_prepared=normalized_spells_prepared,
        cantrips_known=normalized_cantrips,
        spellcasting_ability=spellcasting_ability,
        spell_save_dc=character.spell_save_dc or 0,
        spell_attack_bonus=character.spell_attack_bonus or 0,
        spell_slots=character.spell_slots or {},
        spell_slots_remaining=character.spell_slots_remaining or character.spell_slots or {},
        feats=character.feats or [],
        edition=edition,
        portrait_url=character.portrait_url or '',
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


@router.delete("/characters/{character_id}")
async def delete_character(
    character_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a character owned by the current user."""
    result = await db.player_characters.delete_one({'id': character_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found"
        )
    await db.journal_entries.delete_many({'character_id': character_id, 'user_id': username})
    return {"message": "Character deleted successfully"}


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

    hp_method = (level_up.hp_method or ('roll' if level_up.hp_roll is not None else 'average')).lower()
    if hp_method not in {'average', 'roll', 'manual'}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hp_method must be average, roll, or manual"
        )

    if hp_method in {'roll', 'manual'}:
        if level_up.hp_roll is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="hp_roll is required when rolling hit points"
            )
        if level_up.hp_roll < 1 or level_up.hp_roll > hit_die:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"hp_roll must be between 1 and {hit_die}"
            )
        hp_increase = level_up.hp_roll + con_mod
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
                'applied_at': datetime.now(timezone.utc).isoformat()
            }
        elif level_up.choice_type == 'feat' and level_up.feat_choice:
            # Add feat
            new_feat = {
                'name': level_up.feat_choice,
                'level_taken': level_up.new_level,
                'description': '',
                'source': 'level_up',
                'chosen_at': datetime.now(timezone.utc).isoformat()
            }
            feats.append(new_feat)
            level_progression[str(level_up.new_level)] = {
                'type': 'feat',
                'feat': level_up.feat_choice,
                'applied_at': datetime.now(timezone.utc).isoformat()
            }
        
        update_data['level_progression'] = level_progression,
        update_data['asi_increases'] = asi_increases
        update_data['feats'] = feats

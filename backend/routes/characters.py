"""Character routes: core CRUD, level up, journal, and campaign linking."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, HIT_DICE, get_subclass_unlock_level
from utils.auth import get_current_user, verify_campaign_membership
from models import (
    PlayerCharacter,
    PlayerCharacterCreate,
    PlayerCharacterUpdate,
    LevelUpRequest,
    JournalEntry,
    JournalEntryCreate,
)
from typing import Dict, Any
from datetime import datetime, timezone

router = APIRouter()

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
_WARLOCK = {'warlock'}


def normalize_ruleset_id(edition: str, explicit_ruleset_id: str = "") -> str:
    if explicit_ruleset_id:
        return explicit_ruleset_id
    return "dnd5e_2024" if str(edition) == "2024" else "dnd5e_2014"


def class_key(value: str) -> str:
    return str(value or '').strip().lower()


def hit_die_for(character_class: str) -> int:
    return HIT_DICE.get(character_class, HIT_DICE.get(class_key(character_class), 8))


def ability_modifier(score: int) -> int:
    return (int(score or 10) - 10) // 2


def proficiency_for(level: int) -> int:
    return 2 + ((max(1, int(level or 1)) - 1) // 4)


def calculate_spell_slots(character_class: str, level: int) -> Dict[str, int]:
    key = class_key(character_class)
    level = min(max(1, int(level or 1)), 20)
    if key in _FULL_CASTERS:
        slots = _FULL_CASTER_SLOTS.get(level, {})
    elif key in _HALF_CASTERS:
        slots = _FULL_CASTER_SLOTS.get(max(1, level // 2), {}) if level >= 2 else {}
    elif key in _WARLOCK:
        warlock_level = min(level, 20)
        pact_level = 1 if warlock_level <= 2 else 2 if warlock_level <= 4 else 3 if warlock_level <= 6 else 4 if warlock_level <= 8 else 5
        pact_slots = 1 if warlock_level == 1 else 2 if warlock_level <= 10 else 3 if warlock_level <= 16 else 4
        slots = {pact_level: pact_slots}
    else:
        slots = {}
    return {str(k): int(v) for k, v in slots.items()}


def spellcasting_ability_for(character_class: str) -> str:
    abilities = {
        'bard': 'charisma', 'cleric': 'wisdom', 'druid': 'wisdom',
        'paladin': 'charisma', 'ranger': 'wisdom', 'sorcerer': 'charisma',
        'warlock': 'charisma', 'wizard': 'intelligence',
        'fighter': 'intelligence', 'rogue': 'intelligence',
    }
    return abilities.get(class_key(character_class), '')


def normalize_spell_list(spell_list):
    if not spell_list:
        return []
    return [spell if isinstance(spell, dict) else {"name": str(spell), "level": 0} for spell in spell_list]


async def get_owned_character(character_id: str, username: str) -> dict:
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    return character


@router.get("/characters")
async def get_user_characters(username: str = Depends(get_current_user)):
    """Get all characters owned by the current user."""
    return await db.player_characters.find({'user_id': username}, {'_id': 0}).sort('created_at', -1).to_list(100)


@router.post("/characters", response_model=dict)
async def create_character(character: PlayerCharacterCreate, username: str = Depends(get_current_user)):
    """Create a new player character."""
    edition = getattr(character, 'edition', '2014')
    ruleset_id = normalize_ruleset_id(edition, getattr(character, 'ruleset_id', ''))

    if character.subclass:
        unlock_level = get_subclass_unlock_level(character.character_class, edition)
        if character.level < unlock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{character.character_class}s cannot select a subclass until level {unlock_level} in {edition} rules",
            )

    hit_die = hit_die_for(character.character_class)
    con_mod = ability_modifier(character.constitution)
    max_hp = character.max_hit_points if character.max_hit_points is not None else max(1, hit_die + con_mod)
    ac = character.armor_class if character.armor_class is not None else 10 + ability_modifier(character.dexterity)
    proficiency_bonus = character.proficiency_bonus or proficiency_for(character.level)
    spellcasting_ability = character.spellcasting_ability or spellcasting_ability_for(character.character_class)
    spell_slots = character.spell_slots or calculate_spell_slots(character.character_class, character.level)

    char_data = character.model_dump()
    for field in [
        'max_hit_points', 'current_hit_points', 'temporary_hit_points', 'temp_hp', 'proficiency_bonus', 'armor_class',
        'hit_dice', 'hit_dice_remaining', 'spells_known', 'spells_prepared', 'cantrips_known', 'feats',
        'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus', 'spell_slots', 'spell_slots_remaining',
        'edition', 'portrait_url', 'campaign_id', 'ruleset_id',
    ]:
        char_data.pop(field, None)

    new_character = PlayerCharacter(
        user_id=username,
        **char_data,
        max_hit_points=max_hp,
        current_hit_points=character.current_hit_points if character.current_hit_points is not None else max_hp,
        temporary_hit_points=character.temporary_hit_points if character.temporary_hit_points is not None else character.temp_hp or 0,
        temp_hp=character.temporary_hit_points if character.temporary_hit_points is not None else character.temp_hp or 0,
        proficiency_bonus=proficiency_bonus,
        armor_class=ac,
        hit_dice=character.hit_dice or f"{character.level}d{hit_die}",
        hit_dice_remaining=character.hit_dice_remaining if character.hit_dice_remaining is not None else character.level,
        spells_known=normalize_spell_list(character.spells_known),
        spells_prepared=normalize_spell_list(character.spells_prepared),
        cantrips_known=normalize_spell_list(character.cantrips_known),
        spellcasting_ability=spellcasting_ability,
        spell_save_dc=character.spell_save_dc or 0,
        spell_attack_bonus=character.spell_attack_bonus or 0,
        spell_slots=spell_slots,
        spell_slots_remaining=character.spell_slots_remaining or spell_slots,
        feats=character.feats or [],
        edition=edition,
        portrait_url=character.portrait_url or '',
        ruleset_id=ruleset_id,
    )

    await db.player_characters.insert_one(new_character.model_dump())
    return {
        "success": True,
        "message": f"{new_character.name} created successfully!",
        "character_id": new_character.id,
        "character": new_character.model_dump(),
    }


@router.get("/characters/{character_id}")
async def get_character(character_id: str, username: str = Depends(get_current_user)):
    """Get a specific character."""
    return await get_owned_character(character_id, username)


async def apply_character_update(character_id: str, character_update: PlayerCharacterUpdate, username: str):
    existing = await get_owned_character(character_id, username)
    update_data = {key: value for key, value in character_update.model_dump().items() if value is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    if 'rules_edition' in update_data and update_data['rules_edition'] and 'edition' not in update_data:
        update_data['edition'] = update_data['rules_edition']
    if 'edition' in update_data and 'ruleset_id' not in update_data:
        update_data['ruleset_id'] = normalize_ruleset_id(update_data['edition'])

    if update_data.get('subclass'):
        edition = update_data.get('edition', existing.get('edition', '2014'))
        character_class = update_data.get('character_class', existing.get('character_class'))
        level = update_data.get('level', existing.get('level', 1))
        unlock_level = get_subclass_unlock_level(character_class, edition)
        if level < unlock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{character_class}s cannot select a subclass until level {unlock_level} in {edition} rules",
            )

    if 'level' in update_data:
        update_data['proficiency_bonus'] = proficiency_for(update_data['level'])
    if 'character_class' in update_data or 'level' in update_data:
        character_class = update_data.get('character_class', existing.get('character_class'))
        level = update_data.get('level', existing.get('level', 1))
        update_data.setdefault('spellcasting_ability', spellcasting_ability_for(character_class))
        update_data.setdefault('spell_slots', calculate_spell_slots(character_class, level))
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    result = await db.player_characters.update_one({'id': character_id, 'user_id': username}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    return await get_owned_character(character_id, username)


@router.put("/characters/{character_id}")
async def update_character(character_id: str, character_update: PlayerCharacterUpdate, username: str = Depends(get_current_user)):
    """Update a character."""
    return await apply_character_update(character_id, character_update, username)


@router.patch("/characters/{character_id}")
async def patch_character(character_id: str, character_update: PlayerCharacterUpdate, username: str = Depends(get_current_user)):
    """Partially update a character."""
    return await apply_character_update(character_id, character_update, username)


@router.delete("/characters/{character_id}")
async def delete_character(character_id: str, username: str = Depends(get_current_user)):
    """Delete a character owned by the current user."""
    result = await db.player_characters.delete_one({'id': character_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    await db.journal_entries.delete_many({'character_id': character_id, 'user_id': username})
    return {"message": "Character deleted successfully"}


@router.post("/characters/{character_id}/level-up")
async def level_up_character(character_id: str, level_up: LevelUpRequest, username: str = Depends(get_current_user)):
    """Handle a simple character level up."""
    existing = await get_owned_character(character_id, username)
    current_level = int(existing.get('level', 1))
    if level_up.new_level != current_level + 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Can only level up from {current_level} to {current_level + 1}")

    character_class = existing.get('character_class', '')
    hit_die = hit_die_for(character_class)
    con_mod = ability_modifier(existing.get('constitution', 10))
    hp_method = (level_up.hp_method or ('roll' if level_up.hp_roll is not None else 'average')).lower()
    if hp_method in {'roll', 'manual'}:
        if level_up.hp_roll is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="hp_roll is required when rolling hit points")
        hp_increase = int(level_up.hp_roll) + con_mod
    else:
        hp_increase = (hit_die // 2 + 1) + con_mod
    hp_increase = max(1, hp_increase)

    feats = existing.get('feats', []) or []
    level_progression = existing.get('level_progression', {}) or {}
    if level_up.choice_type == 'feat' and level_up.feat_choice:
        feats.append({
            'name': level_up.feat_choice,
            'level_taken': level_up.new_level,
            'source': 'level_up',
            'chosen_at': datetime.now(timezone.utc).isoformat(),
        })
    if level_up.choice_type == 'asi' and level_up.asi_choices:
        for ability in [level_up.asi_choices.get('ability1'), level_up.asi_choices.get('ability2')]:
            if ability:
                existing_score = int(existing.get(ability, 10))
                existing[ability] = min(20, existing_score + 1)

    level_progression[str(level_up.new_level)] = {
        'type': level_up.choice_type or 'standard',
        'hp_method': hp_method,
        'hp_roll': level_up.hp_roll,
        'hp_gained': hp_increase,
        'applied_at': datetime.now(timezone.utc).isoformat(),
    }

    update_data = {
        'level': level_up.new_level,
        'proficiency_bonus': proficiency_for(level_up.new_level),
        'max_hit_points': int(existing.get('max_hit_points', 10)) + hp_increase,
        'current_hit_points': int(existing.get('max_hit_points', 10)) + hp_increase,
        'hit_dice': f"{level_up.new_level}d{hit_die}",
        'hit_dice_remaining': level_up.new_level,
        'spell_slots': calculate_spell_slots(character_class, level_up.new_level),
        'spell_slots_remaining': calculate_spell_slots(character_class, level_up.new_level),
        'level_progression': level_progression,
        'feats': feats,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
        if ability in existing:
            update_data[ability] = existing[ability]

    await db.player_characters.update_one({'id': character_id, 'user_id': username}, {'$set': update_data})
    return await get_owned_character(character_id, username)


@router.post("/characters/{character_id}/join-campaign")
async def link_character_to_campaign(character_id: str, join_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Link a character to a campaign by direct campaign id. Join-code support lives on campaign routes."""
    await get_owned_character(character_id, username)
    campaign_id = join_data.get('campaign_id')
    if not campaign_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="campaign_id is required")
    await verify_campaign_membership(campaign_id, username)
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': {'campaign_id': campaign_id, 'updated_at': datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Character linked to campaign", "campaign_id": campaign_id}


@router.get("/characters/{character_id}/journal")
async def get_character_journal(character_id: str, username: str = Depends(get_current_user)):
    """Get journal entries for a character."""
    await get_owned_character(character_id, username)
    return await db.journal_entries.find({'character_id': character_id, 'user_id': username}, {'_id': 0}).sort('created_at', -1).to_list(200)


@router.post("/characters/{character_id}/journal")
async def create_character_journal_entry(character_id: str, entry: JournalEntryCreate, username: str = Depends(get_current_user)):
    """Create a journal entry for a character."""
    await get_owned_character(character_id, username)
    entry_data = entry.model_dump()
    journal_entry = JournalEntry(character_id=character_id, user_id=username, **entry_data)
    await db.journal_entries.insert_one(journal_entry.model_dump())
    return journal_entry.model_dump()


@router.delete("/characters/{character_id}/journal/{entry_id}")
async def delete_character_journal_entry(character_id: str, entry_id: str, username: str = Depends(get_current_user)):
    """Delete a character journal entry."""
    await get_owned_character(character_id, username)
    result = await db.journal_entries.delete_one({'id': entry_id, 'character_id': character_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    return {"message": "Journal entry deleted successfully"}

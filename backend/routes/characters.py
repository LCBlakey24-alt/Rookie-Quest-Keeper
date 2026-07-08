"""Character routes: core CRUD, level up, journal, and campaign linking."""
from fastapi import APIRouter, HTTPException, Depends, status, Request
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
from data.class_progression import (
    subclasses_for,
    feats_for_edition,
    spells_to_learn as progression_spells_to_learn,
    cantrips_to_learn as progression_cantrips_to_learn,
    class_progression_summary,
)
from typing import Dict, Any, Optional
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
_SPELLCASTERS = _FULL_CASTERS | _HALF_CASTERS | _WARLOCK

_PASSTHROUGH_CHARACTER_FIELDS = {
    'resources',
    'homebrew_resources',
    'homebrew_actions',
    'passive_effects',
    'homebrew_scaling',
    'homebrew_upgrades',
    'homebrew_automation_notes',
    'homebrew_content_refs',
}

_MULTICLASS_REQUIREMENTS = {
    'barbarian': {'strength': 13},
    'bard': {'charisma': 13},
    'cleric': {'wisdom': 13},
    'druid': {'wisdom': 13},
    'fighter': {'or': [{'strength': 13}, {'dexterity': 13}]},
    'monk': {'dexterity': 13, 'wisdom': 13},
    'paladin': {'strength': 13, 'charisma': 13},
    'ranger': {'dexterity': 13, 'wisdom': 13},
    'rogue': {'dexterity': 13},
    'sorcerer': {'charisma': 13},
    'warlock': {'charisma': 13},
    'wizard': {'intelligence': 13},
}


def normalize_ruleset_id(edition: str, explicit_ruleset_id: str = "") -> str:
    if explicit_ruleset_id:
        return explicit_ruleset_id
    return "dnd5e_2024" if str(edition) == "2024" else "dnd5e_2014"


def class_key(value: str) -> str:
    return str(value or '').strip().lower()


def display_class_name(value: str) -> str:
    key = class_key(value)
    for class_name in HIT_DICE.keys():
        if class_key(class_name) == key:
            return str(class_name)
    return str(value or '').strip().title() or 'Fighter'


def edition_for(character: Dict[str, Any]) -> str:
    raw = character.get('edition') or character.get('rules_edition') or character.get('ruleset_id') or '2014'
    return '2024' if '2024' in str(raw) else '2014'


def asi_levels_for(character_class: str) -> list[int]:
    levels = [4, 8, 12, 16, 19]
    key = class_key(character_class)
    if key == 'fighter':
        levels.extend([6, 14])
    if key == 'rogue':
        levels.append(10)
    return sorted(set(levels))


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


def passthrough_character_fields(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    return {key: payload[key] for key in _PASSTHROUGH_CHARACTER_FIELDS if key in payload}


def model_update_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    return {key: value for key, value in payload.items() if key not in _PASSTHROUGH_CHARACTER_FIELDS}


async def request_json_payload(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def initial_class_levels(character: Dict[str, Any]) -> Dict[str, int]:
    stored = character.get('class_levels') or {}
    if stored:
        return {display_class_name(name): int(level or 0) for name, level in stored.items() if int(level or 0) > 0}
    return {display_class_name(character.get('character_class', 'Fighter')): int(character.get('level', 1) or 1)}


def hit_dice_string_for(class_levels: Dict[str, int]) -> str:
    dice_counts: Dict[int, int] = {}
    for class_name, level in class_levels.items():
        die = hit_die_for(class_name)
        dice_counts[die] = dice_counts.get(die, 0) + int(level or 0)
    return ' + '.join(f"{count}d{die}" for die, count in sorted(dice_counts.items(), reverse=True) if count > 0) or '1d8'


def compute_multiclass_spell_slots(classes: list[dict]) -> Dict[str, int]:
    """Compute multiclass spell slots from class entries and cap at level 20 table.

    Warlock Pact Magic is intentionally separate from multiclass spellcasting
    slots and is not included in this shared slot table.
    """
    caster_level = 0
    for entry in classes or []:
        class_name = display_class_name(entry.get('name') or entry.get('class_name') or entry.get('character_class') or entry.get('class') or '')
        level = max(0, int(entry.get('level') or entry.get('class_level') or 0))
        key = class_key(class_name)
        if key in _FULL_CASTERS:
            caster_level += level
        elif key in _HALF_CASTERS:
            caster_level += level // 2
        elif key in {'fighter', 'rogue'} and entry.get('subclass') in {'Eldritch Knight', 'Arcane Trickster'}:
            caster_level += level // 3
    return {str(k): int(v) for k, v in _FULL_CASTER_SLOTS.get(min(max(caster_level, 0), 20), {}).items()}


def spell_slots_for_class_levels(primary_class: str, total_level: int, class_levels: Dict[str, int]) -> Dict[str, int]:
    primary_key = class_key(primary_class)
    if primary_key in _SPELLCASTERS:
        return calculate_spell_slots(primary_class, int(class_levels.get(display_class_name(primary_class), total_level) or total_level))
    for class_name, level in class_levels.items():
        if class_key(class_name) in _SPELLCASTERS:
            return calculate_spell_slots(class_name, level)
    return {}


def meets_requirement_dict(character: Dict[str, Any], requirement: Dict[str, int]) -> bool:
    return all(int(character.get(ability, 10) or 10) >= int(minimum) for ability, minimum in requirement.items())


def meets_multiclass_requirements(character: Dict[str, Any], character_class: str) -> bool:
    req = _MULTICLASS_REQUIREMENTS.get(class_key(character_class))
    if not req:
        return False
    if 'or' in req:
        return any(meets_requirement_dict(character, option) for option in req['or'])
    return meets_requirement_dict(character, req)


def multiclass_requirement_text(character_class: str) -> str:
    req = _MULTICLASS_REQUIREMENTS.get(class_key(character_class))
    if not req:
        return 'unknown requirements'
    if 'or' in req:
        return ' or '.join(multiclass_requirement_text_for_req(option) for option in req['or'])
    return multiclass_requirement_text_for_req(req)


def multiclass_requirement_text_for_req(req: Dict[str, int]) -> str:
    return ' and '.join(f"{ability[:3].upper()} {score}" for ability, score in req.items())


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
async def create_character(request: Request, character: PlayerCharacterCreate, username: str = Depends(get_current_user)):
    """Create a new player character."""
    raw_payload = await request_json_payload(request)
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
    proficiency_bonus = getattr(character, 'proficiency_bonus', None) or proficiency_for(character.level)
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

    saved_character = new_character.model_dump()
    saved_character.update(passthrough_character_fields(raw_payload))
    await db.player_characters.insert_one(saved_character)
    return {
        "success": True,
        "message": f"{new_character.name} created successfully!",
        "character_id": new_character.id,
        "character": saved_character,
    }


@router.get("/characters/{character_id}")
async def get_character(character_id: str, username: str = Depends(get_current_user)):
    """Get a specific character."""
    return await get_owned_character(character_id, username)


async def apply_character_update(character_id: str, character_update: PlayerCharacterUpdate, username: str, raw_payload: Optional[Dict[str, Any]] = None):
    existing = await get_owned_character(character_id, username)
    update_data = {key: value for key, value in character_update.model_dump().items() if value is not None}
    update_data.update(passthrough_character_fields(raw_payload))
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
async def update_character(character_id: str, request: Request, username: str = Depends(get_current_user)):
    """Update a character."""
    raw_payload = await request_json_payload(request)
    character_update = PlayerCharacterUpdate.model_validate(model_update_payload(raw_payload))
    return await apply_character_update(character_id, character_update, username, raw_payload)


@router.patch("/characters/{character_id}")
async def patch_character(character_id: str, request: Request, username: str = Depends(get_current_user)):
    """Partially update a character."""
    raw_payload = await request_json_payload(request)
    character_update = PlayerCharacterUpdate.model_validate(model_update_payload(raw_payload))
    return await apply_character_update(character_id, character_update, username, raw_payload)


@router.delete("/characters/{character_id}")
async def delete_character(character_id: str, username: str = Depends(get_current_user)):
    """Delete a character owned by the current user."""
    result = await db.player_characters.delete_one({'id': character_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    await db.journal_entries.delete_many({'character_id': character_id, 'user_id': username})
    return {"message": "Character deleted successfully"}


@router.get("/characters/{character_id}/level-up-options")
async def get_character_level_up_options(
    character_id: str,
    target_level: Optional[int] = None,
    username: str = Depends(get_current_user),
):
    """Return the legal next-level choices before the wizard applies anything."""
    existing = await get_owned_character(character_id, username)
    current_level = int(existing.get('level', 1))
    next_level = int(target_level or current_level + 1)
    if next_level != current_level + 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only preview the next level: {current_level + 1}",
        )

    character_class = display_class_name(existing.get('character_class', 'Fighter'))
    edition = edition_for(existing)
    subclass_unlock_level = get_subclass_unlock_level(character_class, edition)
    already_has_subclass = bool(existing.get('subclass'))
    can_choose_subclass = next_level >= subclass_unlock_level and not already_has_subclass
    general_feats = feats_for_edition(edition, 'general')
    origin_feats = feats_for_edition(edition, 'origin')

    return {
        'character_id': character_id,
        'character_name': existing.get('name', ''),
        'character_class': character_class,
        'edition': edition,
        'ruleset_id': existing.get('ruleset_id') or normalize_ruleset_id(edition),
        'current_level': current_level,
        'target_level': next_level,
        'hit_die': hit_die_for(character_class),
        'proficiency_bonus': proficiency_for(next_level),
        'previous_proficiency_bonus': proficiency_for(current_level),
        'spell_slots': calculate_spell_slots(character_class, next_level),
        'previous_spell_slots': calculate_spell_slots(character_class, current_level),
        'spells_to_learn': progression_spells_to_learn(character_class, current_level, next_level),
        'cantrips_to_learn': progression_cantrips_to_learn(character_class, current_level, next_level),
        'is_asi_level': next_level in asi_levels_for(character_class),
        'asi_levels': asi_levels_for(character_class),
        'can_choose_subclass': can_choose_subclass,
        'subclass_unlock_level': subclass_unlock_level,
        'subclass_options': subclasses_for(character_class) if can_choose_subclass else [],
        'feat_options': general_feats,
        'general_feat_options': general_feats,
        'origin_feat_options': origin_feats,
        'class_levels': initial_class_levels(existing),
        'progression_reference': class_progression_summary(character_class, edition),
    }


def build_level_up_update(existing: Dict[str, Any], level_up: LevelUpRequest, leveled_class: str, progression_type: str) -> Dict[str, Any]:
    current_level = int(existing.get('level', 1))
    if level_up.new_level != current_level + 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Can only level up from {current_level} to {current_level + 1}")

    leveled_class = display_class_name(leveled_class)
    edition = edition_for(existing)
    class_levels = initial_class_levels(existing)
    if progression_type == 'multiclass':
        class_levels[leveled_class] = int(class_levels.get(leveled_class, 0)) + 1
    else:
        current_class = display_class_name(existing.get('character_class', leveled_class))
        class_levels[current_class] = int(class_levels.get(current_class, current_level)) + 1

    class_level_after = int(class_levels.get(leveled_class, 1))
    hit_die = hit_die_for(leveled_class)
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
    progression_entry = {
        'type': progression_type if progression_type == 'multiclass' else (level_up.choice_type or 'standard'),
        'class': leveled_class,
        'class_level': class_level_after,
        'class_levels': class_levels,
        'hp_method': hp_method,
        'hp_roll': level_up.hp_roll,
        'hp_gained': hp_increase,
        'applied_at': datetime.now(timezone.utc).isoformat(),
    }

    if level_up.choice_type == 'feat' and level_up.feat_choice:
        feat_name = level_up.feat_choice.get('name') if isinstance(level_up.feat_choice, dict) else str(level_up.feat_choice)
        feat_description = level_up.feat_choice.get('description', '') if isinstance(level_up.feat_choice, dict) else ''
        feats.append({
            'name': feat_name or 'Feat',
            'description': feat_description,
            'level_taken': level_up.new_level,
            'source': 'level_up',
            'chosen_at': datetime.now(timezone.utc).isoformat(),
        })
        progression_entry['feat'] = feat_name

    if level_up.choice_type == 'asi' and level_up.asi_choices:
        progression_entry['asi_choices'] = level_up.asi_choices
        for ability in [level_up.asi_choices.get('ability1'), level_up.asi_choices.get('ability2')]:
            if ability:
                existing_score = int(existing.get(ability, 10))
                existing[ability] = min(20, existing_score + 1)

    if level_up.subclass:
        unlock_level = get_subclass_unlock_level(leveled_class, edition)
        if class_level_after < unlock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{leveled_class}s cannot select a subclass until class level {unlock_level} in {edition} rules",
            )
        progression_entry['subclass'] = level_up.subclass

    if level_up.fighting_style:
        progression_entry['fighting_style'] = level_up.fighting_style
    if level_up.maneuvers:
        progression_entry['maneuvers'] = level_up.maneuvers

    new_spells = normalize_spell_list(level_up.new_spells or [])
    new_cantrips = normalize_spell_list(level_up.new_cantrips or [])
    if new_spells:
        progression_entry['new_spells'] = new_spells
    if new_cantrips:
        progression_entry['new_cantrips'] = new_cantrips

    level_progression[str(level_up.new_level)] = progression_entry
    primary_class = display_class_name(existing.get('character_class', leveled_class))
    spell_slots = spell_slots_for_class_levels(primary_class, level_up.new_level, class_levels)

    update_data = {
        'level': level_up.new_level,
        'proficiency_bonus': proficiency_for(level_up.new_level),
        'max_hit_points': int(existing.get('max_hit_points', 10)) + hp_increase,
        'current_hit_points': int(existing.get('max_hit_points', 10)) + hp_increase,
        'hit_dice': hit_dice_string_for(class_levels),
        'hit_dice_remaining': level_up.new_level,
        'spell_slots': spell_slots,
        'spell_slots_remaining': spell_slots,
        'level_progression': level_progression,
        'class_levels': class_levels,
        'multiclass_classes': list(class_levels.keys()),
        'feats': feats,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    if level_up.subclass and progression_type != 'multiclass':
        update_data['subclass'] = level_up.subclass
    if level_up.fighting_style:
        update_data['fighting_style'] = level_up.fighting_style
    if level_up.maneuvers:
        update_data['maneuvers'] = level_up.maneuvers
    if new_spells:
        update_data['spells_known'] = normalize_spell_list(existing.get('spells_known', [])) + new_spells
    if new_cantrips:
        update_data['cantrips_known'] = normalize_spell_list(existing.get('cantrips_known', [])) + new_cantrips

    for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
        if ability in existing:
            update_data[ability] = existing[ability]

    return update_data


@router.post("/characters/{character_id}/level-up")
async def level_up_character(character_id: str, level_up: LevelUpRequest, username: str = Depends(get_current_user)):
    """Handle a normal single-class character level up."""
    existing = await get_owned_character(character_id, username)
    leveled_class = display_class_name(existing.get('character_class', 'Fighter'))
    update_data = build_level_up_update(existing, level_up, leveled_class, level_up.choice_type or 'standard')
    await db.player_characters.update_one({'id': character_id, 'user_id': username}, {'$set': update_data})
    return await get_owned_character(character_id, username)


@router.post("/characters/{character_id}/multiclass")
async def multiclass_character(character_id: str, level_up: LevelUpRequest, username: str = Depends(get_current_user)):
    """Add one level in a new class and preserve per-class progression history."""
    existing = await get_owned_character(character_id, username)
    new_class = display_class_name(level_up.new_class or '')
    if not new_class:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_class is required for multiclassing")

    class_levels = initial_class_levels(existing)
    if new_class in class_levels:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{new_class} is already on this character. Use normal level up for the primary class until class-picking progression is added.")

    failed_current = [class_name for class_name in class_levels if not meets_multiclass_requirements(existing, class_name)]
    if failed_current:
        details = ', '.join(f"{name} requires {multiclass_requirement_text(name)}" for name in failed_current)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Character does not meet requirements to multiclass out of current class: {details}")

    if not meets_multiclass_requirements(existing, new_class):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Character does not meet requirements for {new_class}: {multiclass_requirement_text(new_class)}")

    update_data = build_level_up_update(existing, level_up, new_class, 'multiclass')
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

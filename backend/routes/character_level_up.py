"""Focused character level-up routes that preserve in-session player state.

The legacy character router owns the progression calculation itself. This
focused router runs before it and keeps level-up from behaving like a free long
rest: gaining a level can increase maximum capacity without restoring resources
that were already spent.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import LevelUpRequest
from utils.auth import get_current_user
from routes.characters import (
    build_level_up_update,
    class_key,
    display_class_name,
    get_owned_character,
    initial_class_levels,
    meets_multiclass_requirements,
    multiclass_requirement_text,
)

router = APIRouter()


def _safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _slot_dict(value: Any, *, keep_zero: bool = False) -> Dict[str, int]:
    if not isinstance(value, dict):
        return {}
    result: Dict[str, int] = {}
    for raw_level, raw_count in value.items():
        count = max(0, _safe_int(raw_count, 0))
        if count > 0 or keep_zero:
            result[str(raw_level)] = count
    return result


def preserve_spell_slot_usage(
    previous_max: Any,
    previous_remaining: Any,
    next_max: Any,
    *,
    pooled: bool = False,
) -> Dict[str, int]:
    """Carry spent slots forward while allowing newly gained capacity.

    Standard spell slots are tracked per spell level. Pact Magic is effectively
    one pool whose slot rank can change, so ``pooled`` preserves the number of
    slots spent even when that dictionary key changes on level-up.
    """
    old_max = _slot_dict(previous_max)
    old_remaining = _slot_dict(previous_remaining, keep_zero=True) if isinstance(previous_remaining, dict) else dict(old_max)
    new_max = _slot_dict(next_max)

    if not new_max:
        return {}

    if pooled:
        old_total = sum(old_max.values())
        remaining_total = min(old_total, sum(old_remaining.values()))
        spent_total = max(0, old_total - remaining_total)
        new_total = sum(new_max.values())
        next_remaining_total = max(0, new_total - spent_total)

        result: Dict[str, int] = {}
        for level, capacity in sorted(new_max.items(), key=lambda item: _safe_int(item[0], 0), reverse=True):
            available = min(capacity, next_remaining_total)
            result[level] = available
            next_remaining_total -= available
        return result

    result: Dict[str, int] = {}
    for level, capacity in new_max.items():
        old_capacity = max(0, old_max.get(level, 0))
        old_available = min(old_capacity, max(0, old_remaining.get(level, old_capacity)))
        spent = max(0, old_capacity - old_available)
        result[level] = max(0, capacity - spent)
    return result


def preserve_level_up_state(existing: Dict[str, Any], update_data: Dict[str, Any], leveled_class: str) -> Dict[str, Any]:
    """Apply progression gains without restoring already-spent adventuring state."""
    safe = dict(update_data)
    old_level = max(1, _safe_int(existing.get('level'), 1))
    new_level = max(old_level + 1, _safe_int(safe.get('level'), old_level + 1))
    old_max_hp = max(1, _safe_int(existing.get('max_hit_points'), 1))
    new_max_hp = max(old_max_hp, _safe_int(safe.get('max_hit_points'), old_max_hp))
    hp_gained = max(0, new_max_hp - old_max_hp)
    old_current_hp = max(0, min(old_max_hp, _safe_int(existing.get('current_hit_points'), old_max_hp)))

    # Gaining a level grants the newly gained HP, but does not heal unrelated
    # damage back to the character's maximum.
    safe['current_hit_points'] = min(new_max_hp, old_current_hp + hp_gained)

    old_hit_dice_remaining = max(0, min(old_level, _safe_int(existing.get('hit_dice_remaining'), old_level)))
    safe['hit_dice_remaining'] = min(new_level, old_hit_dice_remaining + 1)

    safe['spell_slots_remaining'] = preserve_spell_slot_usage(
        existing.get('spell_slots'),
        existing.get('spell_slots_remaining'),
        safe.get('spell_slots'),
        pooled=class_key(leveled_class) == 'warlock',
    )
    return safe


def build_safe_level_up_update(existing: Dict[str, Any], level_up: LevelUpRequest, leveled_class: str, progression_type: str) -> Dict[str, Any]:
    calculated = build_level_up_update(existing, level_up, leveled_class, progression_type)
    return preserve_level_up_state(existing, calculated, leveled_class)


@router.post("/characters/{character_id}/level-up")
async def level_up_character_safely(
    character_id: str,
    level_up: LevelUpRequest,
    username: str = Depends(get_current_user),
):
    """Level the primary class without silently restoring spent resources."""
    existing = await get_owned_character(character_id, username)
    leveled_class = display_class_name(existing.get('character_class', 'Fighter'))
    update_data = build_safe_level_up_update(
        existing,
        level_up,
        leveled_class,
        level_up.choice_type or 'standard',
    )
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update_data},
    )
    return await get_owned_character(character_id, username)


@router.post("/characters/{character_id}/multiclass")
async def multiclass_character_safely(
    character_id: str,
    level_up: LevelUpRequest,
    username: str = Depends(get_current_user),
):
    """Add a new class level while preserving already-spent player resources."""
    existing = await get_owned_character(character_id, username)
    new_class = display_class_name(level_up.new_class or '')
    if not level_up.new_class or not str(level_up.new_class).strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_class is required for multiclassing")

    class_levels = initial_class_levels(existing)
    if new_class in class_levels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{new_class} is already on this character. Choose an existing class to advance once class-picking progression is enabled.",
        )

    failed_current = [
        class_name for class_name in class_levels
        if not meets_multiclass_requirements(existing, class_name)
    ]
    if failed_current:
        details = ', '.join(
            f"{name} requires {multiclass_requirement_text(name)}"
            for name in failed_current
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Character does not meet requirements to multiclass out of current class: {details}",
        )

    if not meets_multiclass_requirements(existing, new_class):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Character does not meet requirements for {new_class}: {multiclass_requirement_text(new_class)}",
        )

    update_data = build_safe_level_up_update(existing, level_up, new_class, 'multiclass')
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': update_data},
    )
    return await get_owned_character(character_id, username)

"""State-safe wrappers around character level-up routes.

The legacy progression builder contains the rules/choice logic, but historically
it also refilled HP, Hit Dice, and every spell slot when a level was gained.
That makes levelling in the middle of an adventuring day silently behave like a
rest. These focused routes reuse the existing progression rules while preserving
spent resources and current damage.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import LevelUpRequest
from routes.characters import (
    build_level_up_update,
    display_class_name,
    get_owned_character,
    initial_class_levels,
    meets_multiclass_requirements,
    multiclass_requirement_text,
)
from utils.auth import get_current_user


router = APIRouter()


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _slot_map(value: Any) -> Dict[str, int]:
    if not isinstance(value, dict):
        return {}
    return {str(level): max(0, _int(count, 0)) for level, count in value.items()}


def preserve_spell_slot_state(
    old_totals: Any,
    old_remaining: Any,
    new_totals: Any,
    *,
    pact_style: bool = False,
) -> Dict[str, int]:
    """Keep already-spent slots spent while making newly-gained capacity usable."""
    old_total_map = _slot_map(old_totals)
    old_remaining_map = _slot_map(old_remaining) or dict(old_total_map)
    new_total_map = _slot_map(new_totals)

    if not new_total_map:
        return {}

    if pact_style and old_total_map:
        old_total = sum(old_total_map.values())
        old_left = sum(min(old_total_map.get(level, 0), count) for level, count in old_remaining_map.items())
        spent = max(0, old_total - old_left)
        new_total = sum(new_total_map.values())
        new_left = max(0, new_total - spent)
        # Pact Magic uses one slot level at a time, so put the preserved count on
        # the new pact slot level when that level advances.
        pact_level = max(new_total_map, key=lambda level: _int(level, 0))
        return {level: (min(new_total_map[level], new_left) if level == pact_level else 0) for level in new_total_map}

    remaining: Dict[str, int] = {}
    for level, new_total in new_total_map.items():
        old_total = old_total_map.get(level, 0)
        old_left = min(old_total, old_remaining_map.get(level, old_total))
        gained = max(0, new_total - old_total)
        remaining[level] = min(new_total, old_left + gained)
    return remaining


def preserve_level_up_live_state(existing: Dict[str, Any], update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Correct rest-like side effects in the legacy level-up update payload."""
    update = dict(update_data)

    old_max = max(1, _int(existing.get("max_hit_points"), 1))
    old_current = max(0, min(old_max, _int(existing.get("current_hit_points"), old_max)))
    new_max = max(old_max, _int(update.get("max_hit_points"), old_max))
    hp_gained = max(0, new_max - old_max)
    update["current_hit_points"] = min(new_max, old_current + hp_gained)

    old_level = max(1, _int(existing.get("level"), 1))
    new_level = max(old_level + 1, _int(update.get("level"), old_level + 1))
    old_hit_dice_remaining = max(0, min(old_level, _int(existing.get("hit_dice_remaining"), old_level)))
    update["hit_dice_remaining"] = min(new_level, old_hit_dice_remaining + 1)

    primary_class = str(existing.get("character_class") or "").strip().lower()
    class_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else initial_class_levels(existing)
    single_class_warlock = primary_class == "warlock" and len(class_levels) == 1
    update["spell_slots_remaining"] = preserve_spell_slot_state(
        existing.get("spell_slots"),
        existing.get("spell_slots_remaining"),
        update.get("spell_slots"),
        pact_style=single_class_warlock,
    )

    return update


async def _apply_level_up(
    character_id: str,
    level_up: LevelUpRequest,
    username: str,
    *,
    leveled_class: str,
    progression_type: str,
) -> Dict[str, Any]:
    existing = await get_owned_character(character_id, username)
    update_data = build_level_up_update(existing, level_up, leveled_class, progression_type)
    update_data = preserve_level_up_live_state(existing, update_data)
    await db.player_characters.update_one(
        {"id": character_id, "user_id": username},
        {"$set": update_data},
    )
    return await get_owned_character(character_id, username)


@router.post("/characters/{character_id}/level-up")
async def level_up_character_state_safe(
    character_id: str,
    level_up: LevelUpRequest,
    username: str = Depends(get_current_user),
):
    """Level the primary class without treating level-up as a free rest."""
    existing = await get_owned_character(character_id, username)
    leveled_class = display_class_name(existing.get("character_class", "Fighter"))
    return await _apply_level_up(
        character_id,
        level_up,
        username,
        leveled_class=leveled_class,
        progression_type=level_up.choice_type or "standard",
    )


@router.post("/characters/{character_id}/multiclass")
async def multiclass_character_state_safe(
    character_id: str,
    level_up: LevelUpRequest,
    username: str = Depends(get_current_user),
):
    """Add a new class while preserving current HP, Hit Dice, and spent slots."""
    existing = await get_owned_character(character_id, username)
    new_class = display_class_name(level_up.new_class or "")
    if not level_up.new_class or not str(level_up.new_class).strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_class is required for multiclassing")

    class_levels = initial_class_levels(existing)
    if new_class in class_levels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{new_class} is already on this character. Continue that class through the normal level-up path.",
        )

    failed_current = [class_name for class_name in class_levels if not meets_multiclass_requirements(existing, class_name)]
    if failed_current:
        details = ", ".join(f"{name} requires {multiclass_requirement_text(name)}" for name in failed_current)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Character does not meet requirements to multiclass out of current class: {details}",
        )

    if not meets_multiclass_requirements(existing, new_class):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Character does not meet requirements for {new_class}: {multiclass_requirement_text(new_class)}",
        )

    return await _apply_level_up(
        character_id,
        level_up,
        username,
        leveled_class=new_class,
        progression_type="multiclass",
    )

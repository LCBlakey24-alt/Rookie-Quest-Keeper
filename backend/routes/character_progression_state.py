"""State-safe wrappers around character level-up routes.

The legacy progression builder contains the rules/choice logic, but historically
it also refilled HP, Hit Dice, and every spell slot when a level was gained.
That makes levelling in the middle of an adventuring day silently behave like a
rest. These focused routes reuse the existing progression rules while preserving
spent resources and current damage.

This module also keeps Warlock Pact Magic separate from the shared multiclass
spell-slot table whenever a character has another spellcasting class, and lets
multiclass characters continue any class they already possess rather than being
locked to their original primary class forever.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import LevelUpRequest
from routes.characters import (
    build_level_up_update,
    compute_multiclass_spell_slots,
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


def _normalise_name(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _slot_map(value: Any) -> Dict[str, int]:
    if not isinstance(value, dict):
        return {}
    return {str(level): max(0, _int(count, 0)) for level, count in value.items()}


def _warlock_level(class_levels: Dict[str, Any]) -> int:
    for class_name, level in (class_levels or {}).items():
        if _normalise_name(class_name) == "warlock":
            return max(0, _int(level, 0))
    return 0


def _pact_magic_slot_shape(warlock_level: int) -> Dict[str, int]:
    level = max(0, min(20, _int(warlock_level, 0)))
    if level <= 0:
        return {}
    slot_level = 1 if level <= 2 else 2 if level <= 4 else 3 if level <= 6 else 4 if level <= 8 else 5
    slot_count = 1 if level == 1 else 2 if level <= 10 else 3 if level <= 16 else 4
    return {str(slot_level): slot_count}


def _saved_class_entry(existing: Dict[str, Any], class_name: str) -> Dict[str, Any]:
    saved_entries = existing.get("classes") if isinstance(existing.get("classes"), list) else []
    return next(
        (
            entry
            for entry in saved_entries
            if _normalise_name(entry.get("name") or entry.get("class_name") or entry.get("character_class") or entry.get("class"))
            == _normalise_name(class_name)
        ),
        {},
    )


def _subclass_for_class(existing: Dict[str, Any], class_name: str) -> str:
    saved = _saved_class_entry(existing, class_name)
    if saved.get("subclass"):
        return str(saved.get("subclass"))

    subclass_map = existing.get("class_subclasses") if isinstance(existing.get("class_subclasses"), dict) else {}
    for key, value in subclass_map.items():
        if _normalise_name(key) == _normalise_name(class_name) and value:
            return str(value)

    primary = display_class_name(existing.get("character_class", ""))
    if _normalise_name(primary) == _normalise_name(class_name):
        return str(existing.get("subclass") or "")
    return ""


def _class_entries(existing: Dict[str, Any], class_levels: Dict[str, int]) -> List[Dict[str, Any]]:
    """Adapt saved class-level shapes to the backend shared-slot calculator."""
    entries: List[Dict[str, Any]] = []
    for class_name, level in class_levels.items():
        canonical = display_class_name(class_name)
        saved = _saved_class_entry(existing, canonical)
        subclass = saved.get("subclass") or _subclass_for_class(existing, canonical)
        entries.append({"name": canonical, "level": max(0, _int(level, 0)), "subclass": subclass})
    return entries


def progression_spell_slot_totals(existing: Dict[str, Any], class_levels: Dict[str, int]) -> Dict[str, int]:
    """Return the normal spell-slot pool appropriate for a post-level-up class mix.

    For a Warlock-only (or Warlock + non-caster) character, keep Pact Magic in
    the legacy spell_slots field for compatibility with older saved sheets.
    Once another spellcasting class contributes shared slots, spell_slots holds
    only that shared table and Pact Magic is tracked through resources.pact_magic.
    """
    shared_slots = _slot_map(compute_multiclass_spell_slots(_class_entries(existing, class_levels)))
    warlock_level = _warlock_level(class_levels)
    if shared_slots:
        return shared_slots
    if warlock_level > 0:
        return _pact_magic_slot_shape(warlock_level)
    return {}


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
        pact_level = max(new_total_map, key=lambda level: _int(level, 0))
        return {level: (min(new_total_map[level], new_left) if level == pact_level else 0) for level in new_total_map}

    remaining: Dict[str, int] = {}
    for level, new_total in new_total_map.items():
        old_total = old_total_map.get(level, 0)
        old_left = min(old_total, old_remaining_map.get(level, old_total))
        gained = max(0, new_total - old_total)
        remaining[level] = min(new_total, old_left + gained)
    return remaining


def _tracker_number(tracker: Dict[str, Any], key: str, fallback: int) -> int:
    return max(0, _int(tracker.get(key), fallback))


def preserve_pact_magic_resource(existing: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Scale Pact Magic to Warlock level while keeping already-spent uses spent."""
    class_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else initial_class_levels(existing)
    warlock_level = _warlock_level(class_levels)
    resources = dict(existing.get("resources") or {}) if isinstance(existing.get("resources"), dict) else {}

    if warlock_level <= 0:
        return resources

    new_shape = _pact_magic_slot_shape(warlock_level)
    new_max = sum(new_shape.values())
    new_slot_level = max((_int(level, 0) for level in new_shape), default=1)
    old_tracker = resources.get("pact_magic") if isinstance(resources.get("pact_magic"), dict) else {}

    if old_tracker:
        old_max = _tracker_number(old_tracker, "max", new_max)
        old_current = _tracker_number(old_tracker, "current", _tracker_number(old_tracker, "remaining", old_max))
    else:
        old_levels = initial_class_levels(existing)
        old_warlock_level = _warlock_level(old_levels)
        old_shape = _pact_magic_slot_shape(old_warlock_level)
        old_max = sum(old_shape.values())
        if old_warlock_level > 0 and len(old_levels) == 1:
            old_current = sum(_slot_map(existing.get("spell_slots_remaining") or old_shape).values())
        else:
            old_current = old_max

    spent = max(0, old_max - min(old_max, old_current))
    new_current = max(0, min(new_max, new_max - spent))
    resources["pact_magic"] = {
        **old_tracker,
        "label": old_tracker.get("label") or "Pact Magic",
        "current": new_current,
        "remaining": new_current,
        "max": new_max,
        "slot_level": new_slot_level,
        "restore": "short-rest",
        "min_level": 1,
        "className": "Warlock",
    }
    return resources


def _normalised_classes_state(
    existing: Dict[str, Any],
    class_levels: Dict[str, int],
    leveled_class: str,
    selected_subclass: str = "",
) -> List[Dict[str, Any]]:
    """Persist per-class levels/subclasses so frontend multiclass reads cannot go stale."""
    result: List[Dict[str, Any]] = []
    for class_name, level in class_levels.items():
        canonical = display_class_name(class_name)
        saved = dict(_saved_class_entry(existing, canonical))
        subclass = _subclass_for_class(existing, canonical)
        if selected_subclass and _normalise_name(canonical) == _normalise_name(leveled_class):
            subclass = selected_subclass
        result.append({
            **saved,
            "name": canonical,
            "level": max(1, _int(level, 1)),
            "subclass": subclass,
        })
    return result


def preserve_level_up_live_state(existing: Dict[str, Any], update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Correct rest-like side effects and multiclass slot math in level-up output."""
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

    primary_class = _normalise_name(existing.get("character_class"))
    class_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else initial_class_levels(existing)
    warlock_level = _warlock_level(class_levels)
    single_pool_is_pact = primary_class == "warlock" and len(class_levels) == 1

    update["spell_slots"] = progression_spell_slot_totals(existing, class_levels)
    update["spell_slots_remaining"] = preserve_spell_slot_state(
        existing.get("spell_slots"),
        existing.get("spell_slots_remaining"),
        update.get("spell_slots"),
        pact_style=single_pool_is_pact and warlock_level > 0,
    )
    update["resources"] = preserve_pact_magic_resource(existing, update)
    update["multiclass_levels"] = dict(class_levels) if len(class_levels) > 1 else {}
    update["multiclass_classes"] = list(class_levels.keys())

    return update


def build_state_safe_level_up_update(
    existing: Dict[str, Any],
    level_up: LevelUpRequest,
    leveled_class: str,
    progression_type: str,
) -> Dict[str, Any]:
    """Build a level-up payload for primary or already-owned secondary classes."""
    leveled_class = display_class_name(leveled_class)
    primary_class = display_class_name(existing.get("character_class", leveled_class))
    class_levels = initial_class_levels(existing)
    existing_class = next((name for name in class_levels if _normalise_name(name) == _normalise_name(leveled_class)), None)

    if progression_type != "multiclass" and existing_class is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{leveled_class} is not currently on this character. Use multiclass to add it first.",
        )

    rules_existing = existing
    levelling_secondary = progression_type != "multiclass" and _normalise_name(leveled_class) != _normalise_name(primary_class)
    if levelling_secondary:
        rules_existing = dict(existing)
        rules_existing["character_class"] = leveled_class
        rules_existing["subclass"] = _subclass_for_class(existing, leveled_class)

    update_data = build_level_up_update(rules_existing, level_up, leveled_class, progression_type)

    if levelling_secondary:
        # A secondary subclass belongs on its class entry, not in the legacy
        # top-level subclass field that represents the primary class.
        update_data.pop("subclass", None)

    update_data = preserve_level_up_live_state(existing, update_data)
    updated_levels = update_data.get("class_levels") if isinstance(update_data.get("class_levels"), dict) else class_levels
    update_data["classes"] = _normalised_classes_state(
        existing,
        updated_levels,
        leveled_class,
        level_up.subclass or "",
    )
    if not levelling_secondary and level_up.subclass:
        update_data["subclass"] = level_up.subclass

    return update_data


async def _apply_level_up(
    character_id: str,
    level_up: LevelUpRequest,
    username: str,
    *,
    leveled_class: str,
    progression_type: str,
) -> Dict[str, Any]:
    existing = await get_owned_character(character_id, username)
    update_data = build_state_safe_level_up_update(existing, level_up, leveled_class, progression_type)
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
    """Level any class already owned by the character without granting a free rest."""
    existing = await get_owned_character(character_id, username)
    class_levels = initial_class_levels(existing)
    requested = display_class_name(level_up.new_class or existing.get("character_class", "Fighter"))
    leveled_class = next(
        (class_name for class_name in class_levels if _normalise_name(class_name) == _normalise_name(requested)),
        None,
    )
    if not leveled_class:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{requested} is not currently on this character. Use multiclass to add it first.",
        )
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
    if any(_normalise_name(name) == _normalise_name(new_class) for name in class_levels):
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

"""Focused player-character recovery routes.

The clean player sheet has always exposed Short Rest / Long Rest controls, but
older deployments have not consistently had matching backend routes. These
endpoints make recovery server-authoritative and preserve the character's live
combat state instead of relying on a frontend-only fallback.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status

from config import db
from data.character_resources import merge_character_resources
from utils.auth import get_current_user


router = APIRouter()

CORE_HIT_DICE = {
    "barbarian": 12,
    "fighter": 10,
    "paladin": 10,
    "ranger": 10,
    "bard": 8,
    "cleric": 8,
    "druid": 8,
    "monk": 8,
    "rogue": 8,
    "warlock": 8,
    "sorcerer": 6,
    "wizard": 6,
}

FULL_CASTERS = {"bard", "cleric", "druid", "sorcerer", "wizard"}
HALF_CASTERS = {"paladin", "ranger"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _edition(character: Dict[str, Any]) -> str:
    raw = character.get("rules_edition") or character.get("edition") or character.get("ruleset_id") or "2014"
    return "2024" if "2024" in str(raw) else "2014"


def _current_hp(character: Dict[str, Any]) -> int:
    max_hp = max(1, _int(character.get("max_hit_points", character.get("max_hp")), 1))
    raw = character.get("current_hit_points", character.get("hp"))
    return max(0, min(max_hp, _int(raw, max_hp)))


def can_start_rest(character: Dict[str, Any]) -> bool:
    """2024 rests require at least 1 HP; preserve 2014 behaviour."""
    return _edition(character) != "2024" or _current_hp(character) > 0


def _require_rest_eligibility(character: Dict[str, Any]) -> None:
    if not can_start_rest(character):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2024 rules require at least 1 HP to start a Short or Long Rest",
        )


def _class_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _hit_die_sides(character: Dict[str, Any]) -> int:
    return CORE_HIT_DICE.get(_class_key(character.get("character_class")), 8)


def _ability_mod(score: Any) -> int:
    return (_int(score, 10) - 10) // 2


def _class_levels(character: Dict[str, Any]) -> Dict[str, int]:
    stored = character.get("class_levels") or character.get("multiclass_levels") or {}
    if isinstance(stored, dict) and stored:
        return {
            _class_key(name): max(0, _int(level, 0))
            for name, level in stored.items()
            if _int(level, 0) > 0
        }
    primary = _class_key(character.get("character_class"))
    return {primary: max(1, _int(character.get("level"), 1))} if primary else {}


def _total_hit_dice(character: Dict[str, Any]) -> int:
    levels = _class_levels(character)
    total = sum(levels.values())
    return total if total > 0 else max(1, _int(character.get("level"), 1))


def _tracker_max(tracker: Dict[str, Any]) -> int:
    return max(
        0,
        _int(
            tracker.get("max", tracker.get("maximum", tracker.get("total", tracker.get("uses", 0)))),
            0,
        ),
    )


def _tracker_current(tracker: Dict[str, Any], maximum: int) -> int:
    return max(0, min(maximum, _int(tracker.get("current", tracker.get("remaining", maximum)), maximum)))


def _tracker_restore_type(tracker: Dict[str, Any]) -> str:
    raw = str(
        tracker.get("restore")
        or tracker.get("recovery")
        or tracker.get("refresh")
        or "long-rest"
    ).lower()
    return "short-rest" if "short" in raw else "long-rest"


def _tracker_short_rest_restore(tracker: Dict[str, Any]) -> int:
    return max(
        0,
        _int(
            tracker.get("short_rest_restore", tracker.get("shortRestRestore", tracker.get("short_rest_regain", 0))),
            0,
        ),
    )


def restore_resource_trackers(resources: Any, rest_type: str) -> Dict[str, Any]:
    """Restore persisted resource trackers, including 2024 partial Short Rest recovery."""
    if not isinstance(resources, dict):
        return {}

    restored: Dict[str, Any] = {}
    for key, raw in resources.items():
        if not isinstance(raw, dict):
            restored[key] = raw
            continue

        tracker = dict(raw)
        maximum = _tracker_max(tracker)
        if maximum <= 0:
            restored[key] = tracker
            continue

        current = _tracker_current(tracker, maximum)
        if rest_type == "long-rest" or _tracker_restore_type(tracker) == "short-rest":
            next_current = maximum
        else:
            partial = _tracker_short_rest_restore(tracker) if rest_type == "short-rest" else 0
            next_current = min(maximum, current + partial)

        if next_current != current or rest_type == "long-rest" or _tracker_restore_type(tracker) == "short-rest":
            tracker["current"] = next_current
            tracker["remaining"] = next_current
            tracker["max"] = maximum
        restored[key] = tracker
    return restored


def canonical_resources_for_rest(character: Dict[str, Any]) -> Dict[str, Any]:
    """Repair stale core counters before applying recovery."""
    return merge_character_resources(
        character,
        _class_levels(character),
        initialise_missing=True,
    )


def _pact_slot_shape(resources: Dict[str, Any]) -> Dict[str, int]:
    tracker = resources.get("pact_magic") if isinstance(resources, dict) else None
    if not isinstance(tracker, dict):
        return {}
    slot_level = max(0, _int(tracker.get("slot_level"), 0))
    maximum = _tracker_max(tracker)
    if slot_level <= 0 or maximum <= 0:
        return {}
    return {str(slot_level): maximum}


def long_rest_hit_dice(character: Dict[str, Any]) -> int:
    """Apply edition-aware Hit Point Dice recovery.

    2014 characters regain up to half their total Hit Dice (minimum one).
    2024 characters regain all spent Hit Point Dice.
    """
    total = _total_hit_dice(character)
    remaining = max(0, min(total, _int(character.get("hit_dice_remaining"), total)))
    if _edition(character) == "2024":
        return total
    regained = max(1, total // 2)
    return min(total, remaining + regained)


def _subclass_for(character: Dict[str, Any], class_name: str) -> str:
    class_name = _class_key(class_name)
    for entry in character.get("classes") or []:
        if not isinstance(entry, dict):
            continue
        entry_name = _class_key(entry.get("name") or entry.get("class_name") or entry.get("character_class") or entry.get("class"))
        if entry_name == class_name:
            return str(entry.get("subclass") or "")
    if _class_key(character.get("character_class")) == class_name:
        return str(character.get("subclass") or "")
    return ""


def has_non_pact_spell_slots(character: Dict[str, Any]) -> bool:
    """Whether any class contributes ordinary shared spellcasting slots."""
    for class_name, level in _class_levels(character).items():
        if class_name == "warlock":
            continue
        if class_name in FULL_CASTERS and level > 0:
            return True
        if class_name in HALF_CASTERS and level >= 2:
            return True
        if class_name == "fighter" and level >= 3 and _class_key(_subclass_for(character, class_name)) == "eldritch_knight":
            return True
        if class_name == "rogue" and level >= 3 and _class_key(_subclass_for(character, class_name)) == "arcane_trickster":
            return True
    return False


def spell_slots_are_pact_pool(character: Dict[str, Any]) -> bool:
    """True when spell_slots represents Pact Magic rather than shared slots."""
    levels = _class_levels(character)
    if levels.get("warlock", 0) <= 0 or has_non_pact_spell_slots(character):
        return False

    slots = character.get("spell_slots") if isinstance(character.get("spell_slots"), dict) else {}
    if not slots:
        return False

    tracker = (character.get("resources") or {}).get("pact_magic") if isinstance(character.get("resources"), dict) else None
    if isinstance(tracker, dict):
        slot_level = str(_int(tracker.get("slot_level"), 0))
        maximum = _tracker_max(tracker)
        if slot_level != "0" and len(slots) == 1:
            return _int(slots.get(slot_level), -1) == maximum

    return True


async def _owned_character(character_id: str, username: str) -> Dict[str, Any]:
    character = await db.player_characters.find_one(
        {"id": character_id, "user_id": username},
        {"_id": 0},
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    return character


async def _save(character_id: str, username: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    updates = {**updates, "updated_at": _now()}
    await db.player_characters.update_one(
        {"id": character_id, "user_id": username},
        {"$set": updates},
    )
    return await _owned_character(character_id, username)


def _spend_hit_dice(character: Dict[str, Any], requested: int) -> Dict[str, Any]:
    """Optional backwards-compatible short-rest Hit Dice spending."""
    requested = max(0, requested)
    if requested <= 0:
        return {}

    remaining = max(0, _int(character.get("hit_dice_remaining"), _total_hit_dice(character)))
    spend = min(requested, remaining)
    if spend <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Hit Dice remaining")

    max_hp = max(1, _int(character.get("max_hit_points"), 1))
    current_hp = max(0, min(max_hp, _int(character.get("current_hit_points"), max_hp)))
    die = _hit_die_sides(character)
    con_mod = _ability_mod(character.get("constitution"))
    minimum = 1 if _edition(character) == "2024" else 0

    healed = 0
    for _ in range(spend):
        healed += max(minimum, random.randint(1, die) + con_mod)

    return {
        "current_hit_points": min(max_hp, current_hp + healed),
        "hit_dice_remaining": remaining - spend,
        "last_rest_hit_dice_spent": spend,
        "last_rest_hit_points_recovered": min(max_hp, current_hp + healed) - current_hp,
    }


@router.post("/characters/{character_id}/short-rest")
async def short_rest_character(
    character_id: str,
    hit_dice_to_spend: int = Query(default=0, ge=0, le=20),
    username: str = Depends(get_current_user),
):
    """Restore short-rest resources and optionally spend Hit Dice."""
    character = await _owned_character(character_id, username)
    _require_rest_eligibility(character)
    canonical_resources = canonical_resources_for_rest(character)
    working_character = {**character, "resources": canonical_resources}
    restored_resources = restore_resource_trackers(canonical_resources, "short-rest")
    updates: Dict[str, Any] = {
        "resources": restored_resources,
        "last_rest_type": "short-rest",
        "last_rest_at": _now(),
    }
    if spell_slots_are_pact_pool(working_character):
        pact_slots = _pact_slot_shape(restored_resources)
        spell_slots = pact_slots or (character.get("spell_slots") if isinstance(character.get("spell_slots"), dict) else {})
        updates["spell_slots"] = dict(spell_slots)
        updates["spell_slots_remaining"] = dict(spell_slots)
        updates["used_spell_slots"] = {}

    updates.update(_spend_hit_dice(character, hit_dice_to_spend))
    return await _save(character_id, username, updates)


@router.post("/characters/{character_id}/long-rest")
async def long_rest_character(
    character_id: str,
    username: str = Depends(get_current_user),
):
    """Apply long-rest recovery while respecting the character's rules edition."""
    character = await _owned_character(character_id, username)
    _require_rest_eligibility(character)
    max_hp = max(1, _int(character.get("max_hit_points"), 1))
    canonical_resources = canonical_resources_for_rest(character)
    working_character = {**character, "resources": canonical_resources}
    restored_resources = restore_resource_trackers(canonical_resources, "long-rest")
    spell_slots = character.get("spell_slots") if isinstance(character.get("spell_slots"), dict) else {}
    pact_only = spell_slots_are_pact_pool(working_character)
    if pact_only:
        spell_slots = _pact_slot_shape(restored_resources) or spell_slots

    updates: Dict[str, Any] = {
        "current_hit_points": max_hp,
        "temporary_hit_points": 0,
        "temp_hp": 0,
        "death_saves_successes": 0,
        "death_saves_failures": 0,
        "concentrating_on": None,
        "concentration": None,
        "spell_slots_remaining": dict(spell_slots),
        "used_spell_slots": {},
        "hit_dice_remaining": long_rest_hit_dice(character),
        "resources": restored_resources,
        "exhaustion_level": max(0, _int(character.get("exhaustion_level"), 0) - 1),
        "last_rest_type": "long-rest",
        "last_rest_at": _now(),
    }
    if pact_only:
        updates["spell_slots"] = dict(spell_slots)

    return await _save(character_id, username, updates)

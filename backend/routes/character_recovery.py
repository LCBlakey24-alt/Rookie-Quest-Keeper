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


def _tracker_restore_type(tracker: Dict[str, Any]) -> str:
    raw = str(
        tracker.get("restore")
        or tracker.get("recovery")
        or tracker.get("refresh")
        or "long-rest"
    ).lower()
    return "short-rest" if "short" in raw else "long-rest"


def restore_resource_trackers(resources: Any, rest_type: str) -> Dict[str, Any]:
    """Restore persisted resource trackers without inventing missing resources."""
    if not isinstance(resources, dict):
        return {}

    restored: Dict[str, Any] = {}
    for key, raw in resources.items():
        if not isinstance(raw, dict):
            restored[key] = raw
            continue

        tracker = dict(raw)
        maximum = _tracker_max(tracker)
        should_restore = rest_type == "long-rest" or _tracker_restore_type(tracker) == "short-rest"
        if should_restore and maximum > 0:
            tracker["current"] = maximum
            tracker["remaining"] = maximum
            tracker["max"] = maximum
        restored[key] = tracker
    return restored


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

    # Legacy Warlocks did not always have a tracker. If no other class provides
    # ordinary spell slots, their saved spell_slots are the Pact Magic pool.
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

    healed = 0
    for _ in range(spend):
        healed += max(0, random.randint(1, die) + con_mod)

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
    updates: Dict[str, Any] = {
        "resources": restore_resource_trackers(character.get("resources"), "short-rest"),
        "last_rest_type": "short-rest",
        "last_rest_at": _now(),
    }
    if spell_slots_are_pact_pool(character):
        spell_slots = character.get("spell_slots") if isinstance(character.get("spell_slots"), dict) else {}
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
    max_hp = max(1, _int(character.get("max_hit_points"), 1))
    spell_slots = character.get("spell_slots") if isinstance(character.get("spell_slots"), dict) else {}

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
        "resources": restore_resource_trackers(character.get("resources"), "long-rest"),
        "exhaustion_level": max(0, _int(character.get("exhaustion_level"), 0) - 1),
        "last_rest_type": "long-rest",
        "last_rest_at": _now(),
    }

    return await _save(character_id, username, updates)

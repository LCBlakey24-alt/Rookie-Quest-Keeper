"""Canonicalise newly-created characters before they reach the player sheet.

The active lenient creator accepts standard-builder, imported, and homebrew
payloads. This focused wrapper keeps that flexibility while filling the pieces a
playable digital sheet needs immediately: class-level structure, hit dice,
spell-slot state, basic spellcasting math, and Pact Magic tracking.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends, status

from config import db
from routes.character_patch import _clean_create
from routes.characters import (
    calculate_spell_slots,
    compute_multiclass_spell_slots,
    display_class_name,
    hit_dice_string_for,
    proficiency_for,
    spellcasting_ability_for,
)
from utils.auth import get_current_user


router = APIRouter()

CLASS_BREAK_RE = re.compile(r"^\s*(.+?)\s+(\d{1,2})\s*$")
CLASS_SPLIT_RE = re.compile(r"\s*(?:/|\\|\||,|;)\s*")


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalise_name(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def parse_class_breakdown(raw_class: Any, total_level: Any) -> Tuple[str, Dict[str, int], bool]:
    """Parse common sheet strings such as ``Fighter 3 / Rogue 2``.

    Returns primary class, class-level map, and whether explicit class levels
    were present in the source text. Unknown/homebrew class names are preserved.
    """
    raw = str(raw_class or "").strip()
    fallback_level = max(1, _int(total_level, 1))
    if not raw:
        return "Fighter", {"Fighter": fallback_level}, False

    parts = [part.strip() for part in CLASS_SPLIT_RE.split(raw) if part.strip()]
    parsed: List[Tuple[str, int]] = []
    explicit = True
    for part in parts:
        match = CLASS_BREAK_RE.match(part)
        if not match:
            explicit = False
            break
        name = display_class_name(match.group(1).strip())
        level = max(1, min(20, _int(match.group(2), 1)))
        parsed.append((name, level))

    if explicit and parsed:
        levels: Dict[str, int] = {}
        for name, level in parsed:
            levels[name] = levels.get(name, 0) + level
        return parsed[0][0], levels, True

    # A simple class name is the normal builder shape. Keep it verbatim enough
    # for custom/homebrew classes while canonicalising core-class casing.
    primary = display_class_name(parts[0] if parts else raw)
    return primary, {primary: fallback_level}, False


def _class_entries(class_levels: Dict[str, int], primary_class: str, subclass: str) -> List[Dict[str, Any]]:
    return [
        {
            "name": class_name,
            "level": level,
            "subclass": subclass if _normalise_name(class_name) == _normalise_name(primary_class) else "",
        }
        for class_name, level in class_levels.items()
    ]


def _warlock_shape(level: int) -> Tuple[int, int]:
    level = max(0, min(20, _int(level, 0)))
    if level <= 0:
        return 0, 0
    slot_level = 1 if level <= 2 else 2 if level <= 4 else 3 if level <= 6 else 4 if level <= 8 else 5
    slots = 1 if level == 1 else 2 if level <= 10 else 3 if level <= 16 else 4
    return slot_level, slots


def _warlock_level(class_levels: Dict[str, int]) -> int:
    for class_name, level in class_levels.items():
        if _normalise_name(class_name) == "warlock":
            return max(0, _int(level, 0))
    return 0


def derive_creation_spell_slots(primary_class: str, subclass: str, class_levels: Dict[str, int]) -> Dict[str, int]:
    if len(class_levels) <= 1:
        level = next(iter(class_levels.values()), 1)
        return calculate_spell_slots(primary_class, level)

    shared = compute_multiclass_spell_slots(_class_entries(class_levels, primary_class, subclass))
    if shared:
        return {str(slot_level): _int(count, 0) for slot_level, count in shared.items()}

    warlock_level = _warlock_level(class_levels)
    if warlock_level:
        slot_level, slots = _warlock_shape(warlock_level)
        return {str(slot_level): slots}
    return {}


def clamp_slot_state(totals: Any, remaining: Any) -> Dict[str, int]:
    total_map = {str(level): max(0, _int(count, 0)) for level, count in (totals or {}).items()} if isinstance(totals, dict) else {}
    if not isinstance(remaining, dict) or not remaining:
        return dict(total_map)
    return {
        level: min(total, max(0, _int(remaining.get(level, remaining.get(_int(level, 0))), total)))
        for level, total in total_map.items()
    }


def _spellcasting_ability(primary_class: str, class_levels: Dict[str, int]) -> str:
    primary = spellcasting_ability_for(primary_class)
    if primary:
        return primary
    for class_name in class_levels:
        found = spellcasting_ability_for(class_name)
        if found:
            return found
    return ""


def _ability_modifier(score: Any) -> int:
    return (_int(score, 10) - 10) // 2


def normalise_created_character(payload: Dict[str, Any], username: str) -> Dict[str, Any]:
    """Build the persisted character and fill safe derivable play-state fields."""
    character = _clean_create(payload, username)

    source_class = payload.get("character_class") or character.get("character_class")
    primary_class, parsed_levels, explicit_breakdown = parse_class_breakdown(source_class, character.get("level"))
    if explicit_breakdown:
        character["level"] = sum(parsed_levels.values())
    total_level = max(1, _int(character.get("level"), 1))

    # If the source did not provide explicit per-class levels, prefer a valid
    # saved map (builder/homebrew) before falling back to the primary class.
    saved_levels = payload.get("class_levels") or payload.get("multiclass_levels")
    if not explicit_breakdown and isinstance(saved_levels, dict) and saved_levels:
        class_levels = {
            display_class_name(name): max(1, _int(level, 1))
            for name, level in saved_levels.items()
            if _int(level, 0) > 0
        }
        if class_levels:
            total_level = sum(class_levels.values())
            character["level"] = total_level
        else:
            class_levels = parsed_levels
    else:
        class_levels = parsed_levels

    character["character_class"] = primary_class
    character["class_levels"] = class_levels
    character["multiclass_levels"] = dict(class_levels) if len(class_levels) > 1 else {}
    if str(source_class or "").strip() != primary_class:
        character["imported_class_text"] = str(source_class or "").strip()

    character["proficiency_bonus"] = proficiency_for(total_level)
    character["hit_dice"] = hit_dice_string_for(class_levels)
    character["hit_dice_remaining"] = min(total_level, max(0, _int(character.get("hit_dice_remaining"), total_level)))

    supplied_slots = payload.get("spell_slots") if isinstance(payload.get("spell_slots"), dict) else {}
    derived_slots = derive_creation_spell_slots(primary_class, character.get("subclass") or "", class_levels)
    spell_slots = supplied_slots or derived_slots
    # For multiclass characters, prefer the backend shared-slot calculation so
    # an imported flat sheet cannot accidentally use one class's slot table.
    if len(class_levels) > 1:
        spell_slots = derived_slots
    character["spell_slots"] = {str(level): max(0, _int(count, 0)) for level, count in spell_slots.items()}
    character["spell_slots_remaining"] = clamp_slot_state(
        character["spell_slots"],
        payload.get("spell_slots_remaining"),
    )

    casting_ability = character.get("spellcasting_ability") or _spellcasting_ability(primary_class, class_levels)
    character["spellcasting_ability"] = casting_ability
    if casting_ability and len(class_levels) == 1:
        modifier = _ability_modifier(character.get(casting_ability))
        character["spell_save_dc"] = _int(character.get("spell_save_dc"), 0) or (8 + character["proficiency_bonus"] + modifier)
        character["spell_attack_bonus"] = _int(character.get("spell_attack_bonus"), 0) or (character["proficiency_bonus"] + modifier)

    resources = dict(character.get("resources") or {}) if isinstance(character.get("resources"), dict) else {}
    warlock_level = _warlock_level(class_levels)
    if warlock_level > 0:
        slot_level, pact_slots = _warlock_shape(warlock_level)
        existing_pact = resources.get("pact_magic") if isinstance(resources.get("pact_magic"), dict) else {}
        resources["pact_magic"] = {
            **existing_pact,
            "label": existing_pact.get("label") or "Pact Magic",
            "current": min(pact_slots, max(0, _int(existing_pact.get("current", existing_pact.get("remaining", pact_slots)), pact_slots))),
            "remaining": min(pact_slots, max(0, _int(existing_pact.get("remaining", existing_pact.get("current", pact_slots)), pact_slots))),
            "max": pact_slots,
            "slot_level": slot_level,
            "restore": "short-rest",
            "min_level": 1,
            "className": "Warlock",
        }
    character["resources"] = resources

    return character


@router.post("/characters", status_code=status.HTTP_201_CREATED)
async def create_character_state_ready(
    payload: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    character = normalise_created_character(payload, username)
    await db.player_characters.insert_one(character)
    character.pop("_id", None)
    return {
        "success": True,
        "message": f"{character['name']} created successfully!",
        "character_id": character["id"],
        "character": character,
    }

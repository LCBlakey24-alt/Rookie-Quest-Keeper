"""Edition-aware D&D spell-slot math used by modern character routes.

The legacy character module predates the 2024 Paladin/Ranger change. In 2014,
half casters begin Spellcasting at level 2 and contribute half their levels
rounded down to multiclass spell slots. In 2024, Paladins and Rangers gain
Spellcasting at level 1 and contribute half their levels rounded up.

Warlock Pact Magic remains a separate pool in both editions.
"""

from __future__ import annotations

from typing import Any, Dict


FULL_CASTER_SLOTS: Dict[int, Dict[int, int]] = {
    1: {1: 2},
    2: {1: 3},
    3: {1: 4, 2: 2},
    4: {1: 4, 2: 3},
    5: {1: 4, 2: 3, 3: 2},
    6: {1: 4, 2: 3, 3: 3},
    7: {1: 4, 2: 3, 3: 3, 4: 1},
    8: {1: 4, 2: 3, 3: 3, 4: 2},
    9: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
    10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
    11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
    12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
    13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
    14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
    15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
    16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
    17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
    18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1},
    19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1},
    20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1},
}

FULL_CASTERS = {"bard", "cleric", "druid", "sorcerer", "wizard"}
HALF_CASTERS = {"paladin", "ranger"}
THIRD_CASTER_SUBCLASSES = {
    "fighter": "eldritch_knight",
    "rogue": "arcane_trickster",
}


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def class_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def edition_for(character: Dict[str, Any]) -> str:
    raw = character.get("rules_edition") or character.get("edition") or character.get("ruleset_id") or "2014"
    return "2024" if "2024" in str(raw) else "2014"


def _subclass_for(character: Dict[str, Any], class_name: str) -> str:
    wanted = class_key(class_name)
    for entry in character.get("classes") or []:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("class_name") or entry.get("character_class") or entry.get("class")
        if class_key(name) == wanted:
            return str(entry.get("subclass") or "")

    subclass_map = character.get("class_subclasses") if isinstance(character.get("class_subclasses"), dict) else {}
    for saved_name, subclass in subclass_map.items():
        if class_key(saved_name) == wanted:
            return str(subclass or "")

    if class_key(character.get("character_class")) == wanted:
        return str(character.get("subclass") or "")
    return ""


def half_caster_contribution(level: int, edition: str = "2014") -> int:
    level = max(0, _int(level, 0))
    return (level + 1) // 2 if str(edition) == "2024" else level // 2


def class_has_spellcasting(character: Dict[str, Any], class_name: str, level: int) -> bool:
    key = class_key(class_name)
    level = max(0, _int(level, 0))
    if key in FULL_CASTERS or key == "warlock":
        return level > 0
    if key in HALF_CASTERS:
        return level >= (1 if edition_for(character) == "2024" else 2)
    required_subclass = THIRD_CASTER_SUBCLASSES.get(key)
    return bool(
        required_subclass
        and level >= 3
        and class_key(_subclass_for(character, class_name)) == required_subclass
    )


def shared_caster_level(character: Dict[str, Any], class_levels: Dict[str, int]) -> int:
    edition = edition_for(character)
    total = 0
    for class_name, raw_level in (class_levels or {}).items():
        level = max(0, _int(raw_level, 0))
        key = class_key(class_name)
        if key in FULL_CASTERS:
            total += level
        elif key in HALF_CASTERS:
            total += half_caster_contribution(level, edition)
        elif key in THIRD_CASTER_SUBCLASSES and class_has_spellcasting(character, class_name, level):
            total += level // 3
    return min(max(total, 0), 20)


def shared_spell_slots(character: Dict[str, Any], class_levels: Dict[str, int]) -> Dict[str, int]:
    caster_level = shared_caster_level(character, class_levels)
    if caster_level <= 0:
        return {}
    return {str(level): int(count) for level, count in FULL_CASTER_SLOTS.get(caster_level, {}).items()}


def spell_slots_for_class_mix(
    character: Dict[str, Any],
    class_levels: Dict[str, int],
) -> Dict[str, int]:
    """Normal spell slots for a class mix, picking the right table per RAW.

    With exactly ONE spellcasting class you use that class's own table, which
    for half and third casters is ceil(level / N) -- see class_spell_slots.
    The Multiclass Spellcaster table applies only when you have levels in MORE
    THAN ONE spellcasting class, and there each class contributes under
    shared_caster_level's rounding (half casters floored in 2014, rounded up in
    2024).

    Getting this split wrong in either direction is a real bug: routing a
    single-class Paladin 5 through the shared pool understates it to {"1": 3}
    instead of {"1": 4, "2": 2}, while routing a Wizard 5 / Cleric 1 through a
    single class's table ignores the other class entirely.

    Warlock Pact Magic never merges into the shared pool (shared_caster_level
    excludes it). It is returned only when no shared-slot caster is present,
    matching progression_spell_slot_totals; a character with both pools cannot
    be represented in the single spell_slots field today.
    """
    levels = {
        name: max(0, _int(raw, 0))
        for name, raw in (class_levels or {}).items()
    }
    casters = [
        (name, level)
        for name, level in levels.items()
        if level > 0 and class_has_spellcasting(character, name, level)
    ]
    shared = [(name, level) for name, level in casters if class_key(name) != "warlock"]
    warlock_level = next(
        (level for name, level in casters if class_key(name) == "warlock"),
        0,
    )

    if len(shared) == 1:
        name, level = shared[0]
        return class_spell_slots(character, name, level)
    if len(shared) > 1:
        return shared_spell_slots(character, dict(shared))
    if warlock_level > 0:
        return pact_magic_shape(warlock_level)
    return {}


def pact_magic_shape(warlock_level: int) -> Dict[str, int]:
    level = max(0, min(20, _int(warlock_level, 0)))
    if level <= 0:
        return {}
    slot_level = 1 if level <= 2 else 2 if level <= 4 else 3 if level <= 6 else 4 if level <= 8 else 5
    slots = 1 if level == 1 else 2 if level <= 10 else 3 if level <= 16 else 4
    return {str(slot_level): slots}


def class_spell_slots(character: Dict[str, Any], class_name: str, level: int) -> Dict[str, int]:
    """Return the class's own slot table, not a multiclass-combined pool."""
    key = class_key(class_name)
    level = max(0, min(20, _int(level, 0)))
    if level <= 0:
        return {}
    if key == "warlock":
        return pact_magic_shape(level)
    # A class's own slot table is the full-caster table at ceil(level / N).
    # half_caster_contribution() is the *multiclass* rule (floor in 2014, ceil
    # in 2024) and belongs in shared_caster_level(); using it here understated
    # slots at every odd level under 2014, so a Paladin 5 returned {"1": 3}
    # instead of {"1": 4, "2": 2}. (a + b - 1) // b is integer ceiling.
    # class_has_spellcasting() supplies the edition-aware start level (2 in
    # 2014, 1 in 2024 for half casters; 3 plus the right subclass for third
    # casters), so ceiling cannot leak a slot before Spellcasting is gained.
    if key in FULL_CASTERS:
        effective = level
    elif key in HALF_CASTERS and class_has_spellcasting(character, class_name, level):
        effective = (level + 1) // 2
    elif key in THIRD_CASTER_SUBCLASSES and class_has_spellcasting(character, class_name, level):
        effective = (level + 2) // 3
    else:
        return {}
    return {str(slot_level): int(count) for slot_level, count in FULL_CASTER_SLOTS.get(effective, {}).items()}

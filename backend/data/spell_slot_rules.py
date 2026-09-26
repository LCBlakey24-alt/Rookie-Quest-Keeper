"""Edition-aware D&D spell-slot math used by modern character routes.

The legacy character module predates the 2024 Paladin/Ranger change. In 2014,
half casters begin Spellcasting at level 2 and contribute half their levels
rounded down to multiclass spell slots. In 2024, Paladins and Rangers gain
Spellcasting at level 1 and contribute half their levels rounded up.

Warlock Pact Magic remains a separate pool in both editions.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


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


def _first_defined(*values: Any) -> Any:
    return next((value for value in values if value not in (None, "")), None)


def _count_table(value: Any) -> Dict[int, int]:
    output: Dict[int, int] = {}
    if isinstance(value, list):
        for index, entry in enumerate(value, start=1):
            if isinstance(entry, dict):
                level = _int(_first_defined(entry.get("level"), entry.get("class_level"), entry.get("classLevel")), index)
                count = _int(_first_defined(entry.get("count"), entry.get("value"), entry.get("total")), 0)
            else:
                level = index
                count = _int(entry, 0)
            if 1 <= level <= 20:
                output[level] = max(0, count)
        return output
    if not isinstance(value, dict):
        return output
    for raw_level, raw_count in value.items():
        level = _int(raw_level, 0)
        if 1 <= level <= 20:
            output[level] = max(0, _int(raw_count, 0))
    return output


def _with_level_one_seed(table: Dict[int, int], count: int) -> Dict[int, int]:
    output = dict(table or {})
    if count > 0 and 1 not in output:
        output[1] = count
    return output


def homebrew_progression_table_value(table: Any, level: int) -> int:
    safe_level = max(0, min(20, _int(level, 0)))
    value = 0
    for entry_level, entry_value in sorted(_count_table(table).items()):
        if entry_level > safe_level:
            break
        value = max(0, _int(entry_value, 0))
    return value


def normalise_homebrew_spellcasting_definition(raw: Any, class_name: str = "") -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

    ability = str(_first_defined(raw.get("ability"), raw.get("spellcasting_ability"), raw.get("spellcastingAbility")) or "").strip().lower()
    if ability not in {"strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"}:
        ability = ""

    casting_type = str(_first_defined(raw.get("type"), raw.get("style"), raw.get("casting_type"), raw.get("castingType")) or "known").strip().lower()
    if casting_type not in {"known", "prepared", "spellbook"}:
        casting_type = "known"

    progression_token = class_key(_first_defined(raw.get("progression"), raw.get("slot_progression"), raw.get("slotProgression")) or "")
    aliases = {
        "fullcaster": "full",
        "halfcaster": "half",
        "thirdcaster": "third",
        "pactmagic": "pact",
    }
    progression = aliases.get(progression_token, progression_token)
    if progression not in {"full", "half", "third", "pact"}:
        if raw.get("pactMagic") or raw.get("pact_magic"):
            progression = "pact"
        elif raw.get("halfCaster") or raw.get("half_caster"):
            progression = "half"
        elif raw.get("thirdCaster") or raw.get("third_caster"):
            progression = "third"
        else:
            progression = "full"

    start_level = max(1, min(20, _int(_first_defined(raw.get("start_level"), raw.get("startLevel")), 1)))
    cantrips_level_one = max(0, _int(_first_defined(
        raw.get("cantrips_level_1"),
        raw.get("cantripsLevel1"),
        raw.get("cantrips_known_level_1"),
        raw.get("cantripsKnownLevel1"),
    ), 0))
    spells_level_one = max(0, _int(_first_defined(
        raw.get("spells_level_1"),
        raw.get("spellsLevel1"),
        raw.get("spells_known_level_1"),
        raw.get("spellsKnownLevel1"),
    ), 0))

    cantrip_table = _with_level_one_seed(_count_table(_first_defined(
        raw.get("cantrips_known_table"),
        raw.get("cantripsKnownTable"),
        raw.get("cantrips_progression"),
        raw.get("cantripsProgression"),
    )), cantrips_level_one)
    known_table = _count_table(_first_defined(raw.get("spells_known_table"), raw.get("spellsKnownTable")))
    spellbook_table = _count_table(_first_defined(raw.get("spellbook_spells_table"), raw.get("spellbookSpellsTable")))
    prepared_table = _count_table(_first_defined(raw.get("prepared_spells_table"), raw.get("preparedSpellsTable")))
    if casting_type == "known":
        known_table = _with_level_one_seed(known_table, spells_level_one)
    elif casting_type == "spellbook":
        spellbook_table = _with_level_one_seed(spellbook_table, spells_level_one)
    elif casting_type == "prepared":
        prepared_table = _with_level_one_seed(prepared_table, spells_level_one)

    return {
        **raw,
        "class_name": str(_first_defined(raw.get("class_name"), raw.get("className"), class_name) or class_name),
        "ability": ability,
        "type": casting_type,
        "progression": progression,
        "start_level": start_level,
        "cantrips_level_1": cantrips_level_one,
        "spells_level_1": spells_level_one,
        "cantrips_known_table": cantrip_table,
        "spells_known_table": known_table,
        "spellbook_spells_table": spellbook_table,
        "prepared_spells_table": prepared_table,
        "ritual": bool(raw.get("ritual")),
    }


def homebrew_spellcasting_for_class(character: Dict[str, Any], class_name: str) -> Optional[Dict[str, Any]]:
    saved = character.get("homebrew_spellcasting")
    if not isinstance(saved, dict):
        return None
    wanted = class_key(class_name)
    for saved_name, raw in saved.items():
        if class_key(saved_name) == wanted:
            return normalise_homebrew_spellcasting_definition(raw, class_name)
        if isinstance(raw, dict) and class_key(raw.get("class_name") or raw.get("className")) == wanted:
            return normalise_homebrew_spellcasting_definition(raw, class_name)
    return None


def homebrew_spell_progression(
    character: Dict[str, Any],
    class_name: str,
    before_level: int,
    after_level: int,
) -> Dict[str, Any]:
    definition = homebrew_spellcasting_for_class(character, class_name)
    if not definition:
        return {
            "type": "none",
            "cantrips_before": 0,
            "cantrips_after": 0,
            "cantrips_gain": 0,
            "spells_before": 0,
            "spells_after": 0,
            "spells_gain": 0,
            "prepared_before": 0,
            "prepared_after": 0,
            "prepared_gain": 0,
        }

    before = max(0, min(20, _int(before_level, 0)))
    after = max(0, min(20, _int(after_level, before + 1)))
    cantrips_before = homebrew_progression_table_value(definition.get("cantrips_known_table"), before)
    cantrips_after = homebrew_progression_table_value(definition.get("cantrips_known_table"), after)
    mode = definition.get("type") or "known"
    table_key = (
        "spellbook_spells_table" if mode == "spellbook"
        else "prepared_spells_table" if mode == "prepared"
        else "spells_known_table"
    )
    spells_before = homebrew_progression_table_value(definition.get(table_key), before)
    spells_after = homebrew_progression_table_value(definition.get(table_key), after)
    return {
        "type": mode,
        "cantrips_before": cantrips_before,
        "cantrips_after": cantrips_after,
        "cantrips_gain": max(0, cantrips_after - cantrips_before),
        "spells_before": spells_before,
        "spells_after": spells_after,
        "spells_gain": max(0, spells_after - spells_before),
        "prepared_before": spells_before if mode == "prepared" else 0,
        "prepared_after": spells_after if mode == "prepared" else 0,
        "prepared_gain": max(0, spells_after - spells_before) if mode == "prepared" else 0,
    }


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
    homebrew = homebrew_spellcasting_for_class(character, class_name)
    if homebrew:
        return level >= max(1, _int(homebrew.get("start_level"), 1))
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
        homebrew = homebrew_spellcasting_for_class(character, class_name)
        if homebrew:
            if level < max(1, _int(homebrew.get("start_level"), 1)):
                continue
            progression = homebrew.get("progression") or "full"
            if progression == "full":
                total += level
            elif progression == "half":
                total += half_caster_contribution(level, edition)
            elif progression == "third":
                total += level // 3
            # Pact Magic remains a separate pool.
            continue
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

    homebrew = homebrew_spellcasting_for_class(character, class_name)
    if homebrew:
        if level < max(1, _int(homebrew.get("start_level"), 1)):
            return {}
        progression = homebrew.get("progression") or "full"
        if progression == "pact":
            return pact_magic_shape(level)
        if progression == "half":
            effective = half_caster_contribution(level, edition_for(character))
        elif progression == "third":
            effective = level // 3
        else:
            effective = level
        return {str(slot_level): int(count) for slot_level, count in FULL_CASTER_SLOTS.get(effective, {}).items()}

    if key == "warlock":
        return pact_magic_shape(level)
    if key in FULL_CASTERS:
        effective = level
    elif key in HALF_CASTERS:
        effective = half_caster_contribution(level, edition_for(character))
    elif key in THIRD_CASTER_SUBCLASSES and class_has_spellcasting(character, class_name, level):
        effective = level // 3
    else:
        return {}
    return {str(slot_level): int(count) for slot_level, count in FULL_CASTER_SLOTS.get(effective, {}).items()}

"""Canonical core-class resource trackers for persisted player characters.

These helpers intentionally store only counters/recovery metadata, not rules
text. They keep newly-created/imported characters usable by the server-side rest
routes even when the frontend did not explicitly send resource trackers.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Iterable, Tuple


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _edition(character: Dict[str, Any]) -> str:
    raw = character.get("rules_edition") or character.get("edition") or character.get("ruleset_id") or "2014"
    return "2024" if "2024" in str(raw) else "2014"


def proficiency_bonus(total_level: int) -> int:
    return 2 + ((max(1, _int(total_level, 1)) - 1) // 4)


def ability_modifier(score: Any) -> int:
    return (_int(score, 10) - 10) // 2


def class_level(class_levels: Dict[str, int], class_name: str) -> int:
    wanted = _key(class_name)
    for name, level in (class_levels or {}).items():
        if _key(name) == wanted:
            return max(0, _int(level, 0))
    return 0


def warlock_shape(level: int) -> Tuple[int, int]:
    level = max(0, min(20, _int(level, 0)))
    if level <= 0:
        return 0, 0
    slot_level = 1 if level <= 2 else 2 if level <= 4 else 3 if level <= 6 else 4 if level <= 8 else 5
    slots = 1 if level == 1 else 2 if level <= 10 else 3 if level <= 16 else 4
    return slot_level, slots


def _rule_specs(character: Dict[str, Any], class_levels: Dict[str, int]) -> Iterable[Tuple[str, Dict[str, Any]]]:
    edition = _edition(character)
    total_level = max(1, sum(max(0, _int(level, 0)) for level in class_levels.values()) or _int(character.get("level"), 1))
    pb = proficiency_bonus(total_level)

    barbarian = class_level(class_levels, "Barbarian")
    if barbarian:
        if edition == "2014" and barbarian >= 20:
            rage_max = 99
        elif barbarian >= 17:
            rage_max = 6
        elif barbarian >= 12:
            rage_max = 5
        elif barbarian >= 6:
            rage_max = 4
        elif barbarian >= 3:
            rage_max = 3
        else:
            rage_max = 2
        yield "rage", {"label": "Rage", "max": rage_max, "restore": "long-rest", "className": "Barbarian", "min_level": 1}

    bard = class_level(class_levels, "Bard")
    if bard:
        bardic_max = max(1, ability_modifier(character.get("charisma")))
        yield "bardic_inspiration", {
            "label": "Bardic Inspiration",
            "max": bardic_max,
            "restore": "short-rest" if bard >= 5 else "long-rest",
            "className": "Bard",
            "min_level": 1,
        }

    cleric = class_level(class_levels, "Cleric")
    if cleric >= 2:
        if edition == "2024":
            channel_max = max(2, math.ceil(cleric / 2))
        elif cleric >= 18:
            channel_max = 3
        elif cleric >= 6:
            channel_max = 2
        else:
            channel_max = 1
        yield "channel_divinity_cleric", {"label": "Channel Divinity", "max": channel_max, "restore": "short-rest", "className": "Cleric", "min_level": 2}

    druid = class_level(class_levels, "Druid")
    if druid >= 2:
        yield "wild_shape", {"label": "Wild Shape", "max": 2, "restore": "short-rest", "className": "Druid", "min_level": 2}

    fighter = class_level(class_levels, "Fighter")
    if fighter >= 1:
        yield "second_wind", {
            "label": "Second Wind",
            "max": pb if edition == "2024" else 1,
            "restore": "long-rest" if edition == "2024" else "short-rest",
            "className": "Fighter",
            "min_level": 1,
        }
    if fighter >= 2:
        yield "action_surge", {"label": "Action Surge", "max": 2 if fighter >= 17 else 1, "restore": "short-rest", "className": "Fighter", "min_level": 2}
    if fighter >= 9:
        indomitable_max = 3 if fighter >= 17 else 2 if fighter >= 13 else 1
        yield "indomitable", {"label": "Indomitable", "max": indomitable_max, "restore": "long-rest", "className": "Fighter", "min_level": 9}

    monk = class_level(class_levels, "Monk")
    if monk >= 2:
        yield "ki", {
            "label": "Discipline Points" if edition == "2024" else "Ki",
            "max": monk,
            "restore": "short-rest",
            "className": "Monk",
            "min_level": 2,
        }

    paladin = class_level(class_levels, "Paladin")
    if paladin >= 1:
        yield "lay_on_hands", {"label": "Lay on Hands", "max": paladin * 5, "restore": "long-rest", "className": "Paladin", "min_level": 1}
    if paladin >= 3:
        yield "channel_divinity_paladin", {
            "label": "Channel Divinity",
            "max": pb if edition == "2024" else 1,
            "restore": "long-rest" if edition == "2024" else "short-rest",
            "className": "Paladin",
            "min_level": 3,
        }

    ranger = class_level(class_levels, "Ranger")
    if ranger >= 1 and edition == "2024":
        yield "favored_enemy", {"label": "Favored Enemy", "max": max(2, math.ceil(ranger / 2)), "restore": "long-rest", "className": "Ranger", "min_level": 1}

    sorcerer = class_level(class_levels, "Sorcerer")
    if sorcerer >= 2:
        yield "sorcery_points", {"label": "Sorcery Points", "max": sorcerer, "restore": "long-rest", "className": "Sorcerer", "min_level": 2}

    warlock = class_level(class_levels, "Warlock")
    if warlock >= 1:
        slot_level, slots = warlock_shape(warlock)
        yield "pact_magic", {
            "label": "Pact Magic",
            "max": slots,
            "slot_level": slot_level,
            "restore": "short-rest",
            "className": "Warlock",
            "min_level": 1,
        }

    wizard = class_level(class_levels, "Wizard")
    if wizard >= 1:
        yield "arcane_recovery", {"label": "Arcane Recovery", "max": 1, "restore": "long-rest", "className": "Wizard", "min_level": 1}


def merge_character_resources(
    character: Dict[str, Any],
    class_levels: Dict[str, int],
    *,
    initialise_missing: bool = True,
) -> Dict[str, Any]:
    """Merge/scalably update core trackers while preserving spent uses.

    When a maximum grows, only the newly-gained capacity is added to current
    uses. Existing spent uses stay spent. Homebrew/unknown resource keys pass
    through untouched.
    """
    existing_resources = character.get("resources") if isinstance(character.get("resources"), dict) else {}
    merged: Dict[str, Any] = dict(existing_resources)

    for key, spec in _rule_specs(character, class_levels):
        old = existing_resources.get(key) if isinstance(existing_resources.get(key), dict) else None
        new_max = max(0, _int(spec.get("max"), 0))
        if new_max <= 0:
            continue

        if old:
            old_max = max(0, _int(old.get("max", old.get("maximum", new_max)), new_max))
            old_current = max(0, min(old_max, _int(old.get("current", old.get("remaining", old_max)), old_max)))
            current = min(new_max, old_current + max(0, new_max - old_max))
        elif initialise_missing:
            current = new_max
        else:
            continue

        merged[key] = {
            ...(old or {}),
            **spec,
            "current": current,
            "remaining": current,
            "max": new_max,
        }

    return merged

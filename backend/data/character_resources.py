"""Canonical core-class resource trackers for persisted player characters.

These helpers intentionally store only counters/recovery metadata, not rules
text. They keep newly-created/imported characters usable by the server-side rest
routes even when the frontend did not explicitly send resource trackers.
"""

from __future__ import annotations

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


def _resource_spec(
    *,
    label: str,
    maximum: int,
    restore: str,
    class_name: str,
    min_level: int,
    short_rest_restore: int = 0,
    **extra: Any,
) -> Dict[str, Any]:
    spec = {
        "label": label,
        "max": maximum,
        "restore": restore,
        "className": class_name,
        "min_level": min_level,
        **extra,
    }
    if short_rest_restore > 0:
        spec["short_rest_restore"] = short_rest_restore
    return spec


def _rule_specs(character: Dict[str, Any], class_levels: Dict[str, int]) -> Iterable[Tuple[str, Dict[str, Any]]]:
    edition = _edition(character)

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
        yield "rage", _resource_spec(
            label="Rage",
            maximum=rage_max,
            restore="long-rest",
            short_rest_restore=1 if edition == "2024" else 0,
            class_name="Barbarian",
            min_level=1,
        )

    bard = class_level(class_levels, "Bard")
    if bard:
        bardic_max = max(1, ability_modifier(character.get("charisma")))
        yield "bardic_inspiration", _resource_spec(
            label="Bardic Inspiration",
            maximum=bardic_max,
            restore="short-rest" if bard >= 5 else "long-rest",
            class_name="Bard",
            min_level=1,
        )

    cleric = class_level(class_levels, "Cleric")
    if cleric >= 2:
        if edition == "2024":
            channel_max = 4 if cleric >= 18 else 3 if cleric >= 6 else 2
            channel_restore = "long-rest"
            channel_short_restore = 1
        else:
            channel_max = 3 if cleric >= 18 else 2 if cleric >= 6 else 1
            channel_restore = "short-rest"
            channel_short_restore = 0
        yield "channel_divinity", _resource_spec(
            label="Channel Divinity",
            maximum=channel_max,
            restore=channel_restore,
            short_rest_restore=channel_short_restore,
            class_name="Cleric",
            min_level=2,
        )

    druid = class_level(class_levels, "Druid")
    if druid >= 2:
        if edition == "2024":
            wild_shape_max = 4 if druid >= 17 else 3 if druid >= 6 else 2
            wild_shape_restore = "long-rest"
            wild_shape_short_restore = 1
        else:
            wild_shape_max = 99 if druid >= 20 else 2
            wild_shape_restore = "short-rest"
            wild_shape_short_restore = 0
        yield "wild_shape", _resource_spec(
            label="Wild Shape",
            maximum=wild_shape_max,
            restore=wild_shape_restore,
            short_rest_restore=wild_shape_short_restore,
            class_name="Druid",
            min_level=2,
        )

    fighter = class_level(class_levels, "Fighter")
    if fighter >= 1:
        if edition == "2024":
            second_wind_max = 4 if fighter >= 10 else 3 if fighter >= 4 else 2
            second_wind_restore = "long-rest"
            second_wind_short_restore = 1
        else:
            second_wind_max = 1
            second_wind_restore = "short-rest"
            second_wind_short_restore = 0
        yield "second_wind", _resource_spec(
            label="Second Wind",
            maximum=second_wind_max,
            restore=second_wind_restore,
            short_rest_restore=second_wind_short_restore,
            class_name="Fighter",
            min_level=1,
        )
    if fighter >= 2:
        yield "action_surge", _resource_spec(
            label="Action Surge",
            maximum=2 if fighter >= 17 else 1,
            restore="short-rest",
            class_name="Fighter",
            min_level=2,
        )
    if fighter >= 9:
        indomitable_max = 3 if fighter >= 17 else 2 if fighter >= 13 else 1
        yield "indomitable", _resource_spec(
            label="Indomitable",
            maximum=indomitable_max,
            restore="long-rest",
            class_name="Fighter",
            min_level=9,
        )

    monk = class_level(class_levels, "Monk")
    if monk >= 2:
        yield "ki", _resource_spec(
            label="Focus Points" if edition == "2024" else "Ki",
            maximum=monk,
            restore="short-rest",
            class_name="Monk",
            min_level=2,
        )

    paladin = class_level(class_levels, "Paladin")
    if paladin >= 1:
        yield "lay_on_hands", _resource_spec(
            label="Lay on Hands",
            maximum=paladin * 5,
            restore="long-rest",
            class_name="Paladin",
            min_level=1,
        )
    if paladin >= 3:
        if edition == "2024":
            paladin_channel_max = 3 if paladin >= 11 else 2
            paladin_channel_restore = "long-rest"
            paladin_channel_short_restore = 1
        else:
            paladin_channel_max = 1
            paladin_channel_restore = "short-rest"
            paladin_channel_short_restore = 0
        yield "channel_divinity", _resource_spec(
            label="Channel Divinity",
            maximum=paladin_channel_max,
            restore=paladin_channel_restore,
            short_rest_restore=paladin_channel_short_restore,
            class_name="Paladin",
            min_level=3,
        )

    ranger = class_level(class_levels, "Ranger")
    if ranger >= 1 and edition == "2024":
        favored_enemy_max = 6 if ranger >= 17 else 5 if ranger >= 13 else 4 if ranger >= 9 else 3 if ranger >= 5 else 2
        yield "favored_enemy", _resource_spec(
            label="Favored Enemy",
            maximum=favored_enemy_max,
            restore="long-rest",
            class_name="Ranger",
            min_level=1,
        )

    sorcerer = class_level(class_levels, "Sorcerer")
    if sorcerer >= 2:
        yield "sorcery_points", _resource_spec(
            label="Sorcery Points",
            maximum=sorcerer,
            restore="long-rest",
            class_name="Sorcerer",
            min_level=2,
        )

    warlock = class_level(class_levels, "Warlock")
    if warlock >= 1:
        slot_level, slots = warlock_shape(warlock)
        yield "pact_magic", _resource_spec(
            label="Pact Magic",
            maximum=slots,
            restore="short-rest",
            class_name="Warlock",
            min_level=1,
            slot_level=slot_level,
        )

    wizard = class_level(class_levels, "Wizard")
    if wizard >= 1:
        yield "arcane_recovery", _resource_spec(
            label="Arcane Recovery",
            maximum=1,
            restore="long-rest",
            class_name="Wizard",
            min_level=1,
        )


def merge_character_resources(
    character: Dict[str, Any],
    class_levels: Dict[str, int],
    *,
    initialise_missing: bool = True,
) -> Dict[str, Any]:
    """Merge/scalably update core trackers while preserving spent uses.

    When a maximum grows, only the newly-gained capacity is added to current
    uses. Existing spent uses stay spent. Homebrew/unknown resource keys pass
    through untouched. The keys deliberately match the frontend resource engine
    so the clean sheet and server-side rest routes operate on the same counters.
    """
    existing_resources = character.get("resources") if isinstance(character.get("resources"), dict) else {}
    merged: Dict[str, Any] = dict(existing_resources)

    for key, spec in _rule_specs(character, class_levels):
        # Use a previously-derived tracker when two owned classes intentionally
        # share a frontend key (currently Channel Divinity). This mirrors the
        # existing frontend reduce behaviour while keeping the shape stable.
        old = merged.get(key) if isinstance(merged.get(key), dict) else None
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
            **(old or {}),
            **spec,
            "current": current,
            "remaining": current,
            "max": new_max,
        }

    return merged

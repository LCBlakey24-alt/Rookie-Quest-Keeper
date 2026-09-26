"""State-safe wrappers around character level-up routes.

The legacy progression builder contains the rules/choice logic, but historically
it also refilled HP, Hit Dice, spell slots, and class resources when a level was
gained. That makes levelling in the middle of an adventuring day silently behave
like a rest. These focused routes reuse the existing progression rules while
preserving spent resources and current damage.

This module also keeps Warlock Pact Magic separate from the shared multiclass
spell-slot table whenever a character has another spellcasting class, lets
multiclass characters continue any class they already possess, and routes new
spell choices to known/prepared/spellbook state according to the character's
rules edition.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from data.character_resources import merge_character_resources
from data.class_progression import (
    prepared_spell_capacity,
    prepared_spell_change_rule,
    spell_selection_mode,
)
from data.spell_slot_rules import FULL_CASTER_SLOTS, pact_magic_shape, shared_spell_slots
from models import LevelUpRequest
from routes.characters import (
    build_level_up_update,
    display_class_name,
    edition_for,
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


def _class_level(class_levels: Dict[str, Any], class_name: str) -> int:
    key = _normalise_name(class_name)
    for saved_name, level in (class_levels or {}).items():
        if _normalise_name(saved_name) == key:
            return max(0, _int(level, 0))
    return 0


def _homebrew_spellcasting(existing: Dict[str, Any], class_name: str = "") -> Dict[str, Any]:
    raw = existing.get("homebrew_spellcasting")
    if not isinstance(raw, dict) or not raw:
        return {}

    primary = display_class_name(existing.get("character_class", ""))
    if class_name and _normalise_name(primary) != _normalise_name(class_name):
        return {}

    progression = str(raw.get("progression") or "full").strip().lower().replace(" ", "").replace("_", "").replace("-", "")
    progression = {
        "fullcaster": "full",
        "halfcaster": "half",
        "thirdcaster": "third",
        "pactmagic": "pact",
    }.get(progression, progression)
    if progression not in {"full", "half", "third", "pact"}:
        progression = "full"

    mode = str(raw.get("type") or raw.get("style") or "known").strip().lower()
    if mode not in {"known", "prepared", "spellbook"}:
        mode = "known"

    start_level = max(1, min(20, _int(raw.get("start_level", raw.get("startLevel", 1)), 1)))
    return {**raw, "progression": progression, "type": mode, "start_level": start_level}


def _homebrew_count_table(raw: Dict[str, Any], keys: List[str], level_one_key: str) -> Dict[int, int]:
    source: Any = {}
    for key in keys:
        if isinstance(raw.get(key), (dict, list)):
            source = raw.get(key)
            break

    entries = enumerate(source, start=1) if isinstance(source, list) else (source or {}).items()
    table: Dict[int, int] = {}
    for level, count in entries:
        safe_level = max(1, min(20, _int(level, 1)))
        table[safe_level] = max(0, _int(count, 0))

    level_one = max(0, _int(raw.get(level_one_key), 0))
    if level_one > 0 and 1 not in table:
        table[1] = level_one
    return table


def _cumulative_homebrew_count(table: Dict[int, int], level: int) -> int:
    safe_level = max(0, min(20, _int(level, 0)))
    values = [(entry_level, count) for entry_level, count in table.items() if entry_level <= safe_level]
    if not values:
        return 0
    return sorted(values, key=lambda entry: entry[0], reverse=True)[0][1]


def homebrew_spell_choice_targets(existing: Dict[str, Any], class_name: str, level: int) -> Dict[str, Any]:
    raw = _homebrew_spellcasting(existing, class_name)
    safe_level = max(0, min(20, _int(level, 0)))
    if not raw or safe_level < _int(raw.get("start_level"), 1):
        return {"cantrips": 0, "spells": 0, "type": "none"}

    cantrip_table = _homebrew_count_table(
        raw,
        ["cantrips_by_level", "cantripsByLevel", "cantrips_known_by_level", "cantripsKnownByLevel", "cantrip_progression", "cantripProgression"],
        "cantrips_level_1",
    )
    spell_table = _homebrew_count_table(
        raw,
        ["spells_by_level", "spellsByLevel", "spells_known_by_level", "spellsKnownByLevel", "prepared_spells_by_level", "preparedSpellsByLevel", "spellbook_spells_by_level", "spellbookSpellsByLevel", "spell_progression", "spellProgression"],
        "spells_level_1",
    )
    return {
        "cantrips": _cumulative_homebrew_count(cantrip_table, safe_level),
        "spells": _cumulative_homebrew_count(spell_table, safe_level),
        "type": raw.get("type", "known"),
    }


def homebrew_spell_choice_gain(existing: Dict[str, Any], class_name: str, before_level: int, after_level: int) -> Dict[str, Any]:
    before = homebrew_spell_choice_targets(existing, class_name, before_level)
    after = homebrew_spell_choice_targets(existing, class_name, after_level)
    return {
        "cantrips": max(0, _int(after.get("cantrips"), 0) - _int(before.get("cantrips"), 0)),
        "spells": max(0, _int(after.get("spells"), 0) - _int(before.get("spells"), 0)),
        "type": after.get("type", before.get("type", "none")),
        "before": before,
        "after": after,
    }


def homebrew_spell_selection_mode(existing: Dict[str, Any], class_name: str) -> str:
    return str(_homebrew_spellcasting(existing, class_name).get("type") or "")


def homebrew_spell_slots(existing: Dict[str, Any], class_name: str, level: int) -> Dict[str, int]:
    raw = _homebrew_spellcasting(existing, class_name)
    safe_level = max(0, min(20, _int(level, 0)))
    if not raw or safe_level < _int(raw.get("start_level"), 1):
        return {}

    progression = raw.get("progression", "full")
    if progression == "pact":
        return pact_magic_shape(safe_level)

    edition = edition_for(existing)
    effective = safe_level
    if progression == "half":
        effective = (safe_level + 1) // 2 if edition == "2024" else safe_level // 2
    elif progression == "third":
        effective = safe_level // 3
    if effective <= 0:
        return {}
    return {str(slot_level): int(count) for slot_level, count in FULL_CASTER_SLOTS.get(min(effective, 20), {}).items()}


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


def _spell_key(spell: Any) -> str:
    if isinstance(spell, dict):
        return _normalise_name(spell.get("name") or spell.get("spell_name") or spell.get("title"))
    return _normalise_name(spell)


def _normalise_spell_entry(spell: Any) -> Dict[str, Any]:
    if isinstance(spell, dict):
        entry = dict(spell)
        entry["name"] = str(entry.get("name") or entry.get("spell_name") or entry.get("title") or "").strip()
        return entry
    return {"name": str(spell or "").strip()}


def _tag_spell_source(spell: Any, class_name: str) -> Dict[str, Any]:
    entry = _normalise_spell_entry(spell)
    if entry.get("name") and not (entry.get("sourceClass") or entry.get("source_class")):
        entry["sourceClass"] = display_class_name(class_name)
    return entry


def _merge_unique_spells(existing: Any, additions: Any) -> List[Dict[str, Any]]:
    """Append spell choices without duplicating names already on that list."""
    output: List[Dict[str, Any]] = []
    seen = set()
    for raw in list(existing or []) + list(additions or []):
        entry = _normalise_spell_entry(raw)
        key = _spell_key(entry)
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(entry)
    return output


def _replacement_name(spell: Any) -> str:
    if not isinstance(spell, dict):
        return ""
    return str(spell.get("replaces") or spell.get("replaces_name") or spell.get("replace") or "").strip()


def _strip_replacement_metadata(spell: Any, class_name: str) -> Dict[str, Any]:
    entry = _tag_spell_source(spell, class_name)
    entry.pop("replaces", None)
    entry.pop("replaces_name", None)
    entry.pop("replace", None)
    return entry


def _prepared_list_for_progression(existing: Dict[str, Any], class_name: str, edition: str) -> Tuple[List[Dict[str, Any]], bool]:
    """Return the canonical prepared list, with a safe legacy fallback.

    Early revised-rule saves sometimes stored Bard/Sorcerer/Warlock choices in
    `spells_known`. If a 2024 prepared caster has no canonical prepared list, use
    that legacy list as the starting point during the next level-up rather than
    silently losing the player's spells. The legacy field itself is left intact
    so this migration remains non-destructive.
    """
    prepared = existing.get("spells_prepared") or existing.get("prepared_spells") or []
    if prepared:
        return [_normalise_spell_entry(spell) for spell in prepared], False

    mode = homebrew_spell_selection_mode(existing, class_name) or spell_selection_mode(display_class_name(class_name), edition)
    if edition == "2024" and mode == "prepared":
        legacy = existing.get("spells_known") or existing.get("known_spells") or []
        if legacy:
            return [_normalise_spell_entry(spell) for spell in legacy], True

    return [], False


def _apply_prepared_spell_changes(
    existing: Dict[str, Any],
    update: Dict[str, Any],
    additions: List[Any],
    leveled_class: str,
    edition: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    canonical_class = display_class_name(leveled_class)
    current_prepared, legacy_migrated = _prepared_list_for_progression(existing, canonical_class, edition)
    growth: List[Dict[str, Any]] = []
    replacements: List[Tuple[str, Dict[str, Any]]] = []

    for raw in additions:
        replacement = _replacement_name(raw)
        clean = _strip_replacement_metadata(raw, canonical_class)
        if not _spell_key(clean):
            continue
        if replacement:
            replacements.append((replacement, clean))
        else:
            growth.append(clean)

    rule = prepared_spell_change_rule(canonical_class, edition)
    if replacements:
        max_replacements = rule.get("max_replacements")
        if rule.get("cadence") != "level-up" or max_replacements in (None, 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{canonical_class} cannot replace prepared spells during level-up under {edition} rules.",
            )
        if len(replacements) > int(max_replacements):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{canonical_class} can replace at most {max_replacements} prepared spell during this level-up.",
            )

    result = list(current_prepared)
    replacement_records: List[Dict[str, str]] = []
    for old_name, new_spell in replacements:
        old_key = _normalise_name(old_name)
        index = next((i for i, spell in enumerate(result) if _spell_key(spell) == old_key), -1)
        if index < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot replace {old_name}: it is not on the current prepared spell list.",
            )
        new_key = _spell_key(new_spell)
        if any(_spell_key(spell) == new_key for i, spell in enumerate(result) if i != index):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot replace {old_name} with {new_spell.get('name')}: that spell is already prepared.",
            )
        result[index] = new_spell
        replacement_records.append({"from": old_name, "to": new_spell.get("name", "")})

    before_levels = initial_class_levels(existing)
    after_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else before_levels
    before_level = _class_level(before_levels, canonical_class)
    after_level = _class_level(after_levels, canonical_class)
    if homebrew_spell_selection_mode(existing, canonical_class) == "prepared":
        before_capacity = _int(homebrew_spell_choice_targets(existing, canonical_class, before_level).get("spells"), 0)
        after_capacity = _int(homebrew_spell_choice_targets(existing, canonical_class, after_level).get("spells"), 0)
    else:
        before_capacity = prepared_spell_capacity(canonical_class, before_level, edition)
        after_capacity = prepared_spell_capacity(canonical_class, after_level, edition)

    if edition == "2024" and after_capacity > 0:
        available_room = max(0, after_capacity - len(result))
        if len(growth) > available_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{canonical_class} has room for {available_room} additional prepared spell"
                    f"{'s' if available_room != 1 else ''} at class level {after_level}, but {len(growth)} were submitted."
                ),
            )

    result = _merge_unique_spells(result, growth)
    if edition == "2024" and after_capacity > 0 and len(result) > after_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prepared spell list exceeds {canonical_class}'s capacity of {after_capacity}.",
        )

    metadata = {
        "prepared_capacity_before": before_capacity,
        "prepared_capacity_after": after_capacity,
        "prepared_replacements": replacement_records,
        "legacy_spell_list_migrated": legacy_migrated,
    }
    return result, metadata


def route_level_up_spell_choices(
    existing: Dict[str, Any],
    update_data: Dict[str, Any],
    level_up: LevelUpRequest,
    leveled_class: str,
) -> Dict[str, Any]:
    """Persist `new_spells` in the class/edition-appropriate spell container.

    Replacement choices are encoded as ordinary `new_spells` entries with a
    `replaces` field. This keeps the public request model backward-compatible
    while allowing revised Bard/Sorcerer/Warlock level-ups to swap one prepared
    spell without confusing that swap with newly gained prepared capacity.
    """
    additions = list(level_up.new_spells or [])
    if not additions:
        return update_data

    update = dict(update_data)
    canonical_class = display_class_name(leveled_class)
    edition = edition_for(existing)
    mode = homebrew_spell_selection_mode(existing, canonical_class) or spell_selection_mode(canonical_class, edition)
    destination = "spells_known"
    metadata: Dict[str, Any] = {}

    tagged_additions = [_tag_spell_source(spell, canonical_class) for spell in additions]

    if mode == "spellbook":
        if any(_replacement_name(spell) for spell in additions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wizard level-up spellbook additions cannot use prepared-spell replacement markers.",
            )
        update.pop("spells_known", None)
        clean_additions = [_strip_replacement_metadata(spell, canonical_class) for spell in additions]
        update["spellbook"] = _merge_unique_spells(existing.get("spellbook") or [], clean_additions)
        destination = "spellbook"
    elif mode == "prepared":
        update.pop("spells_known", None)
        prepared, metadata = _apply_prepared_spell_changes(existing, update, additions, canonical_class, edition)
        update["spells_prepared"] = prepared
        destination = "spells_prepared"
    else:
        if any(_replacement_name(spell) for spell in additions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{canonical_class} uses a known-spell list under {edition} rules; replacement markers are not accepted here.",
            )
        update["spells_known"] = _merge_unique_spells(existing.get("spells_known") or [], tagged_additions)

    progression = dict(update.get("level_progression") or {})
    progression_key = str(level_up.new_level)
    if isinstance(progression.get(progression_key), dict):
        progression_entry = dict(progression[progression_key])
        progression_entry["spell_selection_mode"] = mode
        progression_entry["spell_destination"] = destination
        progression_entry.update(metadata)
        progression[progression_key] = progression_entry
        update["level_progression"] = progression

    return update


def progression_spell_slot_totals(existing: Dict[str, Any], class_levels: Dict[str, int]) -> Dict[str, int]:
    """Return the normal spell-slot pool appropriate for a post-level-up class mix.

    The shared-slot helper is edition-aware: 2014 Paladin/Ranger levels are
    halved and rounded down, while 2024 levels are halved and rounded up because
    those classes gain Spellcasting at level 1. Warlock Pact Magic remains a
    separate pool.
    """
    shared_slots = _slot_map(shared_spell_slots(existing, class_levels))
    warlock_level = _warlock_level(class_levels)
    primary_class = display_class_name(existing.get("character_class", ""))
    custom_definition = _homebrew_spellcasting(existing, primary_class)
    custom_level = _class_level(class_levels, primary_class)

    if custom_definition and custom_level > 0:
        custom_slots = homebrew_spell_slots(existing, primary_class, custom_level)
        if custom_definition.get("progression") == "pact":
            if shared_slots:
                return shared_slots
            return custom_slots

        # v1 custom-caster progression is exact for single-class custom casters.
        # Built-in multiclass pools remain authoritative when another shared-slot
        # caster is present; custom multiclass contribution is deliberately not
        # guessed until an explicit multiclass contract exists.
        if len(class_levels) == 1 or not shared_slots:
            return custom_slots

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
    primary_class = display_class_name(existing.get("character_class", ""))
    custom_definition = _homebrew_spellcasting(existing, primary_class)
    custom_pact_level = _class_level(class_levels, primary_class) if custom_definition.get("progression") == "pact" else 0

    if warlock_level <= 0 and custom_pact_level <= 0:
        return resources

    if custom_pact_level > 0:
        new_shape = homebrew_spell_slots(existing, primary_class, custom_pact_level)
        tracker_class = primary_class
        old_levels = initial_class_levels(existing)
        old_level = _class_level(old_levels, primary_class)
        old_shape = homebrew_spell_slots(existing, primary_class, old_level)
    else:
        new_shape = _pact_magic_slot_shape(warlock_level)
        tracker_class = "Warlock"
        old_levels = initial_class_levels(existing)
        old_warlock_level = _warlock_level(old_levels)
        old_shape = _pact_magic_slot_shape(old_warlock_level)

    new_max = sum(new_shape.values())
    new_slot_level = max((_int(level, 0) for level in new_shape), default=1)
    old_tracker = resources.get("pact_magic") if isinstance(resources.get("pact_magic"), dict) else {}

    if old_tracker:
        old_max = _tracker_number(old_tracker, "max", new_max)
        old_current = _tracker_number(old_tracker, "current", _tracker_number(old_tracker, "remaining", old_max))
    else:
        old_max = sum(old_shape.values())
        old_current = sum(_slot_map(existing.get("spell_slots_remaining") or old_shape).values()) if len(old_levels) == 1 else old_max

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
        "min_level": _int(custom_definition.get("start_level"), 1) if custom_pact_level > 0 else 1,
        "className": tracker_class,
        **({"homebrew": True} if custom_pact_level > 0 else {}),
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
    """Correct rest-like side effects and multiclass slot/resource math in level-up output."""
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
    custom_primary = display_class_name(existing.get("character_class", ""))
    custom_pact = _homebrew_spellcasting(existing, custom_primary).get("progression") == "pact"
    single_pool_is_pact = len(class_levels) == 1 and (primary_class == "warlock" or custom_pact)

    slot_character = dict(existing)
    if update.get("subclass"):
        slot_character["subclass"] = update.get("subclass")
    update["spell_slots"] = progression_spell_slot_totals(slot_character, class_levels)
    update["spell_slots_remaining"] = preserve_spell_slot_state(
        existing.get("spell_slots"),
        existing.get("spell_slots_remaining"),
        update.get("spell_slots"),
        pact_style=single_pool_is_pact and warlock_level > 0,
    )

    # Pact Magic needs a legacy-slot fallback for older Warlock saves, so fix it
    # first. Then scale every persisted core-class resource from the post-level
    # class map. Existing spent uses stay spent; only genuinely new capacity is
    # granted, while newly unlocked trackers start ready to use.
    pact_resources = preserve_pact_magic_resource(existing, update)
    post_level_character = {
        **existing,
        **update,
        "class_levels": class_levels,
        "resources": pact_resources,
    }
    update["resources"] = merge_character_resources(
        post_level_character,
        class_levels,
        initialise_missing=True,
    )

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
    update_data = route_level_up_spell_choices(existing, update_data, level_up, leveled_class)

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
    """Add a new class while preserving current HP, Hit Dice, spell slots, and resources."""
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

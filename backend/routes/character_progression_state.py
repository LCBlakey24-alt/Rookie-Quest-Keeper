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
from data.spell_slot_rules import (
    class_spell_slots,
    homebrew_spell_progression,
    homebrew_spellcasting_for_class,
    shared_spell_slots,
)
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
from utils.homebrew_spellcasting_snapshot import ensure_homebrew_spellcasting_snapshot


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

    if edition == "2024" and spell_selection_mode(display_class_name(class_name), edition) == "prepared":
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

    homebrew_casting = homebrew_spellcasting_for_class(existing, canonical_class)
    rule = {"cadence": "none", "max_replacements": 0} if homebrew_casting else prepared_spell_change_rule(canonical_class, edition)
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
    if homebrew_casting:
        homebrew_progression = homebrew_spell_progression(existing, canonical_class, before_level, after_level)
        before_capacity = int(homebrew_progression.get("prepared_before", 0) or 0)
        after_capacity = int(homebrew_progression.get("prepared_after", 0) or 0)
    else:
        before_capacity = prepared_spell_capacity(canonical_class, before_level, edition)
        after_capacity = prepared_spell_capacity(canonical_class, after_level, edition)

    enforce_capacity = bool(homebrew_casting) or edition == "2024"
    if enforce_capacity and after_capacity > 0:
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
    if enforce_capacity and after_capacity > 0 and len(result) > after_capacity:
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


def validate_homebrew_level_up_spell_choices(
    existing: Dict[str, Any],
    update_data: Dict[str, Any],
    level_up: LevelUpRequest,
    leveled_class: str,
) -> None:
    definition = homebrew_spellcasting_for_class(existing, leveled_class)
    if not definition:
        return

    before_levels = initial_class_levels(existing)
    after_levels = update_data.get("class_levels") if isinstance(update_data.get("class_levels"), dict) else before_levels
    before_level = _class_level(before_levels, leveled_class)
    after_level = _class_level(after_levels, leveled_class)
    progression = homebrew_spell_progression(existing, leveled_class, before_level, after_level)
    required_cantrips = int(progression.get("cantrips_gain", 0) or 0)
    required_spells = int(
        progression.get("prepared_gain", 0)
        if definition.get("type") == "prepared"
        else progression.get("spells_gain", 0)
        or 0
    )
    submitted_cantrips = len(list(level_up.new_cantrips or []))
    submitted_spells = len(list(level_up.new_spells or []))

    if submitted_cantrips != required_cantrips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{display_class_name(leveled_class)} requires exactly {required_cantrips} new cantrip"
                f"{'s' if required_cantrips != 1 else ''} at this class level; received {submitted_cantrips}."
            ),
        )
    if submitted_spells != required_spells:
        label = "prepared spell" if definition.get("type") == "prepared" else "spell"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{display_class_name(leveled_class)} requires exactly {required_spells} new {label}"
                f"{'s' if required_spells != 1 else ''} at this class level; received {submitted_spells}."
            ),
        )


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
    homebrew_casting = homebrew_spellcasting_for_class(existing, canonical_class)
    mode = str(homebrew_casting.get("type") or "known") if homebrew_casting else spell_selection_mode(canonical_class, edition)
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
    if shared_slots:
        return shared_slots
    if warlock_level > 0:
        return _pact_magic_slot_shape(warlock_level)
    for class_name, level in (class_levels or {}).items():
        definition = homebrew_spellcasting_for_class(existing, class_name)
        if definition and definition.get("progression") == "pact":
            return _slot_map(class_spell_slots(existing, class_name, _int(level, 0)))
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


def _pact_class_info(character: Dict[str, Any], class_levels: Dict[str, Any]) -> Tuple[str, int, Dict[str, int], int, bool]:
    warlock_level = _warlock_level(class_levels)
    if warlock_level > 0:
        return "Warlock", warlock_level, _pact_magic_slot_shape(warlock_level), 1, False

    for class_name, raw_level in (class_levels or {}).items():
        definition = homebrew_spellcasting_for_class(character, class_name)
        level = max(0, _int(raw_level, 0))
        if not definition or definition.get("progression") != "pact":
            continue
        start_level = max(1, _int(definition.get("start_level"), 1))
        if level < start_level:
            continue
        return class_name, level, _slot_map(class_spell_slots(character, class_name, level)), start_level, True

    return "", 0, {}, 1, False


def preserve_pact_magic_resource(existing: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Scale built-in or persisted custom Pact Magic without granting a free refill."""
    class_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else initial_class_levels(existing)
    pact_class, pact_level, new_shape, start_level, is_homebrew = _pact_class_info(existing, class_levels)
    resources = dict(existing.get("resources") or {}) if isinstance(existing.get("resources"), dict) else {}

    if pact_level <= 0 or not new_shape:
        return resources

    new_max = sum(new_shape.values())
    new_slot_level = max((_int(level, 0) for level in new_shape), default=1)
    old_tracker = resources.get("pact_magic") if isinstance(resources.get("pact_magic"), dict) else {}

    if old_tracker:
        old_max = _tracker_number(old_tracker, "max", new_max)
        old_current = _tracker_number(old_tracker, "current", _tracker_number(old_tracker, "remaining", old_max))
    else:
        old_levels = initial_class_levels(existing)
        _, old_pact_level, old_shape, _, _ = _pact_class_info(existing, old_levels)
        old_max = sum(old_shape.values())
        if old_pact_level > 0 and len(old_levels) == 1:
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
        "min_level": start_level,
        "className": pact_class,
        **({"homebrew": True} if is_homebrew else {}),
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

    primary_class_name = display_class_name(existing.get("character_class", ""))
    primary_class = _normalise_name(primary_class_name)
    class_levels = update.get("class_levels") if isinstance(update.get("class_levels"), dict) else initial_class_levels(existing)
    pact_class, pact_level, _, _, _ = _pact_class_info(existing, class_levels)
    single_pool_is_pact = bool(pact_class) and _normalise_name(pact_class) == primary_class and len(class_levels) == 1

    slot_character = dict(existing)
    if update.get("subclass"):
        slot_character["subclass"] = update.get("subclass")
    update["spell_slots"] = progression_spell_slot_totals(slot_character, class_levels)
    update["spell_slots_remaining"] = preserve_spell_slot_state(
        existing.get("spell_slots"),
        existing.get("spell_slots_remaining"),
        update.get("spell_slots"),
        pact_style=single_pool_is_pact and pact_level > 0,
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

    custom_primary = homebrew_spellcasting_for_class(existing, primary_class_name)
    if custom_primary and custom_primary.get("ability"):
        ability = str(custom_primary.get("ability"))
        ability_score = _int(update.get(ability, existing.get(ability, 10)), 10)
        ability_modifier = (ability_score - 10) // 2
        proficiency = _int(update.get("proficiency_bonus"), _int(existing.get("proficiency_bonus"), 2))
        update["spellcasting_ability"] = ability
        update["spell_save_dc"] = 8 + proficiency + ability_modifier
        update["spell_attack_bonus"] = proficiency + ability_modifier

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
    validate_homebrew_level_up_spell_choices(existing, update_data, level_up, leveled_class)
    update_data = route_level_up_spell_choices(existing, update_data, level_up, leveled_class)

    if homebrew_spellcasting_for_class(existing, leveled_class) and level_up.new_cantrips:
        update_data["cantrips_known"] = _merge_unique_spells(
            existing.get("cantrips_known") or [],
            [_tag_spell_source(spell, leveled_class) for spell in level_up.new_cantrips],
        )

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
    existing, _ = await ensure_homebrew_spellcasting_snapshot(existing, username, leveled_class)
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

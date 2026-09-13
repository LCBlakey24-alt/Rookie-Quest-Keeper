"""Safe migration for early 2024 character spell-list saves.

Some older character sheets stored revised prepared-caster spells in the legacy
``spells_known`` field. This route creates the canonical ``spells_prepared``
representation without deleting the legacy source data. Ambiguous multiclass or
over-capacity saves are reported for review instead of guessed.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from config import db
from data.class_progression import prepared_spell_capacity, spell_selection_mode
from routes.characters import display_class_name, edition_for, get_owned_character, initial_class_levels
from utils.auth import get_current_user


router = APIRouter()


def _normalise(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _spell_name(spell: Any) -> str:
    if isinstance(spell, dict):
        return str(spell.get("name") or spell.get("spell_name") or spell.get("title") or "").strip()
    return str(spell or "").strip()


def _spell_source(spell: Any) -> str:
    if not isinstance(spell, dict):
        return ""
    return str(spell.get("sourceClass") or spell.get("source_class") or spell.get("className") or spell.get("class_name") or "").strip()


def _spell_entry(spell: Any, class_name: str = "") -> Dict[str, Any]:
    entry = dict(spell) if isinstance(spell, dict) else {"name": _spell_name(spell)}
    entry["name"] = _spell_name(entry)
    if class_name and not _spell_source(entry):
        entry["sourceClass"] = display_class_name(class_name)
    return entry


def _unique_spells(spells: Any) -> List[Dict[str, Any]]:
    """Deduplicate one class copy without collapsing multiclass ownership.

    A Bard and Warlock can legitimately both carry the same spell on one
    character. Once sourceClass exists, source + name is the identity. Legacy
    untagged copies keep their own ``legacy`` identity rather than silently
    deleting a sourced class copy.
    """
    output: List[Dict[str, Any]] = []
    seen = set()
    for raw in list(spells or []):
        entry = _spell_entry(raw)
        name_key = _normalise(entry.get("name"))
        source_key = _normalise(_spell_source(entry)) or "legacy"
        key = (source_key, name_key)
        if not name_key or key in seen:
            continue
        seen.add(key)
        output.append(entry)
    return output


def build_spell_list_migration(existing: Dict[str, Any]) -> Dict[str, Any]:
    """Return safe migration updates plus review metadata for one character."""
    edition = edition_for(existing)
    current_prepared = _unique_spells(
        existing.get("spells_prepared")
        or existing.get("prepared_spells")
        or existing.get("preparedSpells")
        or []
    )
    if edition != "2024":
        return {
            "edition": edition,
            "updates": {},
            "migrated_classes": [],
            "review_required": [],
            "ambiguous": False,
            "changed": False,
        }

    class_levels = initial_class_levels(existing)
    prepared_classes = [
        (display_class_name(class_name), int(level or 0))
        for class_name, level in class_levels.items()
        if int(level or 0) > 0 and spell_selection_mode(display_class_name(class_name), edition) == "prepared"
    ]
    if not prepared_classes:
        return {
            "edition": edition,
            "updates": {},
            "migrated_classes": [],
            "review_required": [],
            "ambiguous": False,
            "changed": False,
        }

    known = _unique_spells(existing.get("spells_known") or existing.get("known_spells") or [])
    if not known:
        return {
            "edition": edition,
            "updates": {},
            "migrated_classes": [],
            "review_required": [],
            "ambiguous": False,
            "changed": False,
        }

    tagged_known = [spell for spell in known if _spell_source(spell)]
    untagged_known = [spell for spell in known if not _spell_source(spell)]
    prepared_has_sources = any(_spell_source(spell) for spell in current_prepared)
    migrated: List[Dict[str, Any]] = []
    migrated_classes: List[str] = []
    review_required: List[Dict[str, Any]] = []
    ambiguous = False

    for class_name, level in prepared_classes:
        class_key = _normalise(class_name)
        if current_prepared:
            if prepared_has_sources:
                already = any(_normalise(_spell_source(spell)) == class_key for spell in current_prepared)
            else:
                # An untagged canonical prepared list cannot safely be split among
                # multiple prepared classes. Treat it as already canonical for a
                # single prepared class, or request review for multiclass saves.
                already = len(prepared_classes) == 1
                if len(prepared_classes) > 1:
                    ambiguous = True
            if already:
                continue

        class_legacy = [spell for spell in tagged_known if _normalise(_spell_source(spell)) == class_key]
        if not class_legacy and untagged_known:
            if len(prepared_classes) == 1:
                class_legacy = untagged_known
            else:
                ambiguous = True

        if not class_legacy:
            continue

        capacity = prepared_spell_capacity(class_name, level, edition)
        tagged = [_spell_entry(spell, class_name) for spell in class_legacy]
        if capacity > 0 and len(tagged) > capacity:
            review_required.append({
                "class_name": class_name,
                "class_level": level,
                "capacity": capacity,
                "legacy_count": len(tagged),
                "overflow": len(tagged) - capacity,
                "reason": "over_capacity",
            })
            continue

        migrated.extend(tagged)
        migrated_classes.append(class_name)

    next_prepared = _unique_spells([*current_prepared, *migrated])
    updates: Dict[str, Any] = {}
    if len(next_prepared) > len(current_prepared):
        updates = {
            "spells_prepared": next_prepared,
            "prepared_spells": next_prepared,
            "preparedSpells": next_prepared,
            "spell_list_migration": {
                "version": 1,
                "source": "legacy_known_to_2024_prepared",
                "migrated_classes": migrated_classes,
                "legacy_preserved": True,
            },
        }

    if ambiguous:
        review_required.append({
            "reason": "ambiguous_multiclass_source",
            "message": "Legacy untagged spells could belong to more than one prepared class.",
        })

    return {
        "edition": edition,
        "updates": updates,
        "migrated_classes": migrated_classes,
        "review_required": review_required,
        "ambiguous": ambiguous,
        "changed": bool(updates),
    }


@router.post("/characters/{character_id}/spell-lists/migrate")
async def migrate_character_spell_lists(
    character_id: str,
    username: str = Depends(get_current_user),
):
    existing = await get_owned_character(character_id, username)
    migration = build_spell_list_migration(existing)
    if migration["updates"]:
        await db.player_characters.update_one(
            {"id": character_id, "user_id": username},
            {"$set": migration["updates"]},
        )
    character = await get_owned_character(character_id, username)
    return {
        "character": character,
        "migration": {key: value for key, value in migration.items() if key != "updates"},
    }

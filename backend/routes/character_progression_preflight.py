"""Class-aware level-up preflight for the player progression wizard.

The legacy preflight assumes every level goes into the character's original
primary class. Multiclass characters need to be able to continue *any* class
that they already own. This focused route shadows the legacy endpoint and
returns choices for the requested existing class while keeping total-level
proficiency and shared spell-slot math correct.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from config import get_subclass_unlock_level
from data.class_progression import (
    cantrips_to_learn as progression_cantrips_to_learn,
    class_progression_summary,
    feats_for_edition,
    spells_to_learn as progression_spells_to_learn,
    subclasses_for,
)
from routes.character_progression_state import progression_spell_slot_totals
from routes.characters import (
    display_class_name,
    edition_for,
    get_owned_character,
    hit_die_for,
    initial_class_levels,
    normalize_ruleset_id,
    proficiency_for,
    asi_levels_for,
)
from utils.auth import get_current_user


router = APIRouter()


def _normalise_name(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _existing_class_name(class_levels: Dict[str, int], requested: str) -> Optional[str]:
    key = _normalise_name(requested)
    return next((name for name in class_levels if _normalise_name(name) == key), None)


def _subclass_for(existing: Dict[str, Any], class_name: str) -> str:
    key = _normalise_name(class_name)
    for entry in existing.get("classes") or []:
        if not isinstance(entry, dict):
            continue
        entry_name = entry.get("name") or entry.get("class_name") or entry.get("character_class") or entry.get("class")
        if _normalise_name(entry_name) == key:
            return str(entry.get("subclass") or "")

    subclass_map = existing.get("class_subclasses") if isinstance(existing.get("class_subclasses"), dict) else {}
    for saved_name, subclass in subclass_map.items():
        if _normalise_name(saved_name) == key:
            return str(subclass or "")

    primary = display_class_name(existing.get("character_class", ""))
    if _normalise_name(primary) == key:
        return str(existing.get("subclass") or "")
    return ""


def build_level_up_preflight(
    existing: Dict[str, Any],
    *,
    character_id: str = "",
    target_level: Optional[int] = None,
    target_class: Optional[str] = None,
) -> Dict[str, Any]:
    current_total_level = int(existing.get("level", 1) or 1)
    next_total_level = int(target_level or current_total_level + 1)
    if next_total_level != current_total_level + 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only preview the next level: {current_total_level + 1}",
        )

    class_levels = initial_class_levels(existing)
    requested = display_class_name(target_class or existing.get("character_class", "Fighter"))
    character_class = _existing_class_name(class_levels, requested)
    if not character_class:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{requested} is not currently on this character. Use the multiclass option to add a new class.",
        )

    class_level_before = int(class_levels.get(character_class, 0) or 0)
    class_level_after = class_level_before + 1
    next_class_levels = dict(class_levels)
    next_class_levels[character_class] = class_level_after

    edition = edition_for(existing)
    subclass_unlock_level = get_subclass_unlock_level(character_class, edition)
    already_has_subclass = bool(_subclass_for(existing, character_class))
    can_choose_subclass = class_level_after >= subclass_unlock_level and not already_has_subclass
    general_feats = feats_for_edition(edition, "general")
    origin_feats = feats_for_edition(edition, "origin")

    previous_slots = progression_spell_slot_totals(existing, class_levels)
    next_slots = progression_spell_slot_totals(existing, next_class_levels)

    return {
        "character_id": character_id or existing.get("id", ""),
        "character_name": existing.get("name", ""),
        "character_class": character_class,
        "target_class": character_class,
        "edition": edition,
        "ruleset_id": existing.get("ruleset_id") or normalize_ruleset_id(edition),
        "current_level": current_total_level,
        "target_level": next_total_level,
        "class_level_before": class_level_before,
        "class_level_after": class_level_after,
        "hit_die": hit_die_for(character_class),
        "proficiency_bonus": proficiency_for(next_total_level),
        "previous_proficiency_bonus": proficiency_for(current_total_level),
        "spell_slots": next_slots,
        "previous_spell_slots": previous_slots,
        "spells_to_learn": progression_spells_to_learn(character_class, class_level_before, class_level_after),
        "cantrips_to_learn": progression_cantrips_to_learn(character_class, class_level_before, class_level_after),
        "is_asi_level": class_level_after in asi_levels_for(character_class),
        "asi_levels": asi_levels_for(character_class),
        "can_choose_subclass": can_choose_subclass,
        "subclass_unlock_level": subclass_unlock_level,
        "subclass_options": subclasses_for(character_class) if can_choose_subclass else [],
        "feat_options": general_feats,
        "general_feat_options": general_feats,
        "origin_feat_options": origin_feats,
        "class_levels": class_levels,
        "next_class_levels": next_class_levels,
        "progression_reference": class_progression_summary(character_class, edition),
    }


@router.get("/characters/{character_id}/level-up-options")
async def get_character_level_up_options_class_aware(
    character_id: str,
    target_level: Optional[int] = None,
    target_class: Optional[str] = None,
    username: str = Depends(get_current_user),
):
    existing = await get_owned_character(character_id, username)
    return build_level_up_preflight(
        existing,
        character_id=character_id,
        target_level=target_level,
        target_class=target_class,
    )

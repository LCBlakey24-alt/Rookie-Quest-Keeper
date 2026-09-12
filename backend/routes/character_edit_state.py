"""State-safe owner edits for the full character builder.

The current full builder was originally written as a creation form. Reusing its
creation-shaped payload for PATCH requests can otherwise refill HP, Hit Dice,
spell slots and class resources, erase conditions, replace earned inventory, or
collapse higher-level progression. This route sits before the legacy lenient
PATCH route and narrows full-builder edits to fields that are safe to change
without pretending the character rested or levelled.

Normal sheet PATCHes are still accepted here with the same owner/GM permission
boundary as the lenient route. Only payloads marked ``creation_mode=full`` from
the owner receive the builder-edit safety policy.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from config import db
from routes.character_patch import GM_COMBAT_PATCH_FIELDS, _clean_patch
from utils.auth import get_current_user


router = APIRouter()

# These fields are descriptive/player-authored rather than adventuring state.
# They are safe for the creation-style editor to change on an existing sheet.
SAFE_BUILDER_EDIT_FIELDS = {
    "name",
    "race",
    "subrace",
    "background",
    "alignment",
    "portrait_url",
    "personality_trait",
    "personality_traits",
    "ideal",
    "ideals",
    "bond",
    "bonds",
    "flaw",
    "flaws",
    "backstory",
    "appearance",
    "notes",
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
    "saving_throw_proficiencies",
    "skill_proficiencies",
    "weapon_proficiencies",
    "armor_proficiencies",
    "armour_proficiencies",
    "tool_proficiencies",
    "languages",
    "racial_traits",
}

# A never-played level-1 single-class character can safely correct structural
# builder choices. Even here, live counters/inventory are deliberately not
# accepted from the creation-shaped edit payload.
LEVEL_ONE_BUILD_FIELDS = {
    "character_class",
    "subclass",
    "edition",
    "rules_edition",
    "ruleset_id",
    "fighting_style",
    "class_features",
    "feats",
    "spellcasting_ability",
    "spell_save_dc",
    "spell_attack_bonus",
    "spell_slots",
    "spells_known",
    "spells_prepared",
    "cantrips_known",
    "spellbook",
}


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _saved_class_count(existing: Dict[str, Any]) -> int:
    levels = existing.get("class_levels") or existing.get("multiclass_levels") or {}
    if isinstance(levels, dict):
        count = sum(1 for level in levels.values() if _int(level, 0) > 0)
        if count:
            return count
    classes = existing.get("classes") or []
    if isinstance(classes, list):
        count = sum(1 for entry in classes if isinstance(entry, dict) and _int(entry.get("level"), 0) > 0)
        if count:
            return count
    return 1 if existing.get("character_class") else 0


def is_full_builder_edit(payload: Dict[str, Any]) -> bool:
    return str((payload or {}).get("creation_mode") or "").strip().lower() == "full"


def state_safe_builder_edit(existing: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return a safe subset of a full-builder PATCH payload.

    The full builder is allowed to edit identity, story, ability scores and
    proficiencies. Progression/live state remains owned by the sheet, inventory,
    rest and level-up flows. A level-1 single-class sheet may additionally fix
    class/rules/spell selections without accepting any automatic refill state.
    """
    cleaned = _clean_patch(payload)
    safe_fields = set(SAFE_BUILDER_EDIT_FIELDS)

    level = max(1, _int(existing.get("level"), 1))
    if level == 1 and _saved_class_count(existing) <= 1:
        safe_fields.update(LEVEL_ONE_BUILD_FIELDS)

    update = {key: value for key, value in cleaned.items() if key in safe_fields}
    # _clean_patch adds this timestamp; keep it even though it is not a player
    # editable field so the library/sheet can still sort by the latest edit.
    if cleaned.get("updated_at"):
        update["updated_at"] = cleaned["updated_at"]
    return update


@router.patch("/characters/{character_id}")
async def patch_character_state_safe(
    character_id: str,
    payload: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    existing = await db.player_characters.find_one({"id": character_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Character not found")

    is_owner = existing.get("user_id") == username
    if not is_owner:
        campaign_id = existing.get("campaign_id")
        campaign = await db.campaigns.find_one(
            {"id": campaign_id, "dm_user_id": username},
            {"_id": 0, "id": 1},
        ) if campaign_id else None
        linked_member = await db.campaign_members.find_one(
            {"campaign_id": campaign_id, "character_id": character_id},
            {"_id": 0, "id": 1},
        ) if campaign_id else None
        if not campaign or not linked_member:
            raise HTTPException(status_code=404, detail="Character not found")
        disallowed = [
            key
            for key, value in (payload or {}).items()
            if value is not None and key not in GM_COMBAT_PATCH_FIELDS
        ]
        if disallowed:
            raise HTTPException(status_code=403, detail="GM access is limited to linked character combat state")

    if is_owner and is_full_builder_edit(payload):
        update_data = state_safe_builder_edit(existing, payload)
    else:
        update_data = _clean_patch(payload)

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.player_characters.update_one({"id": character_id}, {"$set": update_data})
    return await db.player_characters.find_one({"id": character_id}, {"_id": 0})

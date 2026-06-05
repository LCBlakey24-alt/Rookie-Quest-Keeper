"""Lenient character PATCH route for player sheet and builder recovery.

The frontend now sends a wider set of safe character-sheet fields than the old
strict update model accepted. This route prevents generic 422/failed-save errors
when saving portrait_url, notes, inspiration, conditions, death saves, inventory,
spell slot state, and other live-sheet fields.
"""
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from config import db
from utils.auth import get_current_user

router = APIRouter()

ALLOWED_CHARACTER_PATCH_FIELDS = {
    "name", "race", "subrace", "character_class", "subclass", "background",
    "edition", "ruleset_id", "alignment", "portrait_url",
    "personality_trait", "personality_traits", "ideal", "ideals", "bond", "bonds", "flaw", "flaws", "backstory", "notes",
    "level", "experience_points", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    "armor_class", "initiative_bonus", "speed", "max_hit_points", "current_hit_points", "temporary_hit_points", "temp_hp",
    "hit_dice", "hit_dice_remaining", "death_saves_successes", "death_saves_failures",
    "proficiency_bonus", "conditions", "exhaustion_level", "inspiration", "has_inspiration",
    "concentrating_on", "concentration",
    "saving_throw_proficiencies", "skill_proficiencies", "weapon_proficiencies", "armor_proficiencies",
    "armour_proficiencies", "tool_proficiencies", "languages", "racial_traits", "class_features", "feats",
    "spellcasting_ability", "spell_save_dc", "spell_attack_bonus", "spell_slots", "spell_slots_remaining",
    "used_spell_slots", "spells_known", "spells_prepared", "cantrips_known", "prepared_spell_names",
    "equipment", "inventory", "equipped", "item_effects", "currency", "gold", "fighting_style", "equipment_choice", "starting_equipment",
    "resources", "class_levels", "multiclass_levels", "level_progression", "asi_increases",
}

NUMERIC_FIELDS = {
    "level", "experience_points", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    "armor_class", "initiative_bonus", "speed", "max_hit_points", "current_hit_points", "temporary_hit_points", "temp_hp",
    "hit_dice_remaining", "death_saves_successes", "death_saves_failures", "proficiency_bonus", "exhaustion_level", "gold",
}


def _compute_item_effects(equipped: dict) -> dict:
    effects = {
        'attack_bonus': 0,
        'ac_bonus': 0,
        'stat_bonuses': {
            'strength': 0, 'dexterity': 0, 'constitution': 0,
            'intelligence': 0, 'wisdom': 0, 'charisma': 0,
        }
    }
    for item in (equipped or {}).values():
        if not isinstance(item, dict):
            continue
        effects['attack_bonus'] += int(item.get('attack_bonus') or 0)
        effects['ac_bonus'] += int(item.get('ac_bonus') or 0)
        for stat in effects['stat_bonuses']:
            effects['stat_bonuses'][stat] += int((item.get('stat_bonuses') or {}).get(stat) or 0)
    return effects


def _clean_patch(payload: Dict[str, Any]) -> Dict[str, Any]:
    update: Dict[str, Any] = {}
    for key, value in (payload or {}).items():
        if key not in ALLOWED_CHARACTER_PATCH_FIELDS:
            continue
        if value is None:
            continue
        if key in NUMERIC_FIELDS:
            try:
                value = int(value)
            except (TypeError, ValueError):
                continue
        update[key] = value

    if "temp_hp" in update and "temporary_hit_points" not in update:
        update["temporary_hit_points"] = update["temp_hp"]
    if "temporary_hit_points" in update:
        update["temp_hp"] = update["temporary_hit_points"]

    if "has_inspiration" in update and "inspiration" not in update:
        update["inspiration"] = bool(update["has_inspiration"])
    if "inspiration" in update:
        update["has_inspiration"] = bool(update["inspiration"])

    if "concentration" in update and "concentrating_on" not in update:
        update["concentrating_on"] = update["concentration"]
    if "concentrating_on" in update:
        update["concentration"] = update["concentrating_on"]

    if "level" in update:
        update["proficiency_bonus"] = 2 + ((max(1, int(update["level"])) - 1) // 4)

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    return update


@router.patch("/characters/{character_id}")
async def patch_character_lenient(character_id: str, payload: Dict[str, Any], username: str = Depends(get_current_user)):
    existing = await db.player_characters.find_one({"id": character_id, "user_id": username})
    if not existing:
        raise HTTPException(status_code=404, detail="Character not found")

    update_data = _clean_patch(payload)
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if 'equipped' in update_data:
        update_data['item_effects'] = _compute_item_effects(update_data['equipped'])

    await db.player_characters.update_one({"id": character_id, "user_id": username}, {"$set": update_data})
    updated = await db.player_characters.find_one({"id": character_id, "user_id": username}, {"_id": 0})
    return updated

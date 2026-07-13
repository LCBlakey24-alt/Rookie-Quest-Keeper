"""Lenient character routes for player sheet and builder recovery.

The frontend sends a wider set of safe character-sheet fields than the old
strict models accepted. These routes prevent generic 422/failed-save errors
when saving portrait_url, notes, inspiration, conditions, death saves, inventory,
spell slot state, spellbook entries, and other live-sheet fields.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user

router = APIRouter()

CORE_HIT_DICE = {
    "barbarian": 12,
    "fighter": 10,
    "paladin": 10,
    "ranger": 10,
    "bard": 8,
    "cleric": 8,
    "druid": 8,
    "monk": 8,
    "rogue": 8,
    "warlock": 8,
    "sorcerer": 6,
    "wizard": 6,
}

ALLOWED_CHARACTER_PATCH_FIELDS = {
    "name", "race", "subrace", "character_class", "subclass", "background",
    "edition", "rules_edition", "ruleset_id", "alignment", "portrait_url", "creation_mode",
    "personality_trait", "personality_traits", "ideal", "ideals", "bond", "bonds", "flaw", "flaws", "backstory", "appearance", "notes",
    "level", "experience_points", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    "armor_class", "initiative_bonus", "speed", "max_hit_points", "current_hit_points", "temporary_hit_points", "temp_hp",
    "hit_dice", "hit_dice_remaining", "death_saves_successes", "death_saves_failures",
    "proficiency_bonus", "conditions", "exhaustion_level", "inspiration", "has_inspiration",
    "concentrating_on", "concentration",
    "saving_throw_proficiencies", "skill_proficiencies", "weapon_proficiencies", "armor_proficiencies",
    "armour_proficiencies", "tool_proficiencies", "languages", "racial_traits", "class_features", "feats",
    "spellcasting_ability", "spell_save_dc", "spell_attack_bonus", "spell_slots", "spell_slots_remaining",
    "used_spell_slots", "spells_known", "spells_prepared", "cantrips_known", "prepared_spell_names", "spellbook", "spell_preparation_loadout",
    "equipment", "inventory", "equipped", "item_effects", "currency", "gold", "fighting_style", "equipment_choice", "starting_equipment",
    "resources", "class_levels", "multiclass_levels", "level_progression", "asi_increases",
    "campaign_id", "campaign_name", "campaign_join_status",
}

NUMERIC_FIELDS = {
    "level", "experience_points", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    "armor_class", "initiative_bonus", "speed", "max_hit_points", "current_hit_points", "temporary_hit_points", "temp_hp",
    "hit_dice_remaining", "death_saves_successes", "death_saves_failures", "proficiency_bonus", "exhaustion_level", "gold",
    "spell_save_dc", "spell_attack_bonus",
}

LIST_FIELDS = {
    "conditions", "saving_throw_proficiencies", "skill_proficiencies", "weapon_proficiencies", "armor_proficiencies",
    "armour_proficiencies", "tool_proficiencies", "languages", "racial_traits", "class_features", "feats",
    "spells_known", "spells_prepared", "cantrips_known", "spellbook", "starting_equipment", "equipment", "inventory",
}

DICT_FIELDS = {
    "spell_slots", "spell_slots_remaining", "used_spell_slots", "equipped", "item_effects", "currency",
    "resources", "class_levels", "multiclass_levels", "level_progression", "asi_increases",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text if text else default


def _class_key(value: Any) -> str:
    return _text(value).lower().replace(" ", "_").replace("-", "_")


def _ability_mod(score: Any) -> int:
    try:
        value = int(score or 10)
    except (TypeError, ValueError):
        value = 10
    return (value - 10) // 2


def _proficiency_for(level: Any) -> int:
    try:
        value = int(level or 1)
    except (TypeError, ValueError):
        value = 1
    return 2 + ((max(1, value) - 1) // 4)


def _hit_die_for(class_name: Any) -> int:
    return CORE_HIT_DICE.get(_class_key(class_name), 8)


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _list(value: Any) -> List[Any]:
    return [item for item in value if item] if isinstance(value, list) else []


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _normalise_spell_list(value: Any) -> List[Dict[str, Any]]:
    spells = []
    for spell in _list(value):
        if isinstance(spell, dict):
            name = spell.get("name") or spell.get("spell_name") or spell.get("title")
            if name:
                spells.append({**spell, "name": str(name)})
        elif str(spell).strip():
            spells.append({"name": str(spell).strip()})
    return spells


def _normalise_equipment_list(value: Any) -> List[Dict[str, Any]]:
    items = []
    for item in _list(value):
        if isinstance(item, dict):
            name = item.get("name") or item.get("item_name") or item.get("title")
            if name:
                items.append({**item, "name": str(name), "equipped": bool(item.get("equipped", False))})
        elif str(item).strip():
            items.append({"name": str(item).strip(), "equipped": False})
    return items


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
            value = _int(value, 0)
        elif key in LIST_FIELDS:
            value = _list(value)
        elif key in DICT_FIELDS:
            value = _dict(value)
        update[key] = value

    if "rules_edition" in update and "edition" not in update:
        update["edition"] = update["rules_edition"]
    if "edition" in update and "rules_edition" not in update:
        update["rules_edition"] = update["edition"]

    if "ideal" in update and "ideals" not in update:
        update["ideals"] = update["ideal"]
    if "bond" in update and "bonds" not in update:
        update["bonds"] = update["bond"]
    if "flaw" in update and "flaws" not in update:
        update["flaws"] = update["flaw"]
    if "personality_trait" in update and "personality_traits" not in update:
        update["personality_traits"] = update["personality_trait"]

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

    if "spellbook" in update:
        update["spellbook"] = _normalise_spell_list(update["spellbook"])
    if "spells_known" in update:
        update["spells_known"] = _normalise_spell_list(update["spells_known"])
    if "spells_prepared" in update:
        update["spells_prepared"] = _normalise_spell_list(update["spells_prepared"])
    if "cantrips_known" in update:
        update["cantrips_known"] = _normalise_spell_list(update["cantrips_known"])

    if "starting_equipment" in update and "equipment" not in update:
        update["equipment"] = _normalise_equipment_list(update["starting_equipment"])
    if "equipment" in update:
        update["equipment"] = _normalise_equipment_list(update["equipment"])
    if "inventory" in update:
        update["inventory"] = _normalise_equipment_list(update["inventory"])
    elif "equipment" in update:
        update["inventory"] = update["equipment"]

    if "level" in update:
        update["proficiency_bonus"] = _proficiency_for(update["level"])

    if 'equipped' in update:
        update['item_effects'] = _compute_item_effects(update['equipped'])

    update["updated_at"] = _now()
    return update


def _clean_create(payload: Dict[str, Any], username: str) -> Dict[str, Any]:
    data = _clean_patch(payload)

    name = _text(data.get("name"))
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Give your character a name before saving.")

    level = max(1, _int(data.get("level"), 1))
    character_class = _text(data.get("character_class"), "Fighter")
    hit_die = _hit_die_for(character_class)
    constitution = _int(data.get("constitution"), 10)
    dexterity = _int(data.get("dexterity"), 10)
    edition = "2024" if "2024" in str(data.get("edition") or data.get("rules_edition") or data.get("ruleset_id") or "") else "2014"
    max_hp = _int(data.get("max_hit_points"), max(1, hit_die + _ability_mod(constitution)))
    temp_hp = _int(data.get("temporary_hit_points", data.get("temp_hp", 0)), 0)
    starting_equipment = _list(data.get("starting_equipment"))
    equipment = _normalise_equipment_list(data.get("equipment")) or _normalise_equipment_list(starting_equipment)
    inventory = _normalise_equipment_list(data.get("inventory")) or equipment
    equipped = _dict(data.get("equipped"))
    currency = _dict(data.get("currency")) or {"copper": 0, "silver": 0, "electrum": 0, "gold": _int(data.get("gold"), 0), "platinum": 0}

    return {
        **data,
        "id": str(uuid.uuid4()),
        "user_id": username,
        "name": name,
        "race": _text(data.get("race"), "Human"),
        "subrace": _text(data.get("subrace")),
        "character_class": character_class,
        "subclass": _text(data.get("subclass")),
        "background": _text(data.get("background")),
        "level": level,
        "edition": edition,
        "rules_edition": edition,
        "ruleset_id": _text(data.get("ruleset_id"), "dnd5e_2024" if edition == "2024" else "dnd5e_2014"),
        "strength": _int(data.get("strength"), 10),
        "dexterity": dexterity,
        "constitution": constitution,
        "intelligence": _int(data.get("intelligence"), 10),
        "wisdom": _int(data.get("wisdom"), 10),
        "charisma": _int(data.get("charisma"), 10),
        "armor_class": _int(data.get("armor_class"), 10 + _ability_mod(dexterity)),
        "speed": _int(data.get("speed"), 30),
        "max_hit_points": max_hp,
        "current_hit_points": _int(data.get("current_hit_points"), max_hp),
        "temporary_hit_points": temp_hp,
        "temp_hp": temp_hp,
        "hit_dice": _text(data.get("hit_dice"), f"{level}d{hit_die}"),
        "hit_dice_remaining": _int(data.get("hit_dice_remaining"), level),
        "proficiency_bonus": _int(data.get("proficiency_bonus"), _proficiency_for(level)),
        "saving_throw_proficiencies": _list(data.get("saving_throw_proficiencies")),
        "skill_proficiencies": _list(data.get("skill_proficiencies")),
        "weapon_proficiencies": _list(data.get("weapon_proficiencies")),
        "armor_proficiencies": _list(data.get("armor_proficiencies") or data.get("armour_proficiencies")),
        "tool_proficiencies": _list(data.get("tool_proficiencies")),
        "languages": _list(data.get("languages")),
        "racial_traits": _list(data.get("racial_traits")),
        "class_features": _list(data.get("class_features")),
        "feats": _list(data.get("feats")),
        "spell_slots": _dict(data.get("spell_slots")),
        "spell_slots_remaining": _dict(data.get("spell_slots_remaining")) or _dict(data.get("spell_slots")),
        "spells_known": _normalise_spell_list(data.get("spells_known")),
        "spells_prepared": _normalise_spell_list(data.get("spells_prepared")),
        "cantrips_known": _normalise_spell_list(data.get("cantrips_known")),
        "spellbook": _normalise_spell_list(data.get("spellbook")),
        "starting_equipment": starting_equipment,
        "equipment": equipment,
        "inventory": inventory,
        "equipped": equipped,
        "item_effects": _compute_item_effects(equipped),
        "currency": currency,
        "gold": _int(currency.get("gold"), _int(data.get("gold"), 0)),
        "resources": _dict(data.get("resources")),
        "conditions": _list(data.get("conditions")),
        "inspiration": bool(data.get("inspiration", False)),
        "has_inspiration": bool(data.get("has_inspiration", data.get("inspiration", False))),
        "created_at": _now(),
        "updated_at": _now(),
    }


@router.post("/characters", status_code=status.HTTP_201_CREATED)
async def create_character_lenient(payload: Dict[str, Any], username: str = Depends(get_current_user)):
    character = _clean_create(payload, username)
    await db.player_characters.insert_one(character)
    character.pop("_id", None)
    return {
        "success": True,
        "message": f"{character['name']} created successfully!",
        "character_id": character["id"],
        "character": character,
    }


@router.patch("/characters/{character_id}")
async def patch_character_lenient(character_id: str, payload: Dict[str, Any], username: str = Depends(get_current_user)):
    existing = await db.player_characters.find_one({"id": character_id, "user_id": username})
    if not existing:
        raise HTTPException(status_code=404, detail="Character not found")

    update_data = _clean_patch(payload)
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.player_characters.update_one({"id": character_id, "user_id": username}, {"$set": update_data})
    updated = await db.player_characters.find_one({"id": character_id, "user_id": username}, {"_id": 0})
    return updated

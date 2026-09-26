"""Conservative one-time recovery for pre-snapshot custom caster characters."""

from __future__ import annotations

from typing import Any, Dict, Tuple

from config import db
from data.spell_slot_rules import (
    build_homebrew_spellcasting_snapshot,
    homebrew_spellcasting_for_class,
)

CORE_CLASSES = {
    "barbarian", "bard", "cleric", "druid", "fighter", "monk",
    "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
}


def _key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _edition(character: Dict[str, Any]) -> str:
    raw = character.get("rules_edition") or character.get("edition") or character.get("ruleset_id") or "2014"
    return "2024" if "2024" in str(raw) else "2014"


async def _eligible_class_owners(character: Dict[str, Any], username: str) -> list[str]:
    owners = [username]
    campaign_id = str(character.get("campaign_id") or "").strip()
    character_id = str(character.get("id") or "").strip()
    if not campaign_id or not character_id:
        return owners

    member = await db.campaign_members.find_one(
        {
            "campaign_id": campaign_id,
            "character_id": character_id,
            "status": {"$ne": "removed"},
        },
        {"_id": 0, "campaign_id": 1},
    )
    if not member:
        return owners

    campaign = await db.campaigns.find_one(
        {"id": campaign_id},
        {"_id": 0, "dm_user_id": 1},
    )
    dm_user_id = str((campaign or {}).get("dm_user_id") or "").strip()
    if dm_user_id and dm_user_id not in owners:
        owners.append(dm_user_id)
    return owners


async def ensure_homebrew_spellcasting_snapshot(
    character: Dict[str, Any],
    username: str,
    class_name: str,
) -> Tuple[Dict[str, Any], bool]:
    """Hydrate a missing custom caster snapshot from an entitled class record.

    Exact normalized class-name matching is required. If no matching class with
    explicit spellcasting metadata exists, the character is returned untouched.
    """
    if _key(class_name) in CORE_CLASSES:
        return character, False
    if homebrew_spellcasting_for_class(character, class_name):
        return character, False

    owners = await _eligible_class_owners(character, username)
    records = await db.user_classes.find({"user_id": {"$in": owners}}, {"_id": 0}).to_list(1000)
    wanted = _key(class_name)
    character_edition = _edition(character)
    match = next(
        (
            record
            for record in records
            if _key(record.get("name") or record.get("title")) == wanted
            and isinstance(record.get("spellcasting"), dict)
            and (
                not str(record.get("edition") or "").strip()
                or _edition(record) == character_edition
            )
        ),
        None,
    )
    if not match:
        return character, False

    snapshot = build_homebrew_spellcasting_snapshot(match.get("spellcasting"), class_name)
    if not snapshot:
        return character, False

    saved = character.get("homebrew_spellcasting")
    next_saved = dict(saved) if isinstance(saved, dict) else {}
    next_saved[class_name] = snapshot
    updated = {**character, "homebrew_spellcasting": next_saved}

    character_id = str(character.get("id") or "").strip()
    if character_id:
        await db.player_characters.update_one(
            {"id": character_id, "user_id": username},
            {"$set": {"homebrew_spellcasting": next_saved}},
        )
    return updated, True

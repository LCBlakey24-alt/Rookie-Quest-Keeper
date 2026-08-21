"""GM-facing live party feed.

The campaign can contain real player-owned character sheets as well as older
GM-managed roster records. Live Play should prefer real linked characters so
combat uses the same HP/AC/conditions the player sees, while keeping legacy
records as a fallback for older campaigns.
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()


def _int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _name_key(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _ability_mod(score: Any) -> int:
    return (_int(score, 10) - 10) // 2


def _character_row(character: Dict[str, Any], member: Dict[str, Any]) -> Dict[str, Any]:
    max_hp = max(1, _int(character.get("max_hit_points"), 10))
    temp_hp = max(0, _int(character.get("temporary_hit_points", character.get("temp_hp", 0)), 0))
    return {
        "id": character.get("id"),
        "character_id": character.get("id"),
        "member_id": member.get("id"),
        "name": character.get("name") or character.get("character_name") or "Player Character",
        "character_class": character.get("character_class") or character.get("class_name") or "",
        "level": _int(character.get("level"), 1),
        "hp": max(0, _int(character.get("current_hit_points"), max_hp)),
        "max_hp": max_hp,
        "temporary_hit_points": temp_hp,
        "temp_hp": temp_hp,
        "ac": _int(character.get("armor_class"), 10),
        "initiativeMod": _int(character.get("initiative_bonus"), _ability_mod(character.get("dexterity"))),
        "conditions": character.get("conditions") if isinstance(character.get("conditions"), list) else [],
        "death_saves_successes": max(0, min(3, _int(character.get("death_saves_successes"), 0))),
        "death_saves_failures": max(0, min(3, _int(character.get("death_saves_failures"), 0))),
        "concentrating_on": str(character.get("concentrating_on") or character.get("concentration") or ""),
        "stats": {
            "strength": _int(character.get("strength"), 10),
            "dexterity": _int(character.get("dexterity"), 10),
            "constitution": _int(character.get("constitution"), 10),
            "intelligence": _int(character.get("intelligence"), 10),
            "wisdom": _int(character.get("wisdom"), 10),
            "charisma": _int(character.get("charisma"), 10),
        },
        "source": "character",
        "member_status": member.get("status", "active"),
    }


def _legacy_row(player: Dict[str, Any]) -> Dict[str, Any]:
    max_hp = max(1, _int(player.get("max_hp"), _int(player.get("hp"), 10)))
    stats = player.get("stats") if isinstance(player.get("stats"), dict) else {}
    return {
        "id": player.get("id"),
        "character_id": None,
        "legacy_player_id": player.get("id"),
        "name": player.get("name") or "Player Character",
        "character_class": player.get("character_class") or "",
        "level": _int(player.get("level"), 1),
        "hp": max(0, _int(player.get("hp"), max_hp)),
        "max_hp": max_hp,
        "temporary_hit_points": 0,
        "temp_hp": 0,
        "ac": _int(player.get("ac"), 10),
        "initiativeMod": _ability_mod(stats.get("dexterity")),
        "conditions": player.get("conditions") if isinstance(player.get("conditions"), list) else [],
        "death_saves_successes": 0,
        "death_saves_failures": 0,
        "concentrating_on": "",
        "stats": stats,
        "source": "legacy",
        "member_status": "gm_roster",
    }


@router.get("/campaigns/{campaign_id}/live-party")
async def get_live_party(campaign_id: str, username: str = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Return the GM's combat-ready party, preferring real linked sheets."""
    await verify_campaign_ownership(campaign_id, username)

    members = await db.campaign_members.find(
        {"campaign_id": campaign_id, "status": {"$in": ["active", None]}},
        {"_id": 0},
    ).to_list(1000)
    character_ids = [member.get("character_id") for member in members if member.get("character_id")]
    characters = []
    if character_ids:
        characters = await db.player_characters.find(
            {"id": {"$in": character_ids}},
            {"_id": 0},
        ).to_list(1000)
    character_by_id = {character.get("id"): character for character in characters}

    rows: List[Dict[str, Any]] = []
    real_names = set()
    for member in members:
        character = character_by_id.get(member.get("character_id"))
        if not character:
            continue
        row = _character_row(character, member)
        rows.append(row)
        real_names.add(_name_key(row.get("name")))

    legacy_players = await db.players.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
    for player in legacy_players:
        if _name_key(player.get("name")) in real_names:
            continue
        rows.append(_legacy_row(player))

    return rows

"""Deterministic session-note world sync helpers.

These helpers intentionally cover high-confidence, table-common notes without
requiring an LLM key: deaths, NPC deaths, and NPC relocations. The sync is
append-only for narrative text and only changes explicit state fields when the
note clearly names an existing character/NPC.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


DEATH_PATTERNS = (
    "died",
    "is dead",
    "has died",
    "was killed",
    "has been killed",
    "is killed",
    "was slain",
    "has been slain",
    "is slain",
    "fell in battle",
    "has fallen in battle",
)

NEGATED_DEATH_PATTERNS = (
    "nearly died",
    "almost died",
    "did not die",
    "didn't die",
    "not dead",
    "fake death",
    "pretended to die",
)

MOVE_VERBS = (
    "chosen to move",
    "chose to move",
    "has moved",
    "moved",
    "relocated",
    "has relocated",
    "travelled",
    "traveled",
    "went",
    "has gone",
    "left",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def _contains_name(text: str, name: str) -> bool:
    normalised_text = f" {_normalise(text)} "
    normalised_name = f" {_normalise(name)} "
    return bool(name and normalised_name.strip() and normalised_name in normalised_text)


def _append_note(existing: str, note_text: str, label: str = "Session note") -> str:
    stamped = f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}] {label}: {note_text.strip()}"
    if not existing:
        return stamped
    if stamped in existing:
        return existing
    return f"{existing.rstrip()}\n\n{stamped}"


def _has_clear_death_for_name(note_text: str, name: str) -> bool:
    if not _contains_name(note_text, name):
        return False
    lowered = _normalise(note_text)
    if any(pattern in lowered for pattern in NEGATED_DEATH_PATTERNS):
        return False
    name_pattern = re.escape(name.strip())
    death_alt = "|".join(re.escape(pattern) for pattern in DEATH_PATTERNS)
    forward = re.compile(rf"\b{name_pattern}\b[^.\n;]{{0,90}}\b({death_alt})\b", re.IGNORECASE)
    reverse = re.compile(rf"\b({death_alt})\b[^.\n;]{{0,90}}\b{name_pattern}\b", re.IGNORECASE)
    return bool(forward.search(note_text) or reverse.search(note_text))


def _extract_destination_for_name(note_text: str, name: str) -> Optional[str]:
    if not _contains_name(note_text, name):
        return None
    name_pattern = re.escape(name.strip())
    move_alt = "|".join(re.escape(verb) for verb in MOVE_VERBS)
    patterns = [
        rf"\b{name_pattern}\b[^.\n;]{{0,120}}\b(?:{move_alt})\b\s+(?:to|for|into)\s+(?:the\s+)?([^.;,\n]+)",
        rf"\b{name_pattern}\b[^.\n;]{{0,120}}\bleft\s+for\s+(?:the\s+)?([^.;,\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, note_text, re.IGNORECASE)
        if not match:
            continue
        destination = match.group(1).strip()
        destination = re.sub(r"^(?:a|an)\s+(?:new\s+)?(?:city|town|village|location|place)\s+(?:called|named)\s+", "", destination, flags=re.IGNORECASE)
        destination = re.split(r"\s+(?:and|where|because|after|before|then)\b", destination, maxsplit=1, flags=re.IGNORECASE)[0]
        destination = destination.strip(" .,:;!?'\"")
        if 2 <= len(destination) <= 80:
            return destination
    return None


def _find_location(locations: Iterable[Dict[str, Any]], destination: str) -> Optional[Dict[str, Any]]:
    wanted = _normalise(destination)
    for location in locations:
        if _normalise(location.get("name", "")) == wanted:
            return location
    return None


async def apply_session_note_world_sync(db: Any, campaign_id: str, note: Dict[str, Any]) -> Dict[str, Any]:
    """Apply clear session-note changes to campaign collections.

    Returns a payload suitable for API responses. It never deletes data and only
    mutates named, existing NPC/player records or creates a location when an NPC
    clearly moves to a destination that does not already exist.
    """
    note_text = (note.get("content") or "").strip()
    sync_id = str(uuid.uuid4())
    applied: List[Dict[str, Any]] = []
    touched_collections = set()

    if not note_text:
        return {"sync_id": sync_id, "applied_updates": [], "touched_collections": []}

    now = _now()
    characters = await db.player_characters.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100)
    npcs = await db.npcs.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
    locations = await db.locations.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)

    for character in characters:
        name = character.get("name", "")
        if not _has_clear_death_for_name(note_text, name):
            continue
        conditions = list(character.get("conditions") or [])
        if "dead" not in [str(c).lower() for c in conditions]:
            conditions.append("dead")
        await db.player_characters.update_one(
            {"id": character.get("id"), "campaign_id": campaign_id},
            {"$set": {
                "current_hit_points": 0,
                "temporary_hit_points": 0,
                "conditions": conditions,
                "notes": _append_note(character.get("notes", ""), note_text, "Session sync"),
                "updated_at": now,
            }},
        )
        touched_collections.add("player_characters")
        applied.append({
            "type": "player_character_status",
            "entity_id": character.get("id"),
            "entity_name": name,
            "summary": f"Marked {name} as dead, set HP to 0, and appended the session note.",
        })

    for npc in npcs:
        name = npc.get("name", "")
        npc_updates: Dict[str, Any] = {}
        summaries: List[str] = []

        if _has_clear_death_for_name(note_text, name):
            npc_updates.update({
                "hp": 0,
                "notes": _append_note(npc.get("notes", ""), note_text, "Session sync"),
            })
            summaries.append(f"marked {name} as dead / HP 0")

        destination = _extract_destination_for_name(note_text, name)
        if destination:
            location = _find_location(locations, destination)
            if not location:
                location = {
                    "id": str(uuid.uuid4()),
                    "campaign_id": campaign_id,
                    "name": destination,
                    "location_type": "city",
                    "description": "Created from a live session note.",
                    "notable_npcs": name,
                    "notes": _append_note("", note_text, "Session sync"),
                    "places_of_interest": [],
                    "created_at": now,
                }
                await db.locations.insert_one(location)
                locations.append(location)
                touched_collections.add("locations")
                applied.append({
                    "type": "location_created",
                    "entity_id": location["id"],
                    "entity_name": destination,
                    "summary": f"Created location {destination} from the note.",
                })
            else:
                notable = location.get("notable_npcs", "")
                if name and name.lower() not in notable.lower():
                    notable = f"{notable}, {name}".strip(" ,")
                await db.locations.update_one(
                    {"id": location.get("id"), "campaign_id": campaign_id},
                    {"$set": {
                        "notable_npcs": notable,
                        "notes": _append_note(location.get("notes", ""), note_text, "Session sync"),
                    }},
                )
                touched_collections.add("locations")

            npc_updates.update({
                "location": destination,
                "notes": _append_note(npc_updates.get("notes", npc.get("notes", "")), note_text, "Session sync"),
            })
            summaries.append(f"moved {name} to {destination}")

        if npc_updates:
            await db.npcs.update_one(
                {"id": npc.get("id"), "campaign_id": campaign_id},
                {"$set": npc_updates},
            )
            touched_collections.add("npcs")
            applied.append({
                "type": "npc_update",
                "entity_id": npc.get("id"),
                "entity_name": name,
                "summary": "; ".join(summaries) + ".",
            })

    await db.ingame_notes.update_one(
        {"id": note.get("id"), "campaign_id": campaign_id},
        {"$set": {
            "world_synced": True,
            "world_sync_id": sync_id,
            "world_sync_applied_at": now,
            "world_sync_summary": applied,
        }},
    )

    return {
        "sync_id": sync_id,
        "applied_updates": applied,
        "touched_collections": sorted(touched_collections),
    }

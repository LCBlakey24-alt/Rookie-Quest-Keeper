"""Deterministic session-note world sync helpers.

These helpers intentionally cover high-confidence, table-common notes without
requiring an LLM key: deaths, NPC deaths, and NPC relocations. The sync is
append-only for narrative text and only changes explicit state fields when the
note clearly names an existing character/NPC.
"""
from __future__ import annotations

import re
import hashlib
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


def _proposal_id(note_id: str, kind: str, entity_id: str, detail: str = "") -> str:
    """A stable id for one proposed change.

    Derived from the note and the thing it would touch, so the same note
    proposes the same ids every time it is previewed. That is what lets an
    approval be checked against what the GM actually saw, and what makes a
    retried apply a no-op instead of a second mutation.
    """
    raw = "|".join([str(note_id), kind, str(entity_id), detail])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


async def propose_session_note_world_sync(db: Any, campaign_id: str, note: Dict[str, Any]) -> Dict[str, Any]:
    """Work out what a note SUGGESTS, without changing anything.

    Nothing in here writes. Rook and deterministic detection suggest; the GM
    decides. Saving a note used to run the applier directly, so writing
    "Rina died" into the live log set a real character's hit points to zero,
    marked them dead and rewrote their notes, with no review anywhere.
    """
    note_text = (note.get("content") or "").strip()
    note_id = str(note.get("id") or "")
    proposals: List[Dict[str, Any]] = []
    if not note_text:
        return {"note_id": note_id, "proposals": []}

    characters = await db.player_characters.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100)
    npcs = await db.npcs.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
    locations = await db.locations.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)

    for character in characters:
        name = character.get("name", "")
        if not _has_clear_death_for_name(note_text, name):
            continue
        proposals.append({
            "id": _proposal_id(note_id, "player_character_status", character.get("id")),
            "type": "player_character_status",
            "entity_id": character.get("id"),
            "entity_name": name,
            "summary": f"Mark {name} as dead and set hit points to 0.",
        })

    for npc in npcs:
        name = npc.get("name", "")
        if _has_clear_death_for_name(note_text, name):
            proposals.append({
                "id": _proposal_id(note_id, "npc_status", npc.get("id")),
                "type": "npc_status",
                "entity_id": npc.get("id"),
                "entity_name": name,
                "summary": f"Mark {name} as dead and set hit points to 0.",
            })
        destination = _extract_destination_for_name(note_text, name)
        if destination:
            existing = _find_location(locations, destination)
            proposals.append({
                "id": _proposal_id(note_id, "npc_location", npc.get("id"), destination),
                "type": "npc_location",
                "entity_id": npc.get("id"),
                "entity_name": name,
                "destination": destination,
                "creates_location": existing is None,
                "summary": (
                    f"Move {name} to {destination}"
                    + ("" if existing else f", creating the location {destination}")
                    + "."
                ),
            })

    return {"note_id": note_id, "proposals": proposals}


async def apply_session_note_world_sync(
    db: Any,
    campaign_id: str,
    note: Dict[str, Any],
    approved_ids: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Apply only the proposals the GM has explicitly approved.

    approved_ids is required. Calling without it applies nothing: there is no
    "apply everything" path, because that is exactly how a saved note came to
    rewrite campaign records on its own.

    Proposals already recorded against this note are skipped, so a retried or
    duplicated request cannot apply the same change twice.
    """
    approved = {str(value) for value in (approved_ids or []) if value}
    preview = await propose_session_note_world_sync(db, campaign_id, note)
    proposals = preview["proposals"]
    note_id = preview["note_id"]

    already = {str(value) for value in (note.get("world_sync_applied_ids") or [])}
    to_apply = [item for item in proposals if item["id"] in approved and item["id"] not in already]

    sync_id = str(uuid.uuid4())
    now = _now()
    applied: List[Dict[str, Any]] = []
    touched_collections = set()

    if not to_apply:
        return {
            "sync_id": sync_id,
            "note_id": note_id,
            "proposals": proposals,
            "applied_updates": [],
            "skipped_already_applied": sorted(already & approved),
            "touched_collections": [],
        }

    characters = await db.player_characters.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100)
    npcs = await db.npcs.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
    locations = await db.locations.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
    by_id = lambda rows, wanted: next((row for row in rows if row.get("id") == wanted), None)  # noqa: E731

    for item in to_apply:
        kind = item["type"]

        if kind == "player_character_status":
            character = by_id(characters, item["entity_id"])
            if not character:
                continue
            conditions = list(character.get("conditions") or [])
            if "dead" not in [str(value).lower() for value in conditions]:
                conditions.append("dead")
            await db.player_characters.update_one(
                {"id": character.get("id"), "campaign_id": campaign_id},
                {"$set": {
                    "current_hit_points": 0,
                    "temporary_hit_points": 0,
                    "conditions": conditions,
                    "notes": _append_note(character.get("notes", ""), note.get("content", ""), "Session sync"),
                    "updated_at": now,
                }},
            )
            touched_collections.add("player_characters")

        elif kind == "npc_status":
            npc = by_id(npcs, item["entity_id"])
            if not npc:
                continue
            await db.npcs.update_one(
                {"id": npc.get("id"), "campaign_id": campaign_id},
                {"$set": {
                    "hp": 0,
                    "notes": _append_note(npc.get("notes", ""), note.get("content", ""), "Session sync"),
                }},
            )
            touched_collections.add("npcs")

        elif kind == "npc_location":
            npc = by_id(npcs, item["entity_id"])
            if not npc:
                continue
            destination = item["destination"]
            location = _find_location(locations, destination)
            if not location:
                location = {
                    "id": str(uuid.uuid4()),
                    "campaign_id": campaign_id,
                    "name": destination,
                    "location_type": "city",
                    "description": "Created from a live session note.",
                    "notable_npcs": item["entity_name"],
                    "notes": _append_note("", note.get("content", ""), "Session sync"),
                    "places_of_interest": [],
                    "created_at": now,
                }
                await db.locations.insert_one(location)
                locations.append(location)
            else:
                notable = location.get("notable_npcs", "")
                if item["entity_name"] and item["entity_name"].lower() not in notable.lower():
                    notable = f"{notable}, {item['entity_name']}".strip(" ,")
                await db.locations.update_one(
                    {"id": location.get("id"), "campaign_id": campaign_id},
                    {"$set": {
                        "notable_npcs": notable,
                        "notes": _append_note(location.get("notes", ""), note.get("content", ""), "Session sync"),
                    }},
                )
            touched_collections.add("locations")
            await db.npcs.update_one(
                {"id": npc.get("id"), "campaign_id": campaign_id},
                {"$set": {
                    "location": destination,
                    "notes": _append_note(npc.get("notes", ""), note.get("content", ""), "Session sync"),
                }},
            )
            touched_collections.add("npcs")
        else:
            continue

        applied.append(item)

    await db.ingame_notes.update_one(
        {"id": note.get("id"), "campaign_id": campaign_id},
        {"$set": {
            "world_synced": True,
            "world_sync_id": sync_id,
            "world_sync_applied_at": now,
            "world_sync_summary": applied,
        },
            "$addToSet": {"world_sync_applied_ids": {"$each": [item["id"] for item in applied]}},
        },
    )

    return {
        "sync_id": sync_id,
        "note_id": note_id,
        "proposals": proposals,
        "applied_updates": applied,
        "skipped_already_applied": sorted(already & approved),
        "touched_collections": sorted(touched_collections),
    }

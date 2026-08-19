"""Lightweight campaign state used while the table is playing.

This stores temporary campaign facts that should not permanently rewrite the
underlying prep object. The first use is NPCs currently travelling with the
party. Saved encounters can later surface these NPCs as suggested participants.

The suggestion endpoint deliberately uses deterministic text rules rather than
an LLM. Rookie can notice clear, named companion changes for free, but the GM
must confirm before live state changes.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

JOIN_PHRASES = (
    "joins the party",
    "joined the party",
    "joins them",
    "joined them",
    "travels with the party",
    "travels with them",
    "travelled with the party",
    "travelled with them",
    "travels with us",
    "travelling with the party",
    "travelling with them",
    "travelling with us",
    "traveling with the party",
    "traveling with them",
    "traveling with us",
    "comes with the party",
    "comes with them",
    "comes with us",
    "came with the party",
    "came with them",
    "came with us",
    "accompanies the party",
    "accompanies them",
    "accompanies us",
    "agrees to help the party",
    "agrees to help them",
    "agrees to help us",
    "goes with the party",
    "goes with them",
    "goes with us",
)

LEAVE_PHRASES = (
    "leaves the party",
    "left the party",
    "leaves them",
    "left them",
    "leaves us",
    "left us",
    "stops travelling with the party",
    "stops travelling with them",
    "stops travelling with us",
    "stops traveling with the party",
    "stops traveling with them",
    "stops traveling with us",
    "parts ways with the party",
    "parts ways with them",
    "parts ways with us",
    "parted ways with the party",
    "parted ways with them",
    "parted ways with us",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalise_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def contains_name(text: str, name: str) -> bool:
    wanted = normalise_text(name)
    haystack = f" {normalise_text(text)} "
    return bool(wanted and f" {wanted} " in haystack)


def phrase_near_name(text: str, name: str, phrases: tuple[str, ...], window: int = 160) -> bool:
    """Only treat a phrase as belonging to an NPC when it is near their name."""
    if not contains_name(text, name):
        return False
    lowered = str(text or "").lower()
    name_pattern = re.escape(str(name or "").strip())
    phrase_alt = "|".join(re.escape(phrase) for phrase in phrases)
    forward = re.compile(rf"\b{name_pattern}\b[^.\n;]{{0,{window}}}\b(?:{phrase_alt})\b", re.IGNORECASE)
    reverse = re.compile(rf"\b(?:{phrase_alt})\b[^.\n;]{{0,{window}}}\b{name_pattern}\b", re.IGNORECASE)
    return bool(forward.search(lowered) or reverse.search(lowered))


class CampaignLiveStateUpdate(BaseModel):
    companion_npc_ids: List[str] = Field(default_factory=list)


class LiveNoteSuggestionRequest(BaseModel):
    content: str


async def ensure_valid_npc_ids(campaign_id: str, npc_ids: List[str]) -> List[str]:
    unique_ids = list(dict.fromkeys([str(value) for value in npc_ids if value]))
    if not unique_ids:
        return []
    existing = await db.npcs.find(
        {"campaign_id": campaign_id, "id": {"$in": unique_ids}},
        {"_id": 0, "id": 1},
    ).to_list(1000)
    existing_ids = {item.get("id") for item in existing}
    return [npc_id for npc_id in unique_ids if npc_id in existing_ids]


async def linked_open_quest_context(campaign_id: str, npc_id: str) -> Dict[str, Any]:
    """Return quest context with unfinished objective encounters ranked first."""
    quests = await db.quests.find(
        {
            "campaign_id": campaign_id,
            "linked_npc_ids": npc_id,
            "status": {"$in": ["draft", "available", "active"]},
        },
        {"_id": 0, "title": 1, "linked_encounter_ids": 1, "objectives": 1},
    ).to_list(100)

    all_encounter_ids: List[str] = []
    unfinished_encounter_ids: List[str] = []
    for quest in quests:
        all_encounter_ids.extend(quest.get("linked_encounter_ids") or [])
        for objective in quest.get("objectives") or []:
            encounter_id = objective.get("linked_encounter_id")
            status_value = str(objective.get("status") or "upcoming").strip().lower()
            if encounter_id and status_value not in {"completed", "skipped"}:
                unfinished_encounter_ids.append(encounter_id)

    all_ids = list(dict.fromkeys([value for value in all_encounter_ids if value]))
    priority_ids = list(dict.fromkeys([value for value in unfinished_encounter_ids if value]))
    ordered_ids = list(dict.fromkeys([*priority_ids, *all_ids]))

    encounter_docs: List[Dict[str, Any]] = []
    if ordered_ids:
        encounter_docs = await db.combat_scenarios.find(
            {"campaign_id": campaign_id, "id": {"$in": ordered_ids}},
            {"_id": 0, "id": 1, "name": 1},
        ).to_list(200)
    by_id = {item.get("id"): item for item in encounter_docs if item.get("id")}
    ordered_encounters = [
        {
            "id": encounter_id,
            "name": (by_id.get(encounter_id) or {}).get("name") or "Linked Encounter",
            "priority": encounter_id in priority_ids,
        }
        for encounter_id in ordered_ids
    ]
    suggested = ordered_encounters[0] if ordered_encounters else None

    return {
        "quest_titles": [quest.get("title") for quest in quests if quest.get("title")],
        "encounter_ids": all_ids,
        "encounters": ordered_encounters,
        "suggested_encounter_id": suggested.get("id") if suggested else None,
        "suggested_encounter_name": suggested.get("name") if suggested else None,
    }


@router.get("/campaigns/{campaign_id}/live-state")
async def get_campaign_live_state(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    state = await db.campaign_live_state.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if state:
        return state
    return {
        "campaign_id": campaign_id,
        "companion_npc_ids": [],
        "updated_at": None,
    }


@router.put("/campaigns/{campaign_id}/live-state")
async def update_campaign_live_state(campaign_id: str, payload: CampaignLiveStateUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    companion_ids = await ensure_valid_npc_ids(campaign_id, payload.companion_npc_ids)
    state = {
        "campaign_id": campaign_id,
        "companion_npc_ids": companion_ids,
        "updated_at": now_iso(),
        "updated_by": username,
    }
    await db.campaign_live_state.update_one(
        {"campaign_id": campaign_id},
        {"$set": state},
        upsert=True,
    )
    return state


@router.post("/campaigns/{campaign_id}/live-state/suggestions")
async def suggest_live_state_changes(campaign_id: str, payload: LiveNoteSuggestionRequest, username: str = Depends(get_current_user)):
    """Suggest clear companion changes from a live note without applying them."""
    await verify_campaign_ownership(campaign_id, username)
    content = (payload.content or "").strip()
    if not content:
        return {"suggestions": []}

    npcs = await db.npcs.find({"campaign_id": campaign_id}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    state = await db.campaign_live_state.find_one({"campaign_id": campaign_id}, {"_id": 0}) or {}
    current_companions = set(state.get("companion_npc_ids") or [])
    suggestions: List[Dict[str, Any]] = []

    for npc in npcs:
        npc_id = npc.get("id")
        name = npc.get("name") or ""
        if not npc_id or not name or not contains_name(content, name):
            continue

        change_type = None
        if phrase_near_name(content, name, LEAVE_PHRASES) and npc_id in current_companions:
            change_type = "companion_remove"
        elif phrase_near_name(content, name, JOIN_PHRASES) and npc_id not in current_companions:
            change_type = "companion_add"

        if not change_type:
            continue

        context = await linked_open_quest_context(campaign_id, npc_id)
        suggestions.append({
            "id": f"{change_type}:{npc_id}",
            "type": change_type,
            "npc_id": npc_id,
            "npc_name": name,
            "title": f"{name} {'is travelling with the party' if change_type == 'companion_add' else 'has left the travelling party'}?",
            "description": "Confirm this temporary campaign-state change. The saved NPC record will not be rewritten.",
            "affected_quest_titles": context["quest_titles"],
            "affected_encounter_ids": context["encounter_ids"],
            "affected_encounters": context["encounters"],
            "suggested_encounter_id": context["suggested_encounter_id"],
            "suggested_encounter_name": context["suggested_encounter_name"],
        })

    return {"suggestions": suggestions}

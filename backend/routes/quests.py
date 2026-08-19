"""Persistent quest routes for GM prep and live play.

A quest is campaign content, not a session. It remains available until the GM
changes its status and can link to encounters, NPCs, locations, maps, handouts,
and rewards without imposing a play order.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

QUEST_STATUSES = {"draft", "available", "active", "completed", "failed", "archived"}
OBJECTIVE_STATUSES = {"upcoming", "completed", "skipped"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class QuestObjectivePayload(BaseModel):
    title: str
    status: str = "upcoming"
    optional: bool = False
    notes: str = ""
    linked_encounter_id: str = ""
    dependency_ids: List[str] = Field(default_factory=list)


class QuestCreate(BaseModel):
    title: str
    summary: str = ""
    hook: str = ""
    status: str = "draft"
    gm_notes: str = ""
    objectives: List[QuestObjectivePayload] = Field(default_factory=list)
    linked_npc_ids: List[str] = Field(default_factory=list)
    linked_location_ids: List[str] = Field(default_factory=list)
    linked_encounter_ids: List[str] = Field(default_factory=list)
    linked_map_ids: List[str] = Field(default_factory=list)
    linked_handout_ids: List[str] = Field(default_factory=list)
    linked_reward_ids: List[str] = Field(default_factory=list)
    is_pinned: bool = False


class QuestUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    hook: Optional[str] = None
    status: Optional[str] = None
    gm_notes: Optional[str] = None
    objectives: Optional[List[Dict[str, Any]]] = None
    linked_npc_ids: Optional[List[str]] = None
    linked_location_ids: Optional[List[str]] = None
    linked_encounter_ids: Optional[List[str]] = None
    linked_map_ids: Optional[List[str]] = None
    linked_handout_ids: Optional[List[str]] = None
    linked_reward_ids: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class QuestObjectiveUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    optional: Optional[bool] = None
    notes: Optional[str] = None
    linked_encounter_id: Optional[str] = None
    dependency_ids: Optional[List[str]] = None


def validate_quest_status(value: str) -> str:
    normalised = (value or "draft").lower()
    if normalised not in QUEST_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown quest status: {value}")
    return normalised


def normalise_objective(data: Dict[str, Any]) -> Dict[str, Any]:
    objective_status = (data.get("status") or "upcoming").lower()
    if objective_status not in OBJECTIVE_STATUSES:
        objective_status = "upcoming"
    return {
        "id": data.get("id") or f"objective-{uuid4().hex}",
        "title": (data.get("title") or "Untitled objective").strip(),
        "status": objective_status,
        "optional": bool(data.get("optional", False)),
        "notes": data.get("notes") or "",
        "linked_encounter_id": data.get("linked_encounter_id") or "",
        "dependency_ids": data.get("dependency_ids") if isinstance(data.get("dependency_ids"), list) else [],
        "created_at": data.get("created_at") or now_iso(),
        "updated_at": now_iso(),
    }


async def get_owned_quest(campaign_id: str, quest_id: str, username: str) -> Dict[str, Any]:
    await verify_campaign_ownership(campaign_id, username)
    quest = await db.quests.find_one({"id": quest_id, "campaign_id": campaign_id}, {"_id": 0})
    if not quest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")
    return quest


@router.get("/campaigns/{campaign_id}/quests")
async def list_quests(campaign_id: str, username: str = Depends(get_current_user)):
    """List every persistent quest in a GM-owned campaign."""
    await verify_campaign_ownership(campaign_id, username)
    return await db.quests.find({"campaign_id": campaign_id}, {"_id": 0}).sort([("is_pinned", -1), ("updated_at", -1)]).to_list(500)


@router.get("/campaigns/{campaign_id}/quests/{quest_id}")
async def get_quest(campaign_id: str, quest_id: str, username: str = Depends(get_current_user)):
    return await get_owned_quest(campaign_id, quest_id, username)


@router.post("/campaigns/{campaign_id}/quests", status_code=status.HTTP_201_CREATED)
async def create_quest(campaign_id: str, payload: QuestCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    quest = payload.model_dump()
    quest["status"] = validate_quest_status(quest.get("status", "draft"))
    quest["objectives"] = [normalise_objective(item) for item in quest.get("objectives", [])]
    quest.update({
        "id": f"quest-{uuid4().hex}",
        "campaign_id": campaign_id,
        "created_by": username,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.quests.insert_one(quest)
    quest.pop("_id", None)
    return quest


@router.put("/campaigns/{campaign_id}/quests/{quest_id}")
async def update_quest(campaign_id: str, quest_id: str, payload: QuestUpdate, username: str = Depends(get_current_user)):
    await get_owned_quest(campaign_id, quest_id, username)
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No quest fields to update")
    if "status" in updates:
        updates["status"] = validate_quest_status(updates["status"])
    if "objectives" in updates:
        updates["objectives"] = [normalise_objective(item) for item in updates["objectives"]]
    updates["updated_at"] = now_iso()
    await db.quests.update_one({"id": quest_id, "campaign_id": campaign_id}, {"$set": updates})
    return await get_owned_quest(campaign_id, quest_id, username)


@router.delete("/campaigns/{campaign_id}/quests/{quest_id}")
async def delete_quest(campaign_id: str, quest_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.quests.delete_one({"id": quest_id, "campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")
    return {"message": "Quest deleted"}


@router.post("/campaigns/{campaign_id}/quests/{quest_id}/objectives", status_code=status.HTTP_201_CREATED)
async def add_quest_objective(campaign_id: str, quest_id: str, payload: QuestObjectivePayload, username: str = Depends(get_current_user)):
    quest = await get_owned_quest(campaign_id, quest_id, username)
    objective = normalise_objective(payload.model_dump())
    objectives = [*quest.get("objectives", []), objective]
    await db.quests.update_one(
        {"id": quest_id, "campaign_id": campaign_id},
        {"$set": {"objectives": objectives, "updated_at": now_iso()}},
    )
    return objective


@router.put("/campaigns/{campaign_id}/quests/{quest_id}/objectives/{objective_id}")
async def update_quest_objective(campaign_id: str, quest_id: str, objective_id: str, payload: QuestObjectiveUpdate, username: str = Depends(get_current_user)):
    quest = await get_owned_quest(campaign_id, quest_id, username)
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "status" in updates:
        objective_status = str(updates["status"]).lower()
        if objective_status not in OBJECTIVE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown objective status: {updates['status']}")
        updates["status"] = objective_status

    objectives = []
    found = False
    for objective in quest.get("objectives", []):
        if objective.get("id") == objective_id:
            found = True
            objectives.append({**objective, **updates, "updated_at": now_iso()})
        else:
            objectives.append(objective)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest objective not found")

    await db.quests.update_one(
        {"id": quest_id, "campaign_id": campaign_id},
        {"$set": {"objectives": objectives, "updated_at": now_iso()}},
    )
    return await get_owned_quest(campaign_id, quest_id, username)


@router.delete("/campaigns/{campaign_id}/quests/{quest_id}/objectives/{objective_id}")
async def delete_quest_objective(campaign_id: str, quest_id: str, objective_id: str, username: str = Depends(get_current_user)):
    quest = await get_owned_quest(campaign_id, quest_id, username)
    objectives = [item for item in quest.get("objectives", []) if item.get("id") != objective_id]
    if len(objectives) == len(quest.get("objectives", [])):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest objective not found")
    await db.quests.update_one(
        {"id": quest_id, "campaign_id": campaign_id},
        {"$set": {"objectives": objectives, "updated_at": now_iso()}},
    )
    return {"message": "Quest objective deleted"}

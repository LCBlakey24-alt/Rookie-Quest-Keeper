"""Lightweight campaign state used while the table is playing.

This stores temporary campaign facts that should not permanently rewrite the
underlying prep object. The first use is NPCs currently travelling with the
party. Saved encounters can later surface these NPCs as suggested participants.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class CampaignLiveStateUpdate(BaseModel):
    companion_npc_ids: List[str] = Field(default_factory=list)


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

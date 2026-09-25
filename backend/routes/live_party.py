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
from utils.live_party import build_live_party_rows as _build_live_party_rows

router = APIRouter()


async def build_live_party_rows(campaign_id: str, database=None) -> List[Dict[str, Any]]:
    """Compatibility wrapper for the shared canonical party builder."""
    return await _build_live_party_rows(campaign_id, database or db)


@router.get("/campaigns/{campaign_id}/live-party")
async def get_live_party(campaign_id: str, username: str = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Return the GM's combat-ready party, preferring real linked sheets."""
    await verify_campaign_ownership(campaign_id, username)
    return await build_live_party_rows(campaign_id)

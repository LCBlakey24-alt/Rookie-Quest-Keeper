"""Focused top-level map record integrity routes.

Nested pin/path mutations are owned by map_mutations.py. This module keeps the
small set of top-level map writes that need stronger record/reference scoping
without rewriting the large legacy maps router.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import GameMap, GameMapUpdate, WorldMapUpdate, LocalMap, LocalMapCreate, LocalMapUpdate
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

MAP_RECORD_ROUTE_KEYS = {
    ('PUT', '/campaigns/{campaign_id}/maps/{map_id}'),
    ('PUT', '/campaigns/{campaign_id}/world-maps/{map_id}'),
    ('POST', '/campaigns/{campaign_id}/local-maps'),
    ('PUT', '/campaigns/{campaign_id}/local-maps/{map_id}'),
}


def remove_legacy_map_record_routes(legacy_router) -> int:
    """Remove only the focused top-level map record handlers."""
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in MAP_RECORD_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _require_campaign_location(campaign_id: str, location_id: str) -> None:
    location_id = str(location_id or '').strip()
    if not location_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Choose a campaign Location before creating a local map',
        )
    location = await db.locations.find_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'_id': 0, 'id': 1},
    )
    if not location:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Linked Location was not found in this campaign',
        )


@router.put('/campaigns/{campaign_id}/maps/{map_id}', response_model=GameMap)
async def update_game_map(
    campaign_id: str,
    map_id: str,
    map_data: GameMapUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in map_data.model_dump().items() if value is not None}
    result = await db.maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Map not found')
    updated = await db.maps.find_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Map not found')
    return updated


@router.put('/campaigns/{campaign_id}/world-maps/{map_id}')
async def update_world_map_record(
    campaign_id: str,
    map_id: str,
    update_data: WorldMapUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in update_data.model_dump().items() if value is not None}
    update_dict['updated_at'] = _now()
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='World map not found')
    updated = await db.world_maps.find_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='World map not found')
    return updated


@router.post('/campaigns/{campaign_id}/local-maps')
async def create_local_map_record(
    campaign_id: str,
    map_data: LocalMapCreate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    await _require_campaign_location(campaign_id, map_data.location_id)

    local_map = LocalMap(
        campaign_id=campaign_id,
        location_id=map_data.location_id,
        name=map_data.name,
        map_type=map_data.map_type,
        image_data=map_data.image_data,
        notes=map_data.notes,
    )
    doc = local_map.model_dump()
    await db.local_maps.insert_one(doc)
    return {**doc, '_id': None}


@router.put('/campaigns/{campaign_id}/local-maps/{map_id}')
async def update_local_map_record(
    campaign_id: str,
    map_id: str,
    update_data: LocalMapUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in update_data.model_dump().items() if value is not None}
    update_dict['updated_at'] = _now()
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Local map not found')
    updated = await db.local_maps.find_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Local map not found')
    return updated

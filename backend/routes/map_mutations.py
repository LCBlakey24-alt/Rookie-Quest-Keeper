"""Focused nested map mutation routes.

World/local map creation and reads remain on the legacy maps router. These
handlers own only embedded pin/path mutations so every write is campaign-scoped
and atomic instead of read-modify-write on the whole embedded array.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

MAP_MUTATION_ROUTE_KEYS = {
    ('POST', '/campaigns/{campaign_id}/world-maps/{map_id}/pins'),
    ('PUT', '/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}'),
    ('POST', '/campaigns/{campaign_id}/world-maps/{map_id}/paths'),
    ('PUT', '/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}'),
    ('POST', '/campaigns/{campaign_id}/local-maps/{map_id}/pins'),
    ('PUT', '/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}'),
    ('DELETE', '/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}'),
}

WORLD_PIN_FIELDS = {
    'x', 'y', 'name', 'pin_type', 'linked_location_id', 'linked_place_id',
    'description', 'icon', 'color',
}
LOCAL_PIN_FIELDS = {
    'x', 'y', 'name', 'pin_type', 'linked_place_id', 'description', 'icon', 'color',
}
WORLD_PATH_FIELDS = {
    'from_pin_id', 'to_pin_id', 'distance_value', 'distance_unit',
    'terrain_type', 'terrain_modifier', 'notes', 'is_bidirectional',
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _allowed(payload: Dict[str, Any], allowed_fields: set[str]) -> Dict[str, Any]:
    """Return only explicitly supported embedded fields."""
    return {key: value for key, value in payload.items() if key in allowed_fields}


def remove_legacy_map_mutation_routes(legacy_router) -> int:
    """Remove only nested pin/path handlers from the legacy maps router."""
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in MAP_MUTATION_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


async def _embedded_after_update(collection, *, campaign_id: str, map_id: str, field: str, item_id: str):
    doc = await collection.find_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'_id': 0, field: 1},
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Map not found')
    item = next((entry for entry in doc.get(field, []) if entry.get('id') == item_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Map item not found')
    return item


@router.post('/campaigns/{campaign_id}/world-maps/{map_id}/pins')
async def add_world_map_pin(
    campaign_id: str,
    map_id: str,
    pin_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Location'),
        'pin_type': pin_data.get('pin_type', 'location'),
        'linked_location_id': pin_data.get('linked_location_id'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48'),
    }
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$push': {'pins': new_pin}, '$set': {'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='World map not found')
    return new_pin


@router.put('/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}')
async def update_world_map_pin(
    campaign_id: str,
    map_id: str,
    pin_id: str,
    pin_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    changes = _allowed(pin_data, WORLD_PIN_FIELDS)
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No supported pin fields to update')
    set_values = {f'pins.$.{key}': value for key, value in changes.items()}
    set_values['updated_at'] = _now()
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'pins.id': pin_id},
        {'$set': set_values},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pin not found')
    return await _embedded_after_update(
        db.world_maps,
        campaign_id=campaign_id,
        map_id=map_id,
        field='pins',
        item_id=pin_id,
    )


@router.delete('/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}')
async def delete_world_map_pin(
    campaign_id: str,
    map_id: str,
    pin_id: str,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'pins.id': pin_id},
        {
            '$pull': {
                'pins': {'id': pin_id},
                'paths': {'$or': [
                    {'from_pin_id': pin_id},
                    {'to_pin_id': pin_id},
                ]},
            },
            '$set': {'updated_at': _now()},
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pin not found')
    return {'message': 'Pin deleted'}


@router.post('/campaigns/{campaign_id}/world-maps/{map_id}/paths')
async def add_world_map_path(
    campaign_id: str,
    map_id: str,
    path_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    new_path = {
        'id': str(uuid.uuid4()),
        'from_pin_id': path_data.get('from_pin_id'),
        'to_pin_id': path_data.get('to_pin_id'),
        'distance_value': path_data.get('distance_value', 0),
        'distance_unit': path_data.get('distance_unit', 'miles'),
        'terrain_type': path_data.get('terrain_type', 'road'),
        'terrain_modifier': path_data.get('terrain_modifier', 1.0),
        'notes': path_data.get('notes', ''),
        'is_bidirectional': path_data.get('is_bidirectional', True),
    }
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$push': {'paths': new_path}, '$set': {'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='World map not found')
    return new_path


@router.put('/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}')
async def update_world_map_path(
    campaign_id: str,
    map_id: str,
    path_id: str,
    path_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    changes = _allowed(path_data, WORLD_PATH_FIELDS)
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No supported path fields to update')
    set_values = {f'paths.$.{key}': value for key, value in changes.items()}
    set_values['updated_at'] = _now()
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'paths.id': path_id},
        {'$set': set_values},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Path not found')
    return await _embedded_after_update(
        db.world_maps,
        campaign_id=campaign_id,
        map_id=map_id,
        field='paths',
        item_id=path_id,
    )


@router.delete('/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}')
async def delete_world_map_path(
    campaign_id: str,
    map_id: str,
    path_id: str,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'paths.id': path_id},
        {'$pull': {'paths': {'id': path_id}}, '$set': {'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Path not found')
    return {'message': 'Path deleted'}


@router.post('/campaigns/{campaign_id}/local-maps/{map_id}/pins')
async def add_local_map_pin(
    campaign_id: str,
    map_id: str,
    pin_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Place'),
        'pin_type': pin_data.get('pin_type', 'poi'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48'),
    }
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$push': {'pins': new_pin}, '$set': {'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Local map not found')
    return new_pin


@router.put('/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}')
async def update_local_map_pin(
    campaign_id: str,
    map_id: str,
    pin_id: str,
    pin_data: Dict[str, Any],
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    changes = _allowed(pin_data, LOCAL_PIN_FIELDS)
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No supported pin fields to update')
    set_values = {f'pins.$.{key}': value for key, value in changes.items()}
    set_values['updated_at'] = _now()
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'pins.id': pin_id},
        {'$set': set_values},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pin not found')
    return await _embedded_after_update(
        db.local_maps,
        campaign_id=campaign_id,
        map_id=map_id,
        field='pins',
        item_id=pin_id,
    )


@router.delete('/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}')
async def delete_local_map_pin(
    campaign_id: str,
    map_id: str,
    pin_id: str,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id, 'pins.id': pin_id},
        {'$pull': {'pins': {'id': pin_id}}, '$set': {'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pin not found')
    return {'message': 'Pin deleted'}

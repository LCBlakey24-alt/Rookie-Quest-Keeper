"""Campaign-scoped world hierarchy routes.

These focused routes replace the legacy continent/region/settlement/place
handlers so every read and mutation is both ownership-checked and campaign-scoped.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

HIERARCHY_ROUTE_KEYS = {
    ('GET', '/campaigns/{campaign_id}/world'),
    ('POST', '/campaigns/{campaign_id}/world/continent'),
    ('PUT', '/campaigns/{campaign_id}/world/continent/{continent_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world/continent/{continent_id}'),
    ('POST', '/campaigns/{campaign_id}/world/region'),
    ('PUT', '/campaigns/{campaign_id}/world/region/{region_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world/region/{region_id}'),
    ('POST', '/campaigns/{campaign_id}/world/settlement'),
    ('PUT', '/campaigns/{campaign_id}/world/settlement/{settlement_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world/settlement/{settlement_id}'),
    ('POST', '/campaigns/{campaign_id}/world/place'),
    ('PUT', '/campaigns/{campaign_id}/world/place/{place_id}'),
    ('DELETE', '/campaigns/{campaign_id}/world/place/{place_id}'),
}


def remove_legacy_world_hierarchy_routes(legacy_router) -> int:
    """Remove only hierarchy routes from the legacy world router."""
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in HIERARCHY_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


def _patch(data: dict, type_key: str) -> dict:
    values = {
        'name': data.get('name'),
        type_key: data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes'),
    }
    return {key: value for key, value in values.items() if value is not None}


async def _require_parent(collection, *, campaign_id: str, parent_id: str | None, label: str):
    """Validate a supplied parent belongs to the same campaign.

    Legacy callers were allowed to omit parent_id, so omission remains supported;
    when a parent is supplied it must be campaign-scoped and valid.
    """
    if not parent_id:
        return None
    parent = await collection.find_one({'id': parent_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'{label} not found')
    return parent


@router.get('/campaigns/{campaign_id}/world')
async def get_world_data(campaign_id: str, username: str = Depends(get_current_user)):
    """Return the campaign world tree without crossing campaign boundaries."""
    await verify_campaign_ownership(campaign_id, username)
    continents = await db.world_continents.find(
        {'campaign_id': campaign_id}, {'_id': 0}
    ).to_list(100)

    for continent in continents:
        regions = await db.world_regions.find(
            {'campaign_id': campaign_id, 'parent_id': continent['id']}, {'_id': 0}
        ).to_list(100)
        for region in regions:
            settlements = await db.world_settlements.find(
                {'campaign_id': campaign_id, 'parent_id': region['id']}, {'_id': 0}
            ).to_list(100)
            for settlement in settlements:
                places = await db.world_places.find(
                    {'campaign_id': campaign_id, 'parent_id': settlement['id']}, {'_id': 0}
                ).to_list(100)
                settlement['places'] = places
            region['settlements'] = settlements
        continent['regions'] = regions
    return {'continents': continents}


@router.post('/campaigns/{campaign_id}/world/continent')
async def create_continent(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    continent = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': data.get('name', 'New Continent'),
        'continent_type': data.get('type', 'continent'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.world_continents.insert_one(continent)
    continent.pop('_id', None)
    return continent


@router.put('/campaigns/{campaign_id}/world/continent/{continent_id}')
async def update_continent(campaign_id: str, continent_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_continents.update_one(
        {'id': continent_id, 'campaign_id': campaign_id},
        {'$set': _patch(data, 'continent_type')},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Continent not found')
    return await db.world_continents.find_one(
        {'id': continent_id, 'campaign_id': campaign_id}, {'_id': 0}
    )


@router.delete('/campaigns/{campaign_id}/world/continent/{continent_id}')
async def delete_continent(campaign_id: str, continent_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    continent = await db.world_continents.find_one(
        {'id': continent_id, 'campaign_id': campaign_id}, {'_id': 0}
    )
    if not continent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Continent not found')

    regions = await db.world_regions.find(
        {'campaign_id': campaign_id, 'parent_id': continent_id}, {'id': 1, '_id': 0}
    ).to_list(100)
    for region in regions:
        settlements = await db.world_settlements.find(
            {'campaign_id': campaign_id, 'parent_id': region['id']}, {'id': 1, '_id': 0}
        ).to_list(100)
        for settlement in settlements:
            await db.world_places.delete_many(
                {'campaign_id': campaign_id, 'parent_id': settlement['id']}
            )
        await db.world_settlements.delete_many(
            {'campaign_id': campaign_id, 'parent_id': region['id']}
        )
    await db.world_regions.delete_many(
        {'campaign_id': campaign_id, 'parent_id': continent_id}
    )
    await db.world_continents.delete_one(
        {'id': continent_id, 'campaign_id': campaign_id}
    )
    return {'message': 'Continent deleted'}


@router.post('/campaigns/{campaign_id}/world/region')
async def create_region(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    parent_id = data.get('parent_id')
    await _require_parent(
        db.world_continents, campaign_id=campaign_id, parent_id=parent_id, label='Continent'
    )
    region = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': parent_id,
        'name': data.get('name', 'New Region'),
        'region_type': data.get('type', 'kingdom'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.world_regions.insert_one(region)
    region.pop('_id', None)
    return region


@router.put('/campaigns/{campaign_id}/world/region/{region_id}')
async def update_region(campaign_id: str, region_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_regions.update_one(
        {'id': region_id, 'campaign_id': campaign_id},
        {'$set': _patch(data, 'region_type')},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Region not found')
    return await db.world_regions.find_one(
        {'id': region_id, 'campaign_id': campaign_id}, {'_id': 0}
    )


@router.delete('/campaigns/{campaign_id}/world/region/{region_id}')
async def delete_region(campaign_id: str, region_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    region = await db.world_regions.find_one(
        {'id': region_id, 'campaign_id': campaign_id}, {'_id': 0}
    )
    if not region:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Region not found')

    settlements = await db.world_settlements.find(
        {'campaign_id': campaign_id, 'parent_id': region_id}, {'id': 1, '_id': 0}
    ).to_list(100)
    for settlement in settlements:
        await db.world_places.delete_many(
            {'campaign_id': campaign_id, 'parent_id': settlement['id']}
        )
    await db.world_settlements.delete_many(
        {'campaign_id': campaign_id, 'parent_id': region_id}
    )
    await db.world_regions.delete_one({'id': region_id, 'campaign_id': campaign_id})
    return {'message': 'Region deleted'}


@router.post('/campaigns/{campaign_id}/world/settlement')
async def create_settlement(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    parent_id = data.get('parent_id')
    await _require_parent(
        db.world_regions, campaign_id=campaign_id, parent_id=parent_id, label='Region'
    )
    settlement = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': parent_id,
        'name': data.get('name', 'New Settlement'),
        'settlement_type': data.get('type', 'town'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.world_settlements.insert_one(settlement)
    settlement.pop('_id', None)
    return settlement


@router.put('/campaigns/{campaign_id}/world/settlement/{settlement_id}')
async def update_settlement(campaign_id: str, settlement_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_settlements.update_one(
        {'id': settlement_id, 'campaign_id': campaign_id},
        {'$set': _patch(data, 'settlement_type')},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Settlement not found')
    return await db.world_settlements.find_one(
        {'id': settlement_id, 'campaign_id': campaign_id}, {'_id': 0}
    )


@router.delete('/campaigns/{campaign_id}/world/settlement/{settlement_id}')
async def delete_settlement(campaign_id: str, settlement_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    settlement = await db.world_settlements.find_one(
        {'id': settlement_id, 'campaign_id': campaign_id}, {'_id': 0}
    )
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Settlement not found')
    await db.world_places.delete_many(
        {'campaign_id': campaign_id, 'parent_id': settlement_id}
    )
    await db.world_settlements.delete_one(
        {'id': settlement_id, 'campaign_id': campaign_id}
    )
    return {'message': 'Settlement deleted'}


@router.post('/campaigns/{campaign_id}/world/place')
async def create_world_place(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    parent_id = data.get('parent_id')
    await _require_parent(
        db.world_settlements, campaign_id=campaign_id, parent_id=parent_id, label='Settlement'
    )
    place = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': parent_id,
        'name': data.get('name', 'New Place'),
        'place_type': data.get('type', 'shop'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.world_places.insert_one(place)
    place.pop('_id', None)
    return place


@router.put('/campaigns/{campaign_id}/world/place/{place_id}')
async def update_world_place(campaign_id: str, place_id: str, data: dict, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_places.update_one(
        {'id': place_id, 'campaign_id': campaign_id},
        {'$set': _patch(data, 'place_type')},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Place not found')
    return await db.world_places.find_one(
        {'id': place_id, 'campaign_id': campaign_id}, {'_id': 0}
    )


@router.delete('/campaigns/{campaign_id}/world/place/{place_id}')
async def delete_world_place(campaign_id: str, place_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_places.delete_one({'id': place_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Place not found')
    return {'message': 'Place deleted'}

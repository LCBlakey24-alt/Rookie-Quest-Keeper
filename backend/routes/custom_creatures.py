"""Campaign-owned custom creature routes.

Custom creatures are GM prep content. These focused handlers preserve the
legacy URLs and response shapes while enforcing campaign ownership before any
read or mutation.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import CustomCreature, CustomCreatureCreate
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

CUSTOM_CREATURE_ROUTE_KEYS = {
    ('GET', '/campaigns/{campaign_id}/custom-creatures'),
    ('POST', '/campaigns/{campaign_id}/custom-creatures'),
    ('PUT', '/campaigns/{campaign_id}/custom-creatures/{creature_id}'),
    ('DELETE', '/campaigns/{campaign_id}/custom-creatures/{creature_id}'),
    ('POST', '/campaigns/{campaign_id}/custom-creatures/import'),
}


def remove_legacy_custom_creature_routes(legacy_router) -> int:
    """Remove only custom-creature handlers from the legacy admin router."""
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in CUSTOM_CREATURE_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


def _creature_document(campaign_id: str, creature_data: CustomCreatureCreate, username: str) -> dict:
    creature = CustomCreature(
        campaign_id=campaign_id,
        created_by=username,
        **creature_data.model_dump(),
    )
    return creature.model_dump()


@router.get('/campaigns/{campaign_id}/custom-creatures')
async def get_custom_creatures(campaign_id: str, username: str = Depends(get_current_user)):
    """Return GM-owned custom creatures for one campaign."""
    await verify_campaign_ownership(campaign_id, username)
    return await db.custom_creatures.find(
        {'campaign_id': campaign_id},
        {'_id': 0},
    ).sort('name', 1).to_list(500)


@router.post('/campaigns/{campaign_id}/custom-creatures')
async def create_custom_creature(
    campaign_id: str,
    creature_data: CustomCreatureCreate,
    username: str = Depends(get_current_user),
):
    """Create a custom creature only inside a campaign owned by the caller."""
    await verify_campaign_ownership(campaign_id, username)
    doc = _creature_document(campaign_id, creature_data, username)
    await db.custom_creatures.insert_one(doc)
    doc.pop('_id', None)
    return {'message': 'Custom creature created!', 'creature': doc}


@router.put('/campaigns/{campaign_id}/custom-creatures/{creature_id}')
async def update_custom_creature(
    campaign_id: str,
    creature_id: str,
    creature_data: CustomCreatureCreate,
    username: str = Depends(get_current_user),
):
    """Update a creature only when it belongs to the caller's campaign."""
    await verify_campaign_ownership(campaign_id, username)
    update_data = creature_data.model_dump()
    result = await db.custom_creatures.update_one(
        {'id': creature_id, 'campaign_id': campaign_id},
        {'$set': update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Creature not found')
    return {'message': 'Creature updated!'}


@router.delete('/campaigns/{campaign_id}/custom-creatures/{creature_id}')
async def delete_custom_creature(
    campaign_id: str,
    creature_id: str,
    username: str = Depends(get_current_user),
):
    """Delete a creature only from a campaign owned by the caller."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.custom_creatures.delete_one(
        {'id': creature_id, 'campaign_id': campaign_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Creature not found')
    return {'message': 'Creature deleted!'}


@router.post('/campaigns/{campaign_id}/custom-creatures/import')
async def import_custom_creatures(
    campaign_id: str,
    creatures: List[CustomCreatureCreate],
    username: str = Depends(get_current_user),
):
    """Import a validated creature batch only after campaign ownership succeeds."""
    await verify_campaign_ownership(campaign_id, username)
    imported = []
    for creature_data in creatures:
        doc = _creature_document(campaign_id, creature_data, username)
        await db.custom_creatures.insert_one(doc)
        imported.append(doc.get('name', ''))
    return {'message': f'Imported {len(imported)} creatures!', 'imported': imported}

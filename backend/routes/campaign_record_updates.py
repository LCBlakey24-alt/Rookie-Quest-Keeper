"""Focused campaign-scoped update responses for live campaign records.

The legacy CRUD routers keep their creates, reads and deletes. These handlers
own only update endpoints whose writes were already campaign-scoped but whose
post-update response reads previously fell back to a bare record ID.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import NPCUpdate, Player, PlayerUpdate, InventoryItemUpdate
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

CAMPAIGN_RECORD_UPDATE_ROUTE_KEYS = {
    ('PUT', '/campaigns/{campaign_id}/npcs/{npc_id}'),
    ('PUT', '/campaigns/{campaign_id}/players/{player_id}'),
    ('PUT', '/campaigns/{campaign_id}/inventory/{item_id}'),
}


def remove_legacy_npc_update_route(legacy_router) -> int:
    return _remove_routes(legacy_router, {('PUT', '/campaigns/{campaign_id}/npcs/{npc_id}')})


def remove_legacy_player_update_route(legacy_router) -> int:
    return _remove_routes(legacy_router, {('PUT', '/campaigns/{campaign_id}/players/{player_id}')})


def remove_legacy_inventory_update_route(legacy_router) -> int:
    return _remove_routes(legacy_router, {('PUT', '/campaigns/{campaign_id}/inventory/{item_id}')})


def _remove_routes(legacy_router, route_keys) -> int:
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in route_keys for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


async def _scoped_update(collection, *, campaign_id: str, record_id: str, update_dict: dict, not_found: str):
    result = await collection.update_one(
        {'id': record_id, 'campaign_id': campaign_id},
        {'$set': update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)

    updated = await collection.find_one(
        {'id': record_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
    return updated


def _serialise_npc_update(npc_data: NPCUpdate) -> dict:
    """Preserve the legacy NPC update conversion for nested models."""
    update_dict = {key: value for key, value in npc_data.model_dump().items() if value is not None}
    if 'stats' in update_dict and hasattr(update_dict['stats'], 'model_dump'):
        update_dict['stats'] = update_dict['stats'].model_dump()
    if 'attacks' in update_dict:
        update_dict['attacks'] = [
            attack.model_dump() if hasattr(attack, 'model_dump') else attack
            for attack in update_dict['attacks']
        ]
    if 'abilities' in update_dict:
        update_dict['abilities'] = [
            ability.model_dump() if hasattr(ability, 'model_dump') else ability
            for ability in update_dict['abilities']
        ]
    if 'spells' in update_dict and update_dict['spells'] and hasattr(update_dict['spells'], 'model_dump'):
        update_dict['spells'] = update_dict['spells'].model_dump()
    return update_dict


@router.put('/campaigns/{campaign_id}/npcs/{npc_id}')
async def update_npc_record(
    campaign_id: str,
    npc_id: str,
    npc_data: NPCUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    return await _scoped_update(
        db.npcs,
        campaign_id=campaign_id,
        record_id=npc_id,
        update_dict=_serialise_npc_update(npc_data),
        not_found='NPC not found',
    )


@router.put('/campaigns/{campaign_id}/players/{player_id}', response_model=Player)
async def update_player_record(
    campaign_id: str,
    player_id: str,
    player_data: PlayerUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in player_data.model_dump().items() if value is not None}
    return await _scoped_update(
        db.players,
        campaign_id=campaign_id,
        record_id=player_id,
        update_dict=update_dict,
        not_found='Player not found',
    )


@router.put('/campaigns/{campaign_id}/inventory/{item_id}')
async def update_inventory_record(
    campaign_id: str,
    item_id: str,
    item_update: InventoryItemUpdate,
    current_user: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, current_user)
    update_dict = {key: value for key, value in item_update.model_dump().items() if value is not None}
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No fields to update')
    return await _scoped_update(
        db.inventory,
        campaign_id=campaign_id,
        record_id=item_id,
        update_dict=update_dict,
        not_found='Item not found',
    )

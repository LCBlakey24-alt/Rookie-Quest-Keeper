"""Focused party-inventory claim/unclaim routes.

These handlers keep player loot claims campaign-scoped and validate the target
character server-side instead of trusting browser-supplied character details.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_membership

router = APIRouter()

CLAIM_ROUTE_KEYS = {
    ('POST', '/campaigns/{campaign_id}/inventory/{item_id}/claim'),
    ('POST', '/campaigns/{campaign_id}/inventory/{item_id}/unclaim'),
}


def remove_legacy_inventory_claim_routes(legacy_router) -> int:
    """Remove only claim/unclaim handlers from the legacy inventory router."""
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in CLAIM_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


async def _claim_character(
    *,
    campaign: Dict[str, Any],
    campaign_id: str,
    character_id: str,
    username: str,
) -> Dict[str, Any]:
    """Resolve a valid claim target without trusting browser-supplied names."""
    query: Dict[str, Any] = {
        'id': character_id,
        'campaign_id': campaign_id,
    }
    if campaign.get('dm_user_id') != username:
        query['user_id'] = username

    character = await db.player_characters.find_one(
        query,
        {'_id': 0, 'id': 1, 'name': 1, 'user_id': 1, 'campaign_id': 1},
    )
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Character not found in this campaign or not available to this user',
        )
    return character


@router.post('/campaigns/{campaign_id}/inventory/{item_id}/claim')
async def claim_inventory_item(
    campaign_id: str,
    item_id: str,
    claim_data: Dict[str, Any],
    current_user: str = Depends(get_current_user),
):
    """Claim party loot to an authorised character in the same campaign."""
    campaign = await verify_campaign_membership(campaign_id, current_user)
    item = await db.inventory.find_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Item not found')
    if item.get('claimed_by') or item.get('claimed_by_id'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Item already claimed')

    character_id = str(claim_data.get('character_id') or '').strip()
    if not character_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='character_id is required')

    character = await _claim_character(
        campaign=campaign,
        campaign_id=campaign_id,
        character_id=character_id,
        username=current_user,
    )
    character_name = str(character.get('name') or 'Unknown Character')
    now = datetime.now(timezone.utc).isoformat()

    result = await db.inventory.update_one(
        {
            'id': item_id,
            'campaign_id': campaign_id,
            '$or': [
                {'claimed_by': {'$exists': False}},
                {'claimed_by': None},
                {'claimed_by': ''},
            ],
        },
        {
            '$set': {
                'claimed_by': character_name,
                'claimed_by_id': character_id,
                'claimed_at': now,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Item claim changed before this request completed. Refresh and try again.',
        )

    return {
        'message': f'Item claimed by {character_name}',
        'character_id': character_id,
        'character_name': character_name,
    }


@router.post('/campaigns/{campaign_id}/inventory/{item_id}/unclaim')
async def unclaim_inventory_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user),
):
    """Return claimed loot; players may only unclaim their own character's item."""
    campaign = await verify_campaign_membership(campaign_id, current_user)
    item = await db.inventory.find_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Item not found')

    claimed_character_id = str(item.get('claimed_by_id') or '').strip()
    is_gm = campaign.get('dm_user_id') == current_user

    update_query: Dict[str, Any] = {
        'id': item_id,
        'campaign_id': campaign_id,
    }
    if not is_gm:
        if not claimed_character_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Only the GM can return this legacy claim because it has no linked character.',
            )
        await _claim_character(
            campaign=campaign,
            campaign_id=campaign_id,
            character_id=claimed_character_id,
            username=current_user,
        )
        # Keep the write bound to the claim we just authorised in case another
        # request changes ownership between the read and update.
        update_query['claimed_by_id'] = claimed_character_id

    result = await db.inventory.update_one(
        update_query,
        {'$unset': {'claimed_by': '', 'claimed_by_id': '', 'claimed_at': ''}},
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Item claim changed before this request completed. Refresh and try again.',
        )

    return {'message': 'Item returned to party inventory'}

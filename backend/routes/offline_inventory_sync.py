"""Idempotent inventory creation for explicitly queued offline combat loot.

This route is intentionally narrow. Normal inventory creation keeps using the
regular inventory router. Offline combat uses a stable client operation id so a
retry after a dropped response can never create duplicate treasure.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import InventoryItem, InventoryItemCreate
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()


def _operation_id(value: Any) -> str:
    operation_id = str(value or '').strip()
    if not operation_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='operation_id is required')
    if len(operation_id) > 180:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='operation_id is too long')
    return operation_id


def _storage_id(campaign_id: str, operation_id: str) -> str:
    return f"rqk-offline-inventory:{campaign_id}:{operation_id}"


@router.post('/campaigns/{campaign_id}/inventory/offline-sync')
async def sync_offline_inventory_item(
    campaign_id: str,
    payload: Dict[str, Any],
    current_user: str = Depends(get_current_user),
):
    """Create one queued inventory item exactly once for a campaign.

    Mongo's built-in `_id` uniqueness is used as the idempotency boundary. The
    same campaign + operation id can be submitted repeatedly and always resolves
    to the first inserted item.
    """
    await verify_campaign_ownership(campaign_id, current_user)
    operation_id = _operation_id(payload.get('operation_id'))
    raw_item = payload.get('item') if isinstance(payload.get('item'), dict) else {}
    if not raw_item:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='item is required')

    try:
        validated = InventoryItemCreate(**raw_item)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Invalid inventory item') from exc

    storage_id = _storage_id(campaign_id, operation_id)
    item = InventoryItem(campaign_id=campaign_id, **validated.model_dump()).model_dump()
    item['offline_operation_id'] = operation_id
    item['_id'] = storage_id

    # `$setOnInsert` plus deterministic Mongo `_id` makes retries safe even if
    # the first response never reached the browser.
    await db.inventory.update_one(
        {'_id': storage_id},
        {'$setOnInsert': item},
        upsert=True,
    )
    stored = await db.inventory.find_one({'_id': storage_id}, {'_id': 0})
    if not stored:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not store offline inventory item')
    return stored

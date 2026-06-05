"""Inventory routes: party inventory, currency, custom items."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, verify_campaign_membership
from models import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    PartyCurrency, PartyCurrencyUpdate,
    CustomItem, CustomItemCreate, CustomItemUpdate
)
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.get("/campaigns/{campaign_id}/inventory")
async def get_inventory(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all items in party inventory"""
    await verify_campaign_membership(campaign_id, current_user)
    items = await db.inventory.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(500)  # Limit to 500 items per campaign
    return items

@router.post("/campaigns/{campaign_id}/inventory")
async def add_inventory_item(
    campaign_id: str,
    item: InventoryItemCreate,
    current_user: str = Depends(get_current_user)
):
    """Add item to party inventory"""
    await verify_campaign_ownership(campaign_id, current_user)
    new_item = InventoryItem(
        campaign_id=campaign_id,
        **item.model_dump()
    )
    await db.inventory.insert_one(new_item.model_dump())
    return new_item.model_dump()

@router.put("/campaigns/{campaign_id}/inventory/{item_id}")
async def update_inventory_item(
    campaign_id: str,
    item_id: str,
    item_update: InventoryItemUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update inventory item"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.inventory.update_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    return updated

@router.delete("/campaigns/{campaign_id}/inventory/{item_id}")
async def delete_inventory_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Remove item from inventory"""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted"}

@router.post("/campaigns/{campaign_id}/inventory/{item_id}/claim")
async def claim_inventory_item(
    campaign_id: str,
    item_id: str,
    claim_data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Claim an item from party inventory for a character"""
    await verify_campaign_membership(campaign_id, current_user)
    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.get('claimed_by'):
        raise HTTPException(status_code=400, detail="Item already claimed")
    
    character_id = claim_data.get('character_id')
    character_name = claim_data.get('character_name', 'Unknown')
    
    await db.inventory.update_one(
        {'id': item_id},
        {'$set': {
            'claimed_by': character_name,
            'claimed_by_id': character_id,
            'claimed_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Item claimed by {character_name}"}

@router.post("/campaigns/{campaign_id}/inventory/{item_id}/unclaim")
async def unclaim_inventory_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Return an item to party inventory (unclaim)"""
    await verify_campaign_membership(campaign_id, current_user)
    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.inventory.update_one(
        {'id': item_id},
        {'$unset': {'claimed_by': '', 'claimed_by_id': '', 'claimed_at': ''}}
    )

    return {"message": "Item returned to party inventory"}


@router.post("/campaigns/{campaign_id}/inventory/{item_id}/grant")
async def grant_inventory_item_to_character(
    campaign_id: str,
    item_id: str,
    grant_data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """GM grants a party inventory item directly into a character's inventory."""
    await verify_campaign_ownership(campaign_id, current_user)

    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    character_id = grant_data.get('character_id')
    if not character_id:
        raise HTTPException(status_code=400, detail="character_id is required")

    character = await db.player_characters.find_one({'id': character_id, 'campaign_id': campaign_id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found in this campaign")

    inventory_entry = {
        'id': str(uuid.uuid4()),
        'name': item.get('name', 'Unknown Item'),
        'quantity': item.get('quantity', 1),
        'item_type': item.get('item_type', 'misc'),
        'description': item.get('description', ''),
        'value': item.get('value', ''),
        'weight': item.get('weight', 0),
        'is_magical': item.get('is_magical', False),
        'attunement_required': item.get('attunement_required', False),
        'notes': item.get('notes', ''),
        'attack_bonus': item.get('attack_bonus', 0),
        'ac_bonus': item.get('ac_bonus', 0),
        'damage_dice': item.get('damage_dice', ''),
        'damage_type': item.get('damage_type', ''),
        'properties': item.get('properties', []),
        'equip_slot': item.get('equip_slot', ''),
        'image_url': item.get('image_url', ''),
        'granted_from_party': True,
        'granted_at': datetime.now(timezone.utc).isoformat(),
    }

    await db.player_characters.update_one(
        {'id': character_id},
        {
            '$push': {'inventory': inventory_entry},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )

    # Remove from party pool so it can't be granted twice
    await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})

    return {
        "success": True,
        "message": f"{item.get('name')} granted to {character.get('name', 'character')}",
        "item": inventory_entry,
    }

@router.get("/campaigns/{campaign_id}/currency")
async def get_party_currency(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get party currency"""
    await verify_campaign_membership(campaign_id, current_user)
    currency = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not currency:
        # Initialize currency if not exists
        new_currency = PartyCurrency(campaign_id=campaign_id)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    return currency

@router.put("/campaigns/{campaign_id}/currency")
async def update_party_currency(
    campaign_id: str,
    currency_update: PartyCurrencyUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update party currency"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in currency_update.model_dump().items() if v is not None}
    
    existing = await db.party_currency.find_one({'campaign_id': campaign_id})
    if not existing:
        new_currency = PartyCurrency(campaign_id=campaign_id, **update_data)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    
    await db.party_currency.update_one(
        {'campaign_id': campaign_id},
        {'$set': update_data}
    )
    updated = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return updated

# ==================== CUSTOM ITEMS ROUTES ====================

@router.get("/campaigns/{campaign_id}/custom-items")
async def get_custom_items(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all custom items for campaign"""
    await verify_campaign_membership(campaign_id, current_user)
    items = await db.custom_items.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(500)  # Limit to 500 custom items
    return items

@router.post("/campaigns/{campaign_id}/custom-items")
async def create_custom_item(
    campaign_id: str,
    item: CustomItemCreate,
    current_user: str = Depends(get_current_user)
):
    """Create custom item"""
    await verify_campaign_ownership(campaign_id, current_user)
    new_item = CustomItem(campaign_id=campaign_id, **item.model_dump())
    await db.custom_items.insert_one(new_item.model_dump())
    return new_item.model_dump()

@router.put("/campaigns/{campaign_id}/custom-items/{item_id}")
async def update_custom_item(
    campaign_id: str,
    item_id: str,
    item_update: CustomItemUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update custom item"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.custom_items.update_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    updated = await db.custom_items.find_one({'id': item_id}, {'_id': 0})
    return updated

@router.delete("/campaigns/{campaign_id}/custom-items/{item_id}")
async def delete_custom_item(
    campaign_id: str,
    item_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete custom item"""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.custom_items.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted"}

# ==================== SMART NOTE PARSING ROUTES ====================

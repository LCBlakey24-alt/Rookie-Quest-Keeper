"""Inventory routes: party inventory, currency, custom items."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, verify_campaign_membership
from models import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    PartyCurrency, PartyCurrencyUpdate,
    CustomItem, CustomItemCreate, CustomItemUpdate
)
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime, timezone

router = APIRouter()


def safe_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default



def ability_modifier(score: Any) -> int:
    return (safe_int(score, 10) - 10) // 2


def character_armor_class_with_equipped(character: Dict[str, Any], equipped: Dict[str, Any]) -> int:
    dex_mod = ability_modifier(character.get('dexterity', 10))
    armor = equipped.get('armor') or equipped.get('armour')
    shield = equipped.get('shield')
    base = 10 + dex_mod

    armor_text = f"{str((armor or {}).get('name', '') if isinstance(armor, dict) else armor)} {str((armor or {}).get('type', '') if isinstance(armor, dict) else '')}".lower()
    if armor:
        if 'plate' in armor_text and 'breast' not in armor_text and 'half' not in armor_text:
            base = 18
        elif 'splint' in armor_text:
            base = 17
        elif 'chain mail' in armor_text:
            base = 16
        elif 'scale' in armor_text or 'breastplate' in armor_text:
            base = 14 + min(dex_mod, 2)
        elif 'half plate' in armor_text:
            base = 15 + min(dex_mod, 2)
        elif 'hide' in armor_text:
            base = 12 + min(dex_mod, 2)
        elif 'leather' in armor_text:
            base = 11 + dex_mod
        ac_bonus = safe_int(armor.get('ac_bonus'), 0) if isinstance(armor, dict) else 0
        if ac_bonus and base == 10 + dex_mod:
            base += ac_bonus
    if shield:
        shield_bonus = safe_int(shield.get('ac_bonus'), 0) if isinstance(shield, dict) else 0
        base += max(shield_bonus, 2)
    return base

def infer_equip_slot(item: Dict[str, Any]) -> str:
    """Infer the character/NPC equip slot for a granted reward."""
    explicit_slot = str(item.get('equip_slot') or item.get('equipped_slot') or '').strip()
    if explicit_slot:
        return explicit_slot

    item_type = str(item.get('item_type') or item.get('type') or '').strip().lower()
    name = str(item.get('name') or '').strip().lower()
    text = f"{item_type} {name}"

    if 'shield' in text:
        return 'shield'
    if item_type in {'armor', 'armour'} or any(word in text for word in ['armour', 'armor', 'mail', 'plate', 'leather', 'scale', 'chain', 'hide']):
        return 'armor'
    if any(word in text for word in ['off hand', 'offhand']):
        return 'offHand'
    if item_type in {'weapon', 'magic_item'} or item.get('damage_dice') or item.get('attack_bonus') or any(word in text for word in ['sword', 'bow', 'crossbow', 'axe', 'mace', 'staff', 'dagger', 'spear', 'lance', 'hammer', 'rapier', 'club', 'flail', 'halberd', 'pike', 'trident', 'whip']):
        return 'mainHand'
    if item.get('ac_bonus'):
        return 'armor'
    return ''


def equipped_aliases(slot: str) -> List[str]:
    """Return equivalent equipped object keys used by older and newer sheets."""
    if slot == 'mainHand':
        return ['mainHand', 'main_hand', 'weapon']
    if slot == 'offHand':
        return ['offHand', 'off_hand']
    if slot == 'armor':
        return ['armor', 'armour']
    if slot:
        return [slot]
    return []


def item_inventory_entry(item: Dict[str, Any], recipient_name: str = '', auto_attune: bool = False, auto_equip: bool = False) -> Dict[str, Any]:
    requires_attunement = bool(item.get('attunement_required', False) or item.get('requires_attunement', False))
    equipped_slot = infer_equip_slot(item) if auto_equip else ''
    return {
        'id': str(uuid.uuid4()),
        'name': item.get('name', 'Unknown Item'),
        'quantity': item.get('quantity', 1),
        'item_type': item.get('item_type', 'misc'),
        'type': item.get('item_type', 'misc'),
        'description': item.get('description', ''),
        'value': item.get('value', ''),
        'weight': item.get('weight', 0),
        'is_magical': item.get('is_magical', False),
        'attunement_required': requires_attunement,
        'requires_attunement': requires_attunement,
        'attuned': bool(auto_attune and requires_attunement),
        'attuned_to': recipient_name if auto_attune and requires_attunement else '',
        'equipped': bool(equipped_slot),
        'is_equipped': bool(equipped_slot),
        'equipped_slot': equipped_slot,
        'ready_to_use': bool(equipped_slot or (auto_attune and requires_attunement)),
        'notes': item.get('notes', ''),
        'attack_bonus': item.get('attack_bonus', 0),
        'ac_bonus': item.get('ac_bonus', 0),
        'damage_dice': item.get('damage_dice', ''),
        'damage_type': item.get('damage_type', ''),
        'properties': item.get('properties', []),
        'equip_slot': equipped_slot or item.get('equip_slot', ''),
        'image_url': item.get('image_url', ''),
        'granted_from_party': True,
        'granted_at': datetime.now(timezone.utc).isoformat(),
        'equipped_at': datetime.now(timezone.utc).isoformat() if equipped_slot else '',
    }


def build_npc_attack_from_item(item: Dict[str, Any], npc: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Build a combat attack row from an equipped weapon-like item."""
    damage_dice = str(item.get('damage_dice') or '').strip()
    damage_type = str(item.get('damage_type') or '').strip()
    item_type = str(item.get('item_type') or item.get('type') or '').strip().lower()
    if not damage_dice and item_type not in {'weapon', 'magic_item'}:
        return None

    attack_bonus = safe_int(item.get('attack_bonus'), safe_int(npc.get('proficiency_bonus'), 2))
    damage = damage_dice or '1d4'
    if damage_type:
        damage = f"{damage} {damage_type}"

    notes = []
    if item.get('notes'):
        notes.append(str(item.get('notes')))
    if item.get('description'):
        notes.append(str(item.get('description')))
    if item.get('is_magical'):
        notes.append('Magical weapon')

    return {
        'name': item.get('name', 'Equipped Weapon'),
        'bonus': f"+{attack_bonus}" if attack_bonus >= 0 else str(attack_bonus),
        'damage': damage,
        'notes': ' · '.join(notes)[:300],
    }


def merge_npc_attack(attacks: List[Dict[str, Any]], new_attack: Optional[Dict[str, str]]) -> List[Dict[str, Any]]:
    if not new_attack:
        return attacks
    filtered = [attack for attack in attacks if str(attack.get('name', '')).lower() != str(new_attack.get('name', '')).lower()]
    return [new_attack, *filtered]


@router.get("/campaigns/{campaign_id}/inventory")
async def get_inventory(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all items in party inventory"""
    await verify_campaign_membership(campaign_id, current_user)
    items = await db.inventory.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(500)
    return items


@router.get("/campaigns/{campaign_id}/inventory/grant-targets")
async def get_inventory_grant_targets(campaign_id: str, current_user: str = Depends(get_current_user)):
    """GM gets linked characters and NPCs that can receive party loot."""
    await verify_campaign_ownership(campaign_id, current_user)
    characters = await db.player_characters.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'id': 1, 'name': 1, 'user_id': 1, 'character_class': 1, 'level': 1}
    ).sort('name', 1).to_list(200)
    npcs = await db.npcs.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'id': 1, 'name': 1, 'role': 1, 'class_name': 1, 'level': 1, 'hp': 1, 'max_hp': 1, 'ac': 1}
    ).sort('name', 1).to_list(300)

    targets = []
    for character in characters:
        targets.append({
            **character,
            'target_type': 'character',
            'target_id': character.get('id'),
            'label': character.get('name', 'Character'),
        })
    for npc in npcs:
        targets.append({
            **npc,
            'target_type': 'npc',
            'target_id': npc.get('id'),
            'label': npc.get('name', 'NPC'),
        })
    return targets


@router.post("/campaigns/{campaign_id}/inventory")
async def add_inventory_item(campaign_id: str, item: InventoryItemCreate, current_user: str = Depends(get_current_user)):
    """Add item to party inventory"""
    await verify_campaign_ownership(campaign_id, current_user)
    new_item = InventoryItem(campaign_id=campaign_id, **item.model_dump())
    await db.inventory.insert_one(new_item.model_dump())
    return new_item.model_dump()


@router.put("/campaigns/{campaign_id}/inventory/{item_id}")
async def update_inventory_item(campaign_id: str, item_id: str, item_update: InventoryItemUpdate, current_user: str = Depends(get_current_user)):
    """Update inventory item"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    result = await db.inventory.update_one({'id': item_id, 'campaign_id': campaign_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    return updated


@router.delete("/campaigns/{campaign_id}/inventory/{item_id}")
async def delete_inventory_item(campaign_id: str, item_id: str, current_user: str = Depends(get_current_user)):
    """Remove item from inventory"""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted"}


@router.post("/campaigns/{campaign_id}/inventory/{item_id}/claim")
async def claim_inventory_item(campaign_id: str, item_id: str, claim_data: Dict[str, Any], current_user: str = Depends(get_current_user)):
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
        {'$set': {'claimed_by': character_name, 'claimed_by_id': character_id, 'claimed_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Item claimed by {character_name}"}


@router.post("/campaigns/{campaign_id}/inventory/{item_id}/unclaim")
async def unclaim_inventory_item(campaign_id: str, item_id: str, current_user: str = Depends(get_current_user)):
    """Return an item to party inventory (unclaim)"""
    await verify_campaign_membership(campaign_id, current_user)
    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.inventory.update_one({'id': item_id}, {'$unset': {'claimed_by': '', 'claimed_by_id': '', 'claimed_at': ''}})
    return {"message": "Item returned to party inventory"}


@router.post("/campaigns/{campaign_id}/inventory/{item_id}/grant")
async def grant_inventory_item_to_target(campaign_id: str, item_id: str, grant_data: Dict[str, Any], current_user: str = Depends(get_current_user)):
    """GM grants a party inventory item into a character sheet or equips an NPC/enemy."""
    await verify_campaign_ownership(campaign_id, current_user)

    item = await db.inventory.find_one({'id': item_id, 'campaign_id': campaign_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    target_type = str(grant_data.get('target_type') or ('character' if grant_data.get('character_id') else '')).strip().lower()
    target_id = grant_data.get('target_id') or grant_data.get('character_id') or grant_data.get('npc_id')
    if target_type not in {'character', 'npc'}:
        raise HTTPException(status_code=400, detail="target_type must be character or npc")
    if not target_id:
        raise HTTPException(status_code=400, detail="target_id is required")

    auto_equip = bool(grant_data.get('auto_equip', False))
    auto_attune_requested = bool(grant_data.get('auto_attune', False))

    if target_type == 'character':
        character = await db.player_characters.find_one({'id': target_id, 'campaign_id': campaign_id})
        if not character:
            raise HTTPException(status_code=404, detail="Character not found in this campaign")

        inventory_entry = item_inventory_entry(item, character.get('name', ''), auto_attune_requested, auto_equip)
        equipped_slot = inventory_entry.get('equipped_slot', '')
        set_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
        if equipped_slot:
            current_equipped = character.get('equipped') or {}
            next_equipped = {**current_equipped, equipped_slot: inventory_entry}
            if equipped_slot == 'mainHand':
                next_equipped.pop('main_hand', None)
                next_equipped.pop('weapon', None)
            if equipped_slot == 'offHand':
                next_equipped.pop('off_hand', None)
            if equipped_slot == 'armor':
                next_equipped.pop('armour', None)
            if equipped_slot == 'shield':
                next_equipped.pop('off_hand', None)
            set_data['equipped'] = next_equipped
            if equipped_slot in {'armor', 'shield'}:
                set_data['armor_class'] = character_armor_class_with_equipped(character, next_equipped)

        await db.player_characters.update_one(
            {'id': target_id},
            {'$push': {'inventory': inventory_entry}, '$set': set_data}
        )
        await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})
        return {
            "success": True,
            "message": f"{item.get('name')} granted to {character.get('name', 'character')}",
            "target_type": "character",
            "target_name": character.get('name', 'character'),
            "item": inventory_entry,
            "auto_attuned": bool(inventory_entry.get('attuned')),
            "auto_equipped": bool(equipped_slot),
            "equipped_slot": equipped_slot,
        }

    npc = await db.npcs.find_one({'id': target_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found in this campaign")

    inventory_entry = item_inventory_entry(item, npc.get('name', ''), auto_attune_requested, auto_equip)
    equipped_slot = inventory_entry.get('equipped_slot', '')
    current_equipped = npc.get('equipped') or {}
    current_equipment = npc.get('equipment') or []
    current_inventory = npc.get('inventory') or []
    current_attacks = npc.get('attacks') or []
    gear_notes = npc.get('gear_notes') or []

    set_data: Dict[str, Any] = {
        'inventory': [inventory_entry, *current_inventory],
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    ac_bonus = safe_int(item.get('ac_bonus'), 0)
    if auto_equip:
        current_equipped[equipped_slot or item.get('name', 'item')] = inventory_entry
        set_data['equipped'] = current_equipped
        set_data['equipment'] = [inventory_entry, *current_equipment]
        set_data['gear_notes'] = [{
            'item_id': inventory_entry.get('id'),
            'item_name': inventory_entry.get('name'),
            'summary': f"Equipped from party inventory. AC bonus {ac_bonus}. Attack bonus {safe_int(item.get('attack_bonus'), 0)}. Damage {item.get('damage_dice', '')} {item.get('damage_type', '')}".strip(),
            'created_at': datetime.now(timezone.utc).isoformat(),
        }, *gear_notes]
        if ac_bonus:
            set_data['ac'] = safe_int(npc.get('ac'), 10) + ac_bonus
        new_attack = build_npc_attack_from_item(item, npc)
        if new_attack:
            set_data['attacks'] = merge_npc_attack(current_attacks, new_attack)

    await db.npcs.update_one({'id': target_id, 'campaign_id': campaign_id}, {'$set': set_data})
    updated_npc = await db.npcs.find_one({'id': target_id, 'campaign_id': campaign_id}, {'_id': 0})
    await db.inventory.delete_one({'id': item_id, 'campaign_id': campaign_id})

    return {
        "success": True,
        "message": f"{item.get('name')} granted to {npc.get('name', 'NPC')}",
        "target_type": "npc",
        "target_name": npc.get('name', 'NPC'),
        "item": inventory_entry,
        "auto_attuned": bool(inventory_entry.get('attuned')),
        "auto_equipped": bool(equipped_slot),
        "equipped_slot": equipped_slot,
        "npc": updated_npc,
        "npc_stat_changes": {
            "ac_bonus_applied": ac_bonus if auto_equip else 0,
            "attack_added": bool(auto_equip and build_npc_attack_from_item(item, npc)),
        },
    }


@router.get("/campaigns/{campaign_id}/currency")
async def get_party_currency(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get party currency"""
    await verify_campaign_membership(campaign_id, current_user)
    currency = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not currency:
        new_currency = PartyCurrency(campaign_id=campaign_id)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    return currency


@router.put("/campaigns/{campaign_id}/currency")
async def update_party_currency(campaign_id: str, currency_update: PartyCurrencyUpdate, current_user: str = Depends(get_current_user)):
    """Update party currency"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in currency_update.model_dump().items() if v is not None}
    existing = await db.party_currency.find_one({'campaign_id': campaign_id})
    if not existing:
        new_currency = PartyCurrency(campaign_id=campaign_id, **update_data)
        await db.party_currency.insert_one(new_currency.model_dump())
        return new_currency.model_dump()
    await db.party_currency.update_one({'campaign_id': campaign_id}, {'$set': update_data})
    updated = await db.party_currency.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return updated


# ==================== CUSTOM ITEMS ROUTES ====================

@router.get("/campaigns/{campaign_id}/custom-items")
async def get_custom_items(campaign_id: str, current_user: str = Depends(get_current_user)):
    """Get all custom items for campaign"""
    await verify_campaign_membership(campaign_id, current_user)
    items = await db.custom_items.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return items


@router.post("/campaigns/{campaign_id}/custom-items")
async def create_custom_item(campaign_id: str, item: CustomItemCreate, current_user: str = Depends(get_current_user)):
    """Create custom item template"""
    await verify_campaign_ownership(campaign_id, current_user)
    custom_item = CustomItem(campaign_id=campaign_id, **item.model_dump())
    await db.custom_items.insert_one(custom_item.model_dump())
    return custom_item.model_dump()


@router.put("/campaigns/{campaign_id}/custom-items/{item_id}")
async def update_custom_item(campaign_id: str, item_id: str, item_update: CustomItemUpdate, current_user: str = Depends(get_current_user)):
    """Update custom item"""
    await verify_campaign_ownership(campaign_id, current_user)
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.custom_items.update_one({'id': item_id, 'campaign_id': campaign_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Custom item not found")
    updated = await db.custom_items.find_one({'id': item_id}, {'_id': 0})
    return updated


@router.delete("/campaigns/{campaign_id}/custom-items/{item_id}")
async def delete_custom_item(campaign_id: str, item_id: str, current_user: str = Depends(get_current_user)):
    """Delete custom item"""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.custom_items.delete_one({'id': item_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom item not found")
    return {"message": "Custom item deleted"}

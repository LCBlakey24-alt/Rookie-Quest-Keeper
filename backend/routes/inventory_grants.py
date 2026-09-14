"""Race-safe GM inventory grant route.

The legacy inventory router keeps ordinary CRUD/currency/custom-item behavior.
This focused route owns only the party-item Grant action so one item cannot be
handed to multiple recipients by concurrent requests and recipient writes stay
inside the active campaign.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership
from utils.inventory_grant_helpers import (
    build_npc_attack_from_item,
    character_armor_class_with_equipped,
    item_inventory_entry,
    merge_npc_attack,
    safe_int,
)

router = APIRouter()

GRANT_ROUTE_KEY = ('POST', '/campaigns/{campaign_id}/inventory/{item_id}/grant')
RESERVATION_TTL_SECONDS = 120


def remove_legacy_inventory_grant_route(legacy_router) -> int:
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) == GRANT_ROUTE_KEY for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _reserve_inventory_item(campaign_id: str, item_id: str, username: str) -> tuple[Dict[str, Any], str]:
    now = _now()
    cutoff = (now - timedelta(seconds=RESERVATION_TTL_SECONDS)).isoformat()
    token = str(uuid.uuid4())
    reservation = {
        'token': token,
        'started_at': now.isoformat(),
        'by': username,
    }
    query = {
        'id': item_id,
        'campaign_id': campaign_id,
        '$or': [
            {'grant_in_progress': {'$exists': False}},
            {'grant_in_progress': None},
            {'grant_in_progress.started_at': {'$lt': cutoff}},
        ],
    }
    result = await db.inventory.update_one(query, {'$set': {'grant_in_progress': reservation}})
    if result.matched_count == 0:
        existing = await db.inventory.find_one(
            {'id': item_id, 'campaign_id': campaign_id},
            {'_id': 0, 'id': 1, 'grant_in_progress': 1},
        )
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Item not found')
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='This item is already being granted. Refresh the party inventory before trying again.',
        )

    item = await db.inventory.find_one(
        {'id': item_id, 'campaign_id': campaign_id, 'grant_in_progress.token': token},
        {'_id': 0},
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Could not confirm the inventory grant reservation. Refresh and try again.',
        )
    return item, token


async def _release_reservation(campaign_id: str, item_id: str, token: str) -> None:
    try:
        await db.inventory.update_one(
            {'id': item_id, 'campaign_id': campaign_id, 'grant_in_progress.token': token},
            {'$unset': {'grant_in_progress': ''}},
        )
    except Exception:
        # A stale reservation can be reclaimed after RESERVATION_TTL_SECONDS.
        pass


async def _consume_reserved_item(campaign_id: str, item_id: str, token: str) -> None:
    result = await db.inventory.delete_one({
        'id': item_id,
        'campaign_id': campaign_id,
        'grant_in_progress.token': token,
    })
    if result.deleted_count > 0:
        return

    existing = await db.inventory.find_one(
        {'id': item_id, 'campaign_id': campaign_id},
        {'_id': 0, 'id': 1, 'grant_in_progress': 1},
    )
    if not existing:
        # Another legitimate action already removed the source item. The
        # recipient write is complete, so there is nothing left to clean up.
        return

    # Never fall back to deleting by bare item/campaign after the reservation
    # token has changed. A stale slow request must not erase a newer Grant.
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail='The item reservation changed before Grant cleanup finished. Refresh party inventory before granting it again.',
    )


@router.post('/campaigns/{campaign_id}/inventory/{item_id}/grant')
async def grant_inventory_item_to_target(
    campaign_id: str,
    item_id: str,
    grant_data: Dict[str, Any],
    current_user: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, current_user)

    target_type = str(
        grant_data.get('target_type') or ('character' if grant_data.get('character_id') else '')
    ).strip().lower()
    target_id = grant_data.get('target_id') or grant_data.get('character_id') or grant_data.get('npc_id')
    if target_type not in {'character', 'npc'}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='target_type must be character or npc')
    if not target_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='target_id is required')

    auto_equip = bool(grant_data.get('auto_equip', False))
    auto_attune_requested = bool(grant_data.get('auto_attune', False))

    if target_type == 'character':
        character = await db.player_characters.find_one(
            {'id': target_id, 'campaign_id': campaign_id},
            {'_id': 0},
        )
        if not character:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Character not found in this campaign')

        item, token = await _reserve_inventory_item(campaign_id, item_id, current_user)
        inventory_entry = item_inventory_entry(
            item,
            character.get('name', ''),
            auto_attune_requested,
            auto_equip,
        )
        equipped_slot = inventory_entry.get('equipped_slot', '')
        set_data: Dict[str, Any] = {'updated_at': _now().isoformat()}
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

        try:
            result = await db.player_characters.update_one(
                {'id': target_id, 'campaign_id': campaign_id},
                {'$push': {'inventory': inventory_entry}, '$set': set_data},
            )
        except Exception:
            await _release_reservation(campaign_id, item_id, token)
            raise

        if result.matched_count == 0:
            await _release_reservation(campaign_id, item_id, token)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='The character changed or disappeared before the grant completed. The item remains in party inventory.',
            )

        await _consume_reserved_item(campaign_id, item_id, token)
        return {
            'success': True,
            'message': f"{item.get('name')} granted to {character.get('name', 'character')}",
            'target_type': 'character',
            'target_name': character.get('name', 'character'),
            'item': inventory_entry,
            'auto_attuned': bool(inventory_entry.get('attuned')),
            'auto_equipped': bool(equipped_slot),
            'equipped_slot': equipped_slot,
        }

    npc = await db.npcs.find_one(
        {'id': target_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not npc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='NPC not found in this campaign')

    item, token = await _reserve_inventory_item(campaign_id, item_id, current_user)
    inventory_entry = item_inventory_entry(item, npc.get('name', ''), auto_attune_requested, auto_equip)
    equipped_slot = inventory_entry.get('equipped_slot', '')
    current_equipped = {**(npc.get('equipped') or {})}
    current_equipment = list(npc.get('equipment') or [])
    current_inventory = list(npc.get('inventory') or [])
    current_attacks = list(npc.get('attacks') or [])
    gear_notes = list(npc.get('gear_notes') or [])

    set_data: Dict[str, Any] = {
        'inventory': [inventory_entry, *current_inventory],
        'updated_at': _now().isoformat(),
    }
    ac_bonus = safe_int(item.get('ac_bonus'), 0)
    attack_added = False
    if auto_equip:
        current_equipped[equipped_slot or item.get('name', 'item')] = inventory_entry
        set_data['equipped'] = current_equipped
        set_data['equipment'] = [inventory_entry, *current_equipment]
        set_data['gear_notes'] = [{
            'item_id': inventory_entry.get('id'),
            'item_name': inventory_entry.get('name'),
            'summary': f"Equipped from party inventory. AC bonus {ac_bonus}. Attack bonus {safe_int(item.get('attack_bonus'), 0)}. Damage {item.get('damage_dice', '')} {item.get('damage_type', '')}".strip(),
            'created_at': _now().isoformat(),
        }, *gear_notes]
        if ac_bonus:
            set_data['ac'] = safe_int(npc.get('ac'), 10) + ac_bonus
        new_attack = build_npc_attack_from_item(item, npc)
        if new_attack:
            set_data['attacks'] = merge_npc_attack(current_attacks, new_attack)
            attack_added = True

    try:
        result = await db.npcs.update_one(
            {'id': target_id, 'campaign_id': campaign_id},
            {'$set': set_data},
        )
    except Exception:
        await _release_reservation(campaign_id, item_id, token)
        raise

    if result.matched_count == 0:
        await _release_reservation(campaign_id, item_id, token)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='The NPC changed or disappeared before the grant completed. The item remains in party inventory.',
        )

    updated_npc = await db.npcs.find_one(
        {'id': target_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    await _consume_reserved_item(campaign_id, item_id, token)

    return {
        'success': True,
        'message': f"{item.get('name')} granted to {npc.get('name', 'NPC')}",
        'target_type': 'npc',
        'target_name': npc.get('name', 'NPC'),
        'item': inventory_entry,
        'auto_attuned': bool(inventory_entry.get('attuned')),
        'auto_equipped': bool(equipped_slot),
        'equipped_slot': equipped_slot,
        'npc': updated_npc,
        'npc_stat_changes': {
            'ac_bonus_applied': ac_bonus if auto_equip else 0,
            'attack_added': attack_added,
        },
    }

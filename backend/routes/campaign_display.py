"""Campaign player-display state routes for GM-controlled second screens."""
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership
from utils.ws_manager import ws_manager

router = APIRouter()

ALLOWED_DISPLAY_MODES = {
    'blank',
    'title',
    'image',
    'npc-grid',
    'combat',
    'group-check',
    'end-session-stats',
}


def default_display_state(campaign_id: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    sequence = int(now.timestamp() * 1000)
    return {
        'campaign_id': campaign_id,
        'sync_id': f'{campaign_id}-{sequence}',
        'sequence': sequence,
        'mode': 'blank',
        'payload': {},
        'updated_at': now.isoformat(),
        'updated_by': '',
        'delivery_ack': {},
    }


def sanitize_display_state(campaign_id: str, data: Dict[str, Any], username: str) -> Dict[str, Any]:
    mode = str(data.get('mode') or 'blank').strip() or 'blank'
    if mode not in ALLOWED_DISPLAY_MODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported player display mode')

    payload = data.get('payload') if isinstance(data.get('payload'), dict) else {}
    now = datetime.now(timezone.utc)
    server_sequence = int(now.timestamp() * 1000)
    sync_id = str(data.get('sync_id') or data.get('id') or f'{campaign_id}-{server_sequence}').strip()
    source_tab = str(data.get('source_tab') or '').strip()
    try:
        sequence = int(data.get('sequence') or data.get('seq') or server_sequence)
    except (TypeError, ValueError):
        sequence = server_sequence
    if sequence <= 0:
        sequence = server_sequence

    state = {
        'campaign_id': campaign_id,
        'sync_id': sync_id,
        'sequence': sequence,
        'mode': mode,
        'payload': payload,
        'updated_at': now.isoformat(),
        'updated_by': username,
        'delivery_ack': {},
    }
    if source_tab:
        state['source_tab'] = source_tab
    return state


@router.get('/campaigns/{campaign_id}/display-state')
async def get_campaign_display_state(campaign_id: str, username: str = Depends(get_current_user)):
    """Return the latest player-display state for campaign members."""
    await verify_campaign_membership(campaign_id, username)
    state = await db.campaign_display_states.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return state or default_display_state(campaign_id)


@router.put('/campaigns/{campaign_id}/display-state')
async def update_campaign_display_state(campaign_id: str, display_state: Dict[str, Any], username: str = Depends(get_current_user)):
    """Persist and broadcast a GM-authored player-display state update."""
    await verify_campaign_ownership(campaign_id, username)
    state = sanitize_display_state(campaign_id, display_state, username)
    await db.campaign_display_states.update_one(
        {'campaign_id': campaign_id},
        {'$set': state},
        upsert=True,
    )
    await ws_manager.broadcast_to_campaign(campaign_id, {
        'type': 'player_display_update',
        'user_id': username,
        'data': state,
        'timestamp': state['updated_at'],
    })
    return state


@router.post('/campaigns/{campaign_id}/display-state/ack')
async def acknowledge_campaign_display_state(campaign_id: str, acknowledgement: Dict[str, Any], username: str = Depends(get_current_user)):
    """Record that a player display has rendered a specific synced state."""
    await verify_campaign_membership(campaign_id, username)

    sync_id = str(acknowledgement.get('sync_id') or '').strip()
    if not sync_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Display acknowledgement requires sync_id')

    current = await db.campaign_display_states.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not current:
        return {'acknowledged': False, 'reason': 'no_display_state', 'sync_id': sync_id}

    current_sync_id = str(current.get('sync_id') or '').strip()
    if current_sync_id and current_sync_id != sync_id:
        return {
            'acknowledged': False,
            'stale': True,
            'sync_id': sync_id,
            'current_sync_id': current_sync_id,
        }

    acknowledged_at = datetime.now(timezone.utc).isoformat()
    delivery_ack = {
        'sync_id': sync_id,
        'acknowledged_at': acknowledged_at,
        'username': username,
        'display_target': str(acknowledgement.get('display_target') or '').strip(),
        'mode': str(acknowledgement.get('mode') or current.get('mode') or 'blank').strip() or 'blank',
    }
    await db.campaign_display_states.update_one(
        {'campaign_id': campaign_id},
        {'$set': {'delivery_ack': delivery_ack}},
    )
    return {'acknowledged': True, **delivery_ack}

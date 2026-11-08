"""Campaign player-display state routes for GM-controlled second screens."""
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership
from utils.ws_manager import ws_manager
from utils.player_display_payload import DISPLAY_MODES, public_display_state, sanitize_player_display_payload

router = APIRouter()

ALLOWED_DISPLAY_MODES = DISPLAY_MODES


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

    payload = sanitize_player_display_payload(mode, data.get('payload'))
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
    if not state:
        return default_display_state(campaign_id)
    return public_display_state(state)


@router.put('/campaigns/{campaign_id}/display-state')
async def update_campaign_display_state(campaign_id: str, display_state: Dict[str, Any], username: str = Depends(get_current_user)):
    """Persist and broadcast a GM-authored player-display state update."""
    await verify_campaign_ownership(campaign_id, username)
    state = sanitize_display_state(campaign_id, display_state, username)
    # Do the revision comparison *inside* MongoDB's atomic document update.
    # A GET followed by an unconditional $set is not enough: an older
    # in-flight request can otherwise arrive after the new battle state and
    # replace it (or an older reveal can erase an initiative prompt).
    #
    # The upsert branch keeps the existing campaign_id key and _id; $literal
    # prevents user-authored public strings beginning with "$" from being
    # interpreted as aggregation expressions.
    is_newer = {'$lt': [{'$ifNull': ['$sequence', 0]}, state['sequence']]}
    await db.campaign_display_states.update_one(
        {'campaign_id': campaign_id},
        [{'$replaceRoot': {'newRoot': {'$cond': [
            is_newer,
            {'$mergeObjects': ['$ROOT', {'$literal': state}]},
            '$ROOT',
        ]}}}],
        upsert=True,
    )
    current = await db.campaign_display_states.find_one(
        {'campaign_id': campaign_id}, {'_id': 0, 'sync_id': 1, 'sequence': 1},
    )
    if not current or current.get('sync_id') != state['sync_id']:
        # Return a conflict, never a false acknowledgement. The caller may
        # refresh the newer display state, but must not broadcast this stale
        # payload to connected players.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='A newer player-display update has already been saved',
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
    result = await db.campaign_display_states.update_one(
        {'campaign_id': campaign_id, 'sync_id': sync_id},
        {'$set': {'delivery_ack': delivery_ack}},
    )
    if result.matched_count == 0:
        return {'acknowledged': False, 'stale': True, 'sync_id': sync_id}
    return {'acknowledged': True, **delivery_ack}

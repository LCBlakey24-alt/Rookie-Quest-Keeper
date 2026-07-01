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
    'end-session-stats',
}


def default_display_state(campaign_id: str) -> Dict[str, Any]:
    return {
        'campaign_id': campaign_id,
        'mode': 'blank',
        'payload': {},
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': '',
    }


def sanitize_display_state(campaign_id: str, data: Dict[str, Any], username: str) -> Dict[str, Any]:
    mode = str(data.get('mode') or 'blank').strip() or 'blank'
    if mode not in ALLOWED_DISPLAY_MODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported player display mode')

    payload = data.get('payload') if isinstance(data.get('payload'), dict) else {}
    return {
        'campaign_id': campaign_id,
        'mode': mode,
        'payload': payload,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': username,
    }


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

"""Player-submitted initiative for the active campaign combat display.

Combat remains GM-owned. Players can only submit initiative for their own linked
character while the GM's player display is in combat mode. The GM can read the
submissions and fold them into the local combat tracker/order.
"""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership

router = APIRouter()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def combat_id_from_display(state: Dict[str, Any] | None) -> str:
    if not isinstance(state, dict) or state.get('mode') != 'combat':
        return ''
    payload = state.get('payload') if isinstance(state.get('payload'), dict) else {}
    return str(payload.get('combat_id') or payload.get('scenario_id') or payload.get('title') or '').strip()


async def active_combat_id(campaign_id: str) -> str:
    state = await db.campaign_display_states.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return combat_id_from_display(state)


@router.get('/campaigns/{campaign_id}/combat-initiative/submissions')
async def list_combat_initiative_submissions(campaign_id: str, username: str = Depends(get_current_user)):
    """GM-only list of initiative values players submitted for the active fight."""
    await verify_campaign_ownership(campaign_id, username)
    combat_id = await active_combat_id(campaign_id)
    if not combat_id:
        return {'combat_id': '', 'submissions': []}
    rows = await db.combat_initiative_submissions.find(
        {'campaign_id': campaign_id, 'combat_id': combat_id},
        {'_id': 0},
    ).to_list(100)
    return {'combat_id': combat_id, 'submissions': rows}


@router.get('/campaigns/{campaign_id}/combat-initiative/mine')
async def get_my_combat_initiative(campaign_id: str, username: str = Depends(get_current_user)):
    """Return the current player's initiative submission for the active fight."""
    await verify_campaign_membership(campaign_id, username)
    combat_id = await active_combat_id(campaign_id)
    if not combat_id:
        return {'combat_active': False, 'combat_id': '', 'submission': None}

    character = await db.player_characters.find_one(
        {'campaign_id': campaign_id, 'user_id': username},
        {'_id': 0, 'id': 1, 'name': 1, 'initiative_bonus': 1},
    )
    if not character:
        return {'combat_active': True, 'combat_id': combat_id, 'submission': None, 'character': None}

    row = await db.combat_initiative_submissions.find_one({
        'campaign_id': campaign_id,
        'combat_id': combat_id,
        'character_id': character.get('id'),
    }, {'_id': 0})
    return {
        'combat_active': True,
        'combat_id': combat_id,
        'submission': row,
        'character': {
            'id': character.get('id'),
            'name': character.get('name') or 'Character',
            'initiative_bonus': int(character.get('initiative_bonus') or 0),
        },
    }


@router.post('/campaigns/{campaign_id}/combat-initiative/submit')
async def submit_combat_initiative(campaign_id: str, payload: Dict[str, Any], username: str = Depends(get_current_user)):
    """Submit or replace initiative for the player's own linked character."""
    await verify_campaign_membership(campaign_id, username)
    combat_id = await active_combat_id(campaign_id)
    if not combat_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='There is no active combat asking for initiative')

    character = await db.player_characters.find_one(
        {'campaign_id': campaign_id, 'user_id': username},
        {'_id': 0, 'id': 1, 'name': 1, 'initiative_bonus': 1},
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No linked character found for this campaign')

    try:
        value = int(payload.get('initiative'))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Initiative must be a whole number')
    if value < -20 or value > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Initiative must be between -20 and 100')

    method = str(payload.get('method') or 'manual').strip().lower()
    if method not in {'manual', 'rolled'}:
        method = 'manual'

    doc = {
        'campaign_id': campaign_id,
        'combat_id': combat_id,
        'character_id': character.get('id'),
        'character_name': character.get('name') or 'Character',
        'user_id': username,
        'initiative': value,
        'initiative_bonus': int(character.get('initiative_bonus') or 0),
        'method': method,
        'updated_at': now_iso(),
    }
    await db.combat_initiative_submissions.update_one(
        {'campaign_id': campaign_id, 'combat_id': combat_id, 'character_id': character.get('id')},
        {'$set': doc},
        upsert=True,
    )
    return doc


@router.delete('/campaigns/{campaign_id}/combat-initiative/submissions')
async def clear_combat_initiative_submissions(campaign_id: str, username: str = Depends(get_current_user)):
    """GM-only cleanup for the active/most recent combat's initiative submissions."""
    await verify_campaign_ownership(campaign_id, username)
    combat_id = await active_combat_id(campaign_id)
    query: Dict[str, Any] = {'campaign_id': campaign_id}
    if combat_id:
        query['combat_id'] = combat_id
    result = await db.combat_initiative_submissions.delete_many(query)
    return {'deleted': result.deleted_count, 'combat_id': combat_id}

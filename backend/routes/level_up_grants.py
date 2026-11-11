"""GM-granted level ups.

A GM grants one level to a character in their campaign. The grant is stored
on the character; the player's app picks it up, plays the "Levelled up"
moment once, and the player then levels up through the usual wizard. The
grant is spent when the character reaches the level it unlocks.

- Only the campaign's GM can grant, and only to a character that is an
  active member of that campaign.
- One level at a time and never past level 20; granting again while one is
  waiting returns the waiting grant instead of stacking.
- A player sees and marks as seen only grants on their own characters.
- Players cannot create grants themselves: `level_up_grant` is not in the
  character PATCH allowlist, and the full update model does not carry it.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

MAX_LEVEL = 20


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _level(character: Dict[str, Any]) -> int:
    try:
        return max(1, int(character.get('level') or 1))
    except (TypeError, ValueError):
        return 1


def pending_grant(character: Dict[str, Any]) -> Dict[str, Any] | None:
    """The character's grant if it still unlocks a level they have not reached."""
    grant = character.get('level_up_grant')
    if not isinstance(grant, dict):
        return None
    try:
        to_level = int(grant.get('to_level') or 0)
    except (TypeError, ValueError):
        return None
    return grant if to_level > _level(character) else None


@router.post('/campaigns/{campaign_id}/characters/{character_id}/level-up-grant')
async def grant_level_up(campaign_id: str, character_id: str, username: str = Depends(get_current_user)):
    """GM only: let a campaign character level up by one."""
    await verify_campaign_ownership(campaign_id, username)

    member = await db.campaign_members.find_one(
        {'campaign_id': campaign_id, 'character_id': character_id},
        {'_id': 0, 'status': 1},
    )
    if not member or str(member.get('status') or 'active').lower() != 'active':
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='This character is not an active member of the campaign')

    character = await db.player_characters.find_one(
        {'id': character_id, 'campaign_id': campaign_id},
        {'_id': 0, 'id': 1, 'name': 1, 'level': 1, 'level_up_grant': 1},
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Character not found in this campaign')

    level = _level(character)
    name = character.get('name') or 'This character'
    if level >= MAX_LEVEL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'{name} is already level {MAX_LEVEL}')

    waiting = pending_grant(character)
    if waiting:
        return {
            'message': f"{name} already has a level up waiting (level {waiting.get('to_level')})",
            'grant': waiting,
            'already_pending': True,
        }

    grant = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'granted_by': username,
        'granted_at': _now(),
        'from_level': level,
        'to_level': level + 1,
        'seen_at': None,
    }
    # Only if nothing changed underneath us: same level, no newer grant.
    previous = character.get('level_up_grant')
    unchanged = {'id': character_id, 'campaign_id': campaign_id, 'level': character.get('level')}
    if isinstance(previous, dict) and previous.get('id'):
        unchanged['level_up_grant.id'] = previous.get('id')
    else:
        unchanged['level_up_grant'] = None
    result = await db.player_characters.update_one(
        unchanged,
        {'$set': {'level_up_grant': grant, 'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='The character changed while granting. Refresh and try again.')
    return {'message': f'{name} can now level up to {level + 1}', 'grant': grant, 'already_pending': False}


@router.get('/characters/level-up-grants/mine')
async def my_level_up_grants(username: str = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """The signed-in player's characters with a level up waiting."""
    characters = await db.player_characters.find(
        {'user_id': username, 'level_up_grant': {'$ne': None}},
        {'_id': 0, 'id': 1, 'name': 1, 'level': 1, 'campaign_name': 1, 'level_up_grant': 1},
    ).to_list(100)
    out = []
    for character in characters:
        grant = pending_grant(character)
        if not grant:
            continue
        out.append({
            'character_id': character.get('id'),
            'character_name': character.get('name') or 'Your character',
            'campaign_name': character.get('campaign_name') or '',
            'from_level': _level(character),
            'to_level': int(grant.get('to_level')),
            'grant_id': grant.get('id'),
            'seen': bool(grant.get('seen_at')),
        })
    return out


@router.post('/characters/{character_id}/level-up-grant/seen')
async def mark_level_up_grant_seen(character_id: str, payload: Dict[str, Any], username: str = Depends(get_current_user)):
    """The owner has seen the "Levelled up" moment; do not play it again."""
    grant_id = str((payload or {}).get('grant_id') or '')
    if not grant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='grant_id is required')
    result = await db.player_characters.update_one(
        {'id': character_id, 'user_id': username, 'level_up_grant.id': grant_id},
        {'$set': {'level_up_grant.seen_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Level up not found')
    return {'ok': True}

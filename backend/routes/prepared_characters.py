"""Characters a GM prepares for players to claim when they join.

The GM builds a character as usual (it is theirs), then offers it to a
campaign. A player who joins with that campaign's code can claim it: the
character moves to the player's account and is linked to the campaign
through the normal join route (campaign_invites.join_campaign_by_code).

An offered character is marked with `prepared_for_campaign_id` only; it is
not given a `campaign_id`, so it never shows in a party roster until a
player has claimed it.
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership
from utils.prepared_characters import _now, list_prepared_characters, prepared_summary

router = APIRouter()


@router.get('/campaigns/{campaign_id}/prepared-characters')
async def get_prepared_characters(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    return {'characters': await list_prepared_characters(campaign_id, username, database=db)}


@router.post('/campaigns/{campaign_id}/prepared-characters')
async def offer_prepared_character(campaign_id: str, payload: Dict[str, Any], username: str = Depends(get_current_user)):
    """Offer one of the GM's own characters for a player in this campaign to claim."""
    await verify_campaign_ownership(campaign_id, username)
    character_id = str(payload.get('character_id') or '').strip()
    if not character_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Choose a character to offer')
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Character not found')
    if character.get('campaign_id'):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='This character is already playing in a campaign. Use a character that is not in a campaign.',
        )
    await db.player_characters.update_one(
        {'id': character_id, 'user_id': username},
        {'$set': {'prepared_for_campaign_id': campaign_id, 'prepared_at': _now(), 'updated_at': _now()}},
    )
    return {'offered': prepared_summary(character), 'characters': await list_prepared_characters(campaign_id, username, database=db)}


@router.delete('/campaigns/{campaign_id}/prepared-characters/{character_id}')
async def withdraw_prepared_character(campaign_id: str, character_id: str, username: str = Depends(get_current_user)):
    """Stop offering a character; it stays on the GM's account."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.player_characters.update_one(
        {'id': character_id, 'user_id': username, 'prepared_for_campaign_id': campaign_id},
        {'$set': {'prepared_for_campaign_id': None, 'claim_pending_by': None, 'claim_pending_at': None, 'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='That character is not on offer in this campaign')
    # A player waiting for approval with this character no longer holds it.
    await db.campaign_members.update_many(
        {'campaign_id': campaign_id, 'character_id': character_id},
        {'$set': {'character_id': None, 'released_character_id': character_id, 'updated_at': _now()}},
    )
    return {'characters': await list_prepared_characters(campaign_id, username, database=db)}

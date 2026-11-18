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

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

SUMMARY_FIELDS = ('id', 'name', 'character_name', 'race', 'species', 'character_class', 'class_name', 'level', 'portrait_url', 'avatar_url')


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def prepared_summary(character: Dict[str, Any]) -> Dict[str, Any]:
    """What a joining player may see of a waiting character: no sheet details."""
    return {
        'id': character.get('id'),
        'name': character.get('name') or character.get('character_name') or 'Unnamed character',
        'race': character.get('race') or character.get('species') or '',
        'character_class': character.get('character_class') or character.get('class_name') or '',
        'level': character.get('level') or 1,
        'portrait_url': character.get('portrait_url') or character.get('avatar_url') or '',
    }


async def list_prepared_characters(campaign_id: str, gm_username: str) -> list:
    projection = {'_id': 0, **{field: 1 for field in SUMMARY_FIELDS}}
    characters = await db.player_characters.find(
        {'prepared_for_campaign_id': campaign_id, 'user_id': gm_username}, projection,
    ).to_list(100)
    return [prepared_summary(item) for item in characters]


@router.get('/campaigns/{campaign_id}/prepared-characters')
async def get_prepared_characters(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    return {'characters': await list_prepared_characters(campaign_id, username)}


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
    return {'offered': prepared_summary(character), 'characters': await list_prepared_characters(campaign_id, username)}


@router.delete('/campaigns/{campaign_id}/prepared-characters/{character_id}')
async def withdraw_prepared_character(campaign_id: str, character_id: str, username: str = Depends(get_current_user)):
    """Stop offering a character; it stays on the GM's account."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.player_characters.update_one(
        {'id': character_id, 'user_id': username, 'prepared_for_campaign_id': campaign_id},
        {'$set': {'prepared_for_campaign_id': None, 'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='That character is not on offer in this campaign')
    return {'characters': await list_prepared_characters(campaign_id, username)}


async def claim_prepared_character(character_id: str, campaign: Dict[str, Any], username: str) -> Dict[str, Any]:
    """Move a waiting character from the GM to the joining player, once.

    The update only matches while the character is still the GM's and still
    on offer to this campaign, so two players can never both claim it.
    """
    gm_username = campaign.get('dm_user_id')
    campaign_id = campaign.get('id')
    now = _now()
    result = await db.player_characters.update_one(
        {'id': character_id, 'user_id': gm_username, 'prepared_for_campaign_id': campaign_id},
        {'$set': {
            'user_id': username,
            'prepared_for_campaign_id': None,
            'prepared_by_gm': gm_username,
            'claimed_at': now,
            'updated_at': now,
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Someone has already claimed that character. Pick another, or link your own.',
        )
    character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    return character or {}

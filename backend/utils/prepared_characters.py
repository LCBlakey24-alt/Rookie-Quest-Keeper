"""Characters a GM prepares for players to claim (shared by two routers).

Kept outside `routes` so the join route can use it without loading every
router. See routes/prepared_characters.py for the GM endpoints and
routes/campaign_invites.py for the claim on join.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import HTTPException, status

from config import db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


SUMMARY_FIELDS = ('id', 'name', 'character_name', 'race', 'species', 'character_class', 'class_name', 'level', 'portrait_url', 'avatar_url')


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


def _waiting_query(character_id, gm_username, campaign_id):
    """A character still on offer: the GM's, offered here, not playing
    anywhere, and not already reserved by a player awaiting approval."""
    return {
        'id': character_id,
        'user_id': gm_username,
        'prepared_for_campaign_id': campaign_id,
        'campaign_id': None,
        'claim_pending_by': None,
    }


async def list_prepared_characters(campaign_id: str, gm_username: str, database=None) -> list:
    store = database or db
    projection = {'_id': 0, **{field: 1 for field in SUMMARY_FIELDS}}
    characters = await store.player_characters.find(
        {'prepared_for_campaign_id': campaign_id, 'user_id': gm_username, 'campaign_id': None, 'claim_pending_by': None},
        projection,
    ).to_list(100)
    return [prepared_summary(item) for item in characters]


def _taken():
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail='Someone has already claimed that character. Pick another, or link your own.',
    )


async def claim_prepared_character(character_id: str, campaign: Dict[str, Any], username: str, database=None) -> Dict[str, Any]:
    """Move a waiting character from the GM to the joining player, once.

    The update only matches while the character is still on offer here, so
    two players can never both claim it.
    """
    store = database or db
    gm_username = campaign.get('dm_user_id')
    now = _now()
    result = await store.player_characters.update_one(
        _waiting_query(character_id, gm_username, campaign.get('id')),
        {'$set': {
            'user_id': username,
            'prepared_for_campaign_id': None,
            'prepared_by_gm': gm_username,
            'claimed_at': now,
            'updated_at': now,
        }},
    )
    if result.matched_count == 0:
        raise _taken()
    character = await store.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
    return character or {}


async def reserve_prepared_character(character_id: str, campaign: Dict[str, Any], username: str, database=None) -> Dict[str, Any]:
    """In a GM-approval campaign: hold a waiting character for this player.

    Nothing changes hands yet. The GM still owns it; it leaves the offer list
    so no one else can take it. Approving the player moves it to them
    (complete_pending_claim); rejecting them puts it back (release_pending_claim).
    """
    store = database or db
    gm_username = campaign.get('dm_user_id')
    result = await store.player_characters.update_one(
        _waiting_query(character_id, gm_username, campaign.get('id')),
        {'$set': {'claim_pending_by': username, 'claim_pending_at': _now(), 'updated_at': _now()}},
    )
    if result.matched_count == 0:
        raise _taken()
    return await store.player_characters.find_one({'id': character_id, 'user_id': gm_username}, {'_id': 0}) or {}


async def undo_claim(character_id: str, campaign: Dict[str, Any], username: str, database=None) -> None:
    """Give a just-claimed character back to the GM (a race lost after the claim)."""
    store = database or db
    await store.player_characters.update_one(
        {'id': character_id, 'user_id': username, 'prepared_by_gm': campaign.get('dm_user_id')},
        {'$set': {
            'user_id': campaign.get('dm_user_id'),
            'prepared_for_campaign_id': campaign.get('id'),
            'prepared_by_gm': None,
            'claimed_at': None,
            'updated_at': _now(),
        }},
    )


async def complete_pending_claim(member: Dict[str, Any], campaign: Dict[str, Any], database=None) -> bool:
    """The GM approved a player who reserved a prepared character: hand it over."""
    store = database or db
    character_id = member.get('character_id')
    player = member.get('user_id')
    gm_username = campaign.get('dm_user_id')
    if not character_id or not player:
        return False
    now = _now()
    result = await store.player_characters.update_one(
        {'id': character_id, 'user_id': gm_username, 'prepared_for_campaign_id': campaign.get('id'), 'claim_pending_by': player},
        {'$set': {
            'user_id': player,
            'prepared_for_campaign_id': None,
            'claim_pending_by': None,
            'claim_pending_at': None,
            'prepared_by_gm': gm_username,
            'claimed_at': now,
            'campaign_id': campaign.get('id'),
            'campaign_name': campaign.get('name', 'Untitled Campaign'),
            'campaign_join_status': 'active',
            'updated_at': now,
        }},
    )
    return result.matched_count > 0


async def release_pending_claim(member: Dict[str, Any], campaign: Dict[str, Any], database=None) -> bool:
    """The GM turned a reserving player away: the character goes back on offer."""
    store = database or db
    character_id = member.get('character_id')
    if not character_id:
        return False
    result = await store.player_characters.update_one(
        {'id': character_id, 'user_id': campaign.get('dm_user_id'), 'claim_pending_by': member.get('user_id')},
        {'$set': {'claim_pending_by': None, 'claim_pending_at': None, 'updated_at': _now()}},
    )
    return result.matched_count > 0

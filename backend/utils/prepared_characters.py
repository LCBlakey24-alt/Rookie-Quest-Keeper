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


async def list_prepared_characters(campaign_id: str, gm_username: str) -> list:
    projection = {'_id': 0, **{field: 1 for field in SUMMARY_FIELDS}}
    characters = await db.player_characters.find(
        {'prepared_for_campaign_id': campaign_id, 'user_id': gm_username}, projection,
    ).to_list(100)
    return [prepared_summary(item) for item in characters]


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

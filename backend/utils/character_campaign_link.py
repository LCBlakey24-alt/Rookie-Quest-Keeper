"""Keeping a character linked to one campaign at a time.

A character's campaign is `player_characters.campaign_id`; each campaign's
roster points at it through `campaign_members.character_id`. When a
character moves to another campaign, the old roster's pointer must be
released, or the old GM keeps seeing the character in their live party and
can still change its campaign status.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional


async def release_character_from_other_campaigns(db, character_id: str, keep_campaign_id: str) -> int:
    """Unlink `character_id` from every campaign roster except `keep_campaign_id`."""
    if not character_id:
        return 0
    result = await db.campaign_members.update_many(
        {'character_id': character_id, 'campaign_id': {'$ne': keep_campaign_id}},
        {'$set': {'character_id': None, 'updated_at': datetime.now(timezone.utc).isoformat()}},
    )
    return getattr(result, 'modified_count', 0)


def character_belongs_to_campaign(character: Optional[Dict[str, Any]], campaign_id: str) -> bool:
    """Whether a roster may show this character for `campaign_id`.

    A character that names another campaign has moved on. A character with no
    campaign_id at all is an older record linked only through the roster, so
    it is still shown.
    """
    if not character:
        return False
    current = character.get('campaign_id')
    return not current or str(current) == str(campaign_id)

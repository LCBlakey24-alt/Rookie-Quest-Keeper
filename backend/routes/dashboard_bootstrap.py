"""Lightweight aggregated payloads for signed-in home and library screens.

These screens only need summary fields. Keeping their payloads narrow avoids
shipping full character/campaign documents and removes unnecessary browser ->
Vercel -> Render -> MongoDB work during ordinary navigation.
"""
import asyncio

from fastapi import APIRouter, Depends

from config import ADMIN_USERNAMES, db
from routes.admin import merge_site_settings
from routes.homebrew import COLLECTION, CONTENT_TYPES
from utils.auth import get_current_user

router = APIRouter()

CHARACTER_PROJECTION = {
    '_id': 0,
    'id': 1,
    'character_id': 1,
    'name': 1,
    'character_name': 1,
    'race': 1,
    'species': 1,
    'level': 1,
    'created_at': 1,
    'updated_at': 1,
}

CHARACTER_LIBRARY_PROJECTION = {
    **CHARACTER_PROJECTION,
    'character_class': 1,
    'class_name': 1,
    'class': 1,
    'class_levels': 1,
    'subclass': 1,
    'subclass_name': 1,
    'class_subclass': 1,
    'archetype': 1,
    'ruleset_id': 1,
    'edition': 1,
    'rules_edition': 1,
}

CAMPAIGN_PROJECTION = {
    '_id': 0,
    'id': 1,
    'campaign_id': 1,
    'name': 1,
    'campaign_name': 1,
    'world_name': 1,
    'created_at': 1,
    'updated_at': 1,
}

CAMPAIGN_LIBRARY_PROJECTION = {
    **CAMPAIGN_PROJECTION,
    'system': 1,
    'rules_edition': 1,
    'campaign_type': 1,
    'world_genre': 1,
    'description': 1,
    'world_setting_notes': 1,
}

HOMEBREW_PROJECTION = {
    '_id': 0,
    'id': 1,
    'name': 1,
    'title': 1,
    'summary': 1,
    'category': 1,
    'created_at': 1,
    'updated_at': 1,
}


async def _load_homebrew_summaries(username: str) -> list[dict]:
    async def load_type(content_type: str) -> list[dict]:
        collection_name = COLLECTION[content_type]
        records = await db[collection_name].find(
            {'user_id': username},
            HOMEBREW_PROJECTION,
        ).to_list(1000)
        for record in records:
            record['content_type'] = record.get('content_type') or content_type
        return records

    groups = await asyncio.gather(*(load_type(content_type) for content_type in sorted(CONTENT_TYPES)))
    return [record for group in groups for record in group]


async def _attach_campaign_library_counts(campaigns: list[dict]) -> list[dict]:
    campaign_ids = [campaign.get('id') for campaign in campaigns if campaign.get('id')]
    if not campaign_ids:
        return campaigns

    members = await db.campaign_members.find(
        {'campaign_id': {'$in': campaign_ids}},
        {'_id': 0, 'campaign_id': 1, 'character_id': 1, 'status': 1},
    ).to_list(5000)

    counts = {
        campaign_id: {
            'player_count': 0,
            'linked_character_count': 0,
            'pending_approval_count': 0,
        }
        for campaign_id in campaign_ids
    }

    for member in members:
        campaign_id = member.get('campaign_id')
        if campaign_id not in counts:
            continue
        member_status = str(member.get('status') or 'active').lower()
        if member_status == 'removed':
            continue
        counts[campaign_id]['player_count'] += 1
        if member.get('character_id'):
            counts[campaign_id]['linked_character_count'] += 1
        if member_status == 'pending':
            counts[campaign_id]['pending_approval_count'] += 1

    for campaign in campaigns:
        campaign.update(counts.get(campaign.get('id'), {}))
    return campaigns


@router.get('/dashboard/bootstrap')
async def get_dashboard_bootstrap(username: str = Depends(get_current_user)):
    """Return only the data required to paint the signed-in home screen."""
    characters_request = db.player_characters.find(
        {'user_id': username},
        CHARACTER_PROJECTION,
    ).sort('created_at', -1).to_list(100)

    campaigns_request = db.campaigns.find(
        {'dm_user_id': username},
        CAMPAIGN_PROJECTION,
    ).to_list(1000)

    site_settings_request = db.site_settings.find_one({'id': 'global'}, {'_id': 0})
    homebrew_request = _load_homebrew_summaries(username)

    characters, campaigns, site_settings_doc, homebrew_items = await asyncio.gather(
        characters_request,
        campaigns_request,
        site_settings_request,
        homebrew_request,
    )

    admins = {str(admin).lower() for admin in ADMIN_USERNAMES}

    return {
        'characters': characters,
        'campaigns': campaigns,
        'homebrew_items': homebrew_items,
        'site_settings': merge_site_settings(site_settings_doc),
        'is_admin': username.lower() in admins,
        'admin_overview': {},
    }


@router.get('/library/characters')
async def get_character_library(username: str = Depends(get_current_user)):
    """Return the compact fields needed by the saved-characters library."""
    return await db.player_characters.find(
        {'user_id': username},
        CHARACTER_LIBRARY_PROJECTION,
    ).sort('updated_at', -1).to_list(500)


@router.get('/library/campaigns')
async def get_campaign_library(username: str = Depends(get_current_user)):
    """Return compact campaign cards plus membership counts."""
    campaigns = await db.campaigns.find(
        {'dm_user_id': username},
        CAMPAIGN_LIBRARY_PROJECTION,
    ).sort('updated_at', -1).to_list(1000)
    return await _attach_campaign_library_counts(campaigns)

"""Lightweight aggregated payload for the first signed-in dashboard.

The home dashboard only needs summary fields. Keeping this as one request avoids
shipping full character/campaign documents and removes several extra browser ->
Vercel -> Render round trips immediately after login.
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
        # UnifiedDashboard no longer needs the expensive site-wide metrics to
        # become interactive. Admin pages load their own metrics when opened.
        'admin_overview': {},
    }

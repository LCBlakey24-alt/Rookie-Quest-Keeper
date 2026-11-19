"""A TV link for the player display, so any browser can show it.

The GM makes a code for a campaign. Anyone who opens /tv/<code> sees what
the player display shows -- read-only, nothing else -- without signing in.
Resetting the code (or turning it off) stops the old link at once.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from utils.auth import get_current_user, verify_campaign_ownership
from utils.player_display_payload import public_display_state
from utils.player_views import PARTY_FIELDS, player_party_member

router = APIRouter()

# No 0/O or 1/I/L: the code is typed on a TV remote.
TV_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
TV_CODE_LENGTH = 8
# Who changed the display, and which screens acknowledged it, stay private.
PRIVATE_STATE_KEYS = ('updated_by', 'delivery_ack')


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalise_tv_code(value) -> str:
    return ''.join(ch for ch in str(value or '').upper() if ch in TV_CODE_ALPHABET)[:TV_CODE_LENGTH]


async def _new_code() -> str:
    for _ in range(20):
        code = ''.join(secrets.choice(TV_CODE_ALPHABET) for _ in range(TV_CODE_LENGTH))
        if not await db.tv_display_links.find_one({'code': code}, {'_id': 1}):
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not make a TV code')


async def _replace_link(campaign_id: str, username: str) -> dict:
    await db.tv_display_links.delete_many({'campaign_id': campaign_id})
    link = {'code': await _new_code(), 'campaign_id': campaign_id, 'created_by': username, 'created_at': _now()}
    await db.tv_display_links.insert_one(dict(link))
    return link


def _link_view(link):
    return {'code': link['code'], 'created_at': link.get('created_at')} if link else {'code': None}


@router.get('/campaigns/{campaign_id}/tv-link')
async def get_tv_link(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    link = await db.tv_display_links.find_one({'campaign_id': campaign_id}, {'_id': 0})
    return _link_view(link)


@router.post('/campaigns/{campaign_id}/tv-link')
async def reset_tv_link(campaign_id: str, username: str = Depends(get_current_user)):
    """Make a new TV code. Any old code stops working."""
    await verify_campaign_ownership(campaign_id, username)
    return _link_view(await _replace_link(campaign_id, username))


@router.delete('/campaigns/{campaign_id}/tv-link')
async def disable_tv_link(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    await db.tv_display_links.delete_many({'campaign_id': campaign_id})
    return {'code': None}


@router.get('/tv/{code}/display-state')
async def tv_display_state(code: str):
    """The player display for whoever holds the TV code. No sign-in."""
    clean = normalise_tv_code(code)
    link = await db.tv_display_links.find_one({'code': clean}, {'_id': 0}) if len(clean) == TV_CODE_LENGTH else None
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='That TV code is not active')
    campaign_id = link['campaign_id']
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'name': 1})
    stored = await db.campaign_display_states.find_one({'campaign_id': campaign_id}, {'_id': 0})
    state = public_display_state(stored) if stored else {'campaign_id': campaign_id, 'mode': 'blank', 'payload': {}}
    for key in PRIVATE_STATE_KEYS:
        state.pop(key, None)
    projection = {'_id': 0, **{field: 1 for field in PARTY_FIELDS}}
    characters = await db.player_characters.find({'campaign_id': campaign_id}, {**projection, 'campaign_join_status': 1}).to_list(50)
    # Only the table's actual party: nobody still waiting for the GM, removed or gone.
    characters = [item for item in characters if str(item.get('campaign_join_status') or 'active').lower() == 'active']
    return {
        'campaign_name': (campaign or {}).get('name') or 'Campaign',
        'state': state,
        'party': [player_party_member(item) for item in characters],
    }

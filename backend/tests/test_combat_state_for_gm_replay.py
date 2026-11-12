"""GM offline combat replay can read a party character's combat state.

Replay first read GET /characters/{id}, which is owner-only, so a GM's queued
combat changes for the party never synced. The campaign combat-state read is
open to the owner and to the GM of the campaign the character is linked to.
"""
import asyncio
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

from types import SimpleNamespace  # noqa: E402
from unittest.mock import patch  # noqa: E402

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import character_patch  # noqa: E402


def _finder(docs):
    async def find_one(query, _projection=None):
        for doc in docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None
    return SimpleNamespace(find_one=find_one)


def _db(*, member=True, character_campaign='camp-1'):
    return SimpleNamespace(
        player_characters=_finder([{
            'id': 'char-9', 'user_id': 'pat', 'campaign_id': character_campaign, 'name': 'Pip',
            'current_hit_points': 4, 'conditions': ['prone'], 'death_saves_failures': 1,
            'strength': 16, 'notes': 'private notes',
        }]),
        campaigns=_finder([{'id': 'camp-1', 'dm_user_id': 'gm'}]),
        campaign_members=_finder([{'campaign_id': 'camp-1', 'character_id': 'char-9'}] if member else []),
    )


def _read(username, database, campaign_id='camp-1'):
    with patch.object(character_patch, 'db', database):
        return asyncio.run(character_patch.get_character_combat_state(campaign_id, 'char-9', username=username))


def test_the_gm_reads_only_combat_fields():
    state = _read('gm', _db())
    assert state['current_hit_points'] == 4
    assert state['conditions'] == ['prone']
    assert 'strength' not in state and 'notes' not in state


def test_the_owner_can_read_it_too():
    assert _read('pat', _db())['current_hit_points'] == 4


@pytest.mark.parametrize('username, database, campaign_id', [
    ('stranger', _db(), 'camp-1'),                         # not the GM
    ('gm', _db(member=False), 'camp-1'),                    # not on the roster
    ('gm', _db(character_campaign='camp-2'), 'camp-1'),     # moved to another campaign
    ('gm', _db(), 'camp-2'),                                # asked through the wrong campaign
])
def test_everyone_else_is_refused(username, database, campaign_id):
    with pytest.raises(HTTPException) as refused:
        _read(username, database, campaign_id)
    assert refused.value.status_code == 404

import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

spec = importlib.util.spec_from_file_location('notes_membership_under_test', BACKEND_ROOT / 'routes' / 'notes.py')
notes = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(notes)


def matches(row, query):
    for key, expected in query.items():
        actual = row.get(key)
        if isinstance(expected, dict) and '$in' in expected:
            if actual not in expected['$in']:
                return False
        elif actual != expected:
            return False
    return True


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args):
        return self

    async def to_list(self, limit):
        return list(self.rows[:limit])


class Collection:
    def __init__(self, rows=()):
        self.rows = list(rows)

    def find(self, query, _projection=None):
        return Cursor([row for row in self.rows if matches(row, query)])

    async def find_one(self, query, _projection=None):
        return next((row for row in self.rows if matches(row, query)), None)

    async def insert_one(self, row):
        self.rows.append(dict(row))


def test_approved_campaign_characters_exclude_pending_and_removed_but_keep_legacy(monkeypatch):
    fake = SimpleNamespace(
        campaign_members=Collection([
            {'campaign_id': 'c1', 'user_id': 'active', 'character_id': 'a', 'status': 'active'},
            {'campaign_id': 'c1', 'user_id': 'dead', 'character_id': 'd', 'status': 'dead'},
            {'campaign_id': 'c1', 'user_id': 'retired', 'character_id': 'r', 'status': 'retired'},
            {'campaign_id': 'c1', 'user_id': 'pending', 'character_id': 'p', 'status': 'pending'},
            {'campaign_id': 'c1', 'user_id': 'removed', 'character_id': 'x', 'status': 'removed'},
        ]),
        player_characters=Collection([
            {'id': 'a', 'campaign_id': 'c1', 'user_id': 'active', 'name': 'Active'},
            {'id': 'd', 'campaign_id': 'c1', 'user_id': 'dead', 'name': 'Dead'},
            {'id': 'r', 'campaign_id': 'c1', 'user_id': 'retired', 'name': 'Retired'},
            {'id': 'p', 'campaign_id': 'c1', 'user_id': 'pending', 'name': 'Pending'},
            {'id': 'x', 'campaign_id': 'c1', 'user_id': 'removed', 'name': 'Removed'},
            {'id': 'legacy', 'campaign_id': 'c1', 'user_id': 'legacy', 'name': 'Legacy'},
        ]),
    )
    monkeypatch.setattr(notes, 'db', fake)

    rows = asyncio.run(notes._approved_campaign_characters('c1'))
    assert {row['user_id'] for row in rows} == {'active', 'dead', 'retired', 'legacy'}


def test_accessible_campaign_ids_ignore_pending_and_removed_character_links(monkeypatch):
    fake = SimpleNamespace(
        campaign_members=Collection([
            {'campaign_id': 'active-c', 'user_id': 'player', 'status': 'active'},
            {'campaign_id': 'dead-c', 'user_id': 'player', 'status': 'dead'},
            {'campaign_id': 'retired-c', 'user_id': 'player', 'status': 'retired'},
            {'campaign_id': 'pending-c', 'user_id': 'player', 'status': 'pending'},
            {'campaign_id': 'removed-c', 'user_id': 'player', 'status': 'removed'},
        ]),
        player_characters=Collection([
            {'campaign_id': 'active-c', 'user_id': 'player'},
            {'campaign_id': 'dead-c', 'user_id': 'player'},
            {'campaign_id': 'retired-c', 'user_id': 'player'},
            {'campaign_id': 'pending-c', 'user_id': 'player'},
            {'campaign_id': 'removed-c', 'user_id': 'player'},
            {'campaign_id': 'legacy-c', 'user_id': 'player'},
        ]),
    )
    monkeypatch.setattr(notes, 'db', fake)

    ids = asyncio.run(notes._accessible_player_campaign_ids('player'))
    assert ids == ['active-c', 'dead-c', 'legacy-c', 'retired-c']


def test_campaign_linked_personal_note_requires_membership(monkeypatch):
    fake = SimpleNamespace(
        campaigns=Collection([{'id': 'secret-c', 'name': 'Secret Campaign'}]),
        player_notes=Collection(),
    )
    monkeypatch.setattr(notes, 'db', fake)

    async def deny(_campaign_id, _username):
        raise HTTPException(status_code=403, detail='waiting for GM approval')

    monkeypatch.setattr(notes, 'verify_campaign_membership', deny)
    payload = notes.PlayerNoteCreate(title='Private note', content='Test', campaign_id='secret-c')

    with pytest.raises(HTTPException) as exc:
        asyncio.run(notes.create_player_note(payload, username='pending-player'))

    assert exc.value.status_code == 403
    assert fake.player_notes.rows == []

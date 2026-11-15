"""Offline combat replay applies a queued change only if the cloud still holds
the state it was made from, as one compare-and-set (review finding 3).

Before: the client read the state, compared, then wrote unconditionally, so a
change from another device between the read and the write was overwritten.
"""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routes import character_patch  # noqa: E402


def _matches(doc, query):
    for key, want in query.items():
        if isinstance(want, dict) and '$exists' in want:
            if (key in doc) != want['$exists']:
                return False
        elif doc.get(key) != want:
            return False
    return True


class _Characters:
    def __init__(self, doc, before_write=None):
        self.doc = doc
        self.before_write = before_write
        self.writes = 0

    async def find_one(self, query, _projection=None):
        return dict(self.doc) if _matches(self.doc, query) else None

    async def update_one(self, query, update):
        if self.before_write:
            self.before_write(self.doc)  # another device edits between read and write
            self.before_write = None
        if not _matches(self.doc, query):
            return SimpleNamespace(matched_count=0)
        self.doc.update(update['$set'])
        self.writes += 1
        return SimpleNamespace(matched_count=1)


def _finder(docs):
    async def find_one(query, _projection=None):
        return next((dict(d) for d in docs if _matches(d, query)), None)
    return SimpleNamespace(find_one=find_one)


def _db(characters):
    return SimpleNamespace(
        player_characters=characters,
        campaigns=_finder([{'id': 'camp-1', 'dm_user_id': 'gm'}]),
        campaign_members=_finder([{'campaign_id': 'camp-1', 'character_id': 'char-9'}]),
    )


def _hero(**extra):
    return {'id': 'char-9', 'user_id': 'pat', 'campaign_id': 'camp-1', 'current_hit_points': 10, 'conditions': [], **extra}


BASE = {'current_hit_points': 10, 'conditions': []}
WANT = {'current_hit_points': 4}


def _apply(characters, body, username='gm'):
    with patch.object(character_patch, 'db', _db(characters)):
        return asyncio.run(character_patch.apply_character_combat_state('camp-1', 'char-9', body, username=username))


def test_applies_when_the_cloud_still_matches_the_baseline():
    characters = _Characters(_hero())
    result = _apply(characters, {'expected': BASE, 'state': WANT})
    assert result['applied'] and not result['already_applied']
    assert characters.doc['current_hit_points'] == 4


def test_a_change_between_read_and_write_is_a_conflict_and_is_kept():
    characters = _Characters(_hero(), before_write=lambda doc: doc.update(current_hit_points=7))
    with pytest.raises(HTTPException) as conflict:
        _apply(characters, {'expected': BASE, 'state': WANT})
    assert conflict.value.status_code == 409
    assert conflict.value.detail['state']['current_hit_points'] == 7
    assert characters.doc['current_hit_points'] == 7  # the newer cloud value is not overwritten


def test_a_cloud_that_already_differs_is_a_conflict():
    characters = _Characters(_hero(current_hit_points=7))
    with pytest.raises(HTTPException) as conflict:
        _apply(characters, {'expected': BASE, 'state': WANT})
    assert conflict.value.status_code == 409
    assert characters.writes == 0


def test_a_retry_after_a_lost_response_is_already_applied():
    characters = _Characters(_hero(current_hit_points=4))  # the first attempt landed
    result = _apply(characters, {'expected': BASE, 'state': WANT})
    assert result == {'applied': True, 'already_applied': True, 'state': result['state']}
    assert characters.writes == 0


def test_only_combat_fields_are_written():
    characters = _Characters(_hero())
    _apply(characters, {'expected': BASE, 'state': {'current_hit_points': 4, 'strength': 30}}, username='pat')
    assert 'strength' not in characters.doc


def test_strangers_are_refused():
    with pytest.raises(HTTPException) as refused:
        _apply(_Characters(_hero()), {'expected': BASE, 'state': WANT}, username='stranger')
    assert refused.value.status_code == 404

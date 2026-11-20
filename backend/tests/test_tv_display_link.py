"""The TV link shows the player display, read-only, to whoever holds a live code."""
import asyncio
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
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import importlib.util  # noqa: E402


def _load_route(name):
    # Load the one route file, not the routes package (which pulls in every
    # router and their optional dependencies).
    path = Path(__file__).resolve().parents[1] / 'routes' / f'{name}.py'
    spec = importlib.util.spec_from_file_location(f'focused_{name}_test_module', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


tv = _load_route('tv_display')
import copy  # noqa: E402


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return self.docs


class Collection:
    def __init__(self, docs=None):
        self.docs = [copy.deepcopy(d) for d in (docs or [])]

    def _match(self, doc, query):
        return all(doc.get(k) == v for k, v in query.items())

    async def find_one(self, query, projection=None):
        return next((copy.deepcopy(d) for d in self.docs if self._match(d, query)), None)

    def find(self, query, projection=None):
        fields = [k for k, v in (projection or {}).items() if v and k != '_id']
        found = [d for d in self.docs if self._match(d, query)]
        return Cursor([{k: d[k] for k in fields if k in d} if fields else copy.deepcopy(d) for d in found])

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))

    async def delete_many(self, query):
        self.docs = [d for d in self.docs if not self._match(d, query)]


@pytest.fixture
def db(monkeypatch):
    fake = SimpleNamespace(
        tv_display_links=Collection(),
        campaigns=Collection([{'id': 'camp', 'name': 'Synthetic One', 'dm_user_id': 'gm'}]),
        campaign_display_states=Collection([{
            'campaign_id': 'camp', 'mode': 'title', 'sequence': 4, 'updated_at': '2026-11-18T20:00:00+00:00',
            'updated_by': 'gm', 'delivery_ack': {'tab-1': 'gm'},
            'payload': {'title': 'The Gilded Anchor', 'gm_notes': 'secret'},
        }]),
        player_characters=Collection([
            {'id': 'p1', 'campaign_id': 'camp', 'name': 'Synthetic Ranger', 'character_class': 'Ranger', 'level': 3, 'user_id': 'player-a', 'notes': 'private'},
            {'id': 'p2', 'campaign_id': 'camp', 'name': 'Waiting Stranger', 'campaign_join_status': 'pending', 'user_id': 'stranger'},
            {'id': 'p3', 'campaign_id': 'camp', 'name': 'Removed Rogue', 'campaign_join_status': 'removed', 'user_id': 'gone'},
        ]),
    )
    async def owner(campaign_id, username):
        if username != 'gm':
            raise HTTPException(status_code=403, detail='Not your campaign')
    monkeypatch.setattr(tv, 'db', fake)
    monkeypatch.setattr(tv, 'verify_campaign_ownership', owner)
    return fake


def run(coro):
    return asyncio.run(coro)


def test_no_link_until_the_gm_makes_one(db):
    assert run(tv.get_tv_link('camp', username='gm')) == {'code': None}
    with pytest.raises(HTTPException) as missing:
        run(tv.tv_display_state('ABCDEFGH'))
    assert missing.value.status_code == 404


def test_code_shows_the_public_display_and_party_but_nothing_private(db):
    code = run(tv.reset_tv_link('camp', username='gm'))['code']
    assert len(code) == 8 and set(code) <= set(tv.TV_CODE_ALPHABET)
    view = run(tv.tv_display_state(code.lower()))
    assert view['campaign_name'] == 'Synthetic One'
    assert view['state']['mode'] == 'title'
    assert view['state']['payload'].get('title') == 'The Gilded Anchor'
    assert 'gm_notes' not in view['state']['payload']
    assert 'updated_by' not in view['state'] and 'delivery_ack' not in view['state']
    assert view['party'] == [{'id': 'p1', 'name': 'Synthetic Ranger', 'character_class': 'Ranger', 'level': 3}]


def test_resetting_or_turning_off_stops_the_old_code(db):
    first = run(tv.reset_tv_link('camp', username='gm'))['code']
    second = run(tv.reset_tv_link('camp', username='gm'))['code']
    assert first != second
    with pytest.raises(HTTPException):
        run(tv.tv_display_state(first))
    assert run(tv.tv_display_state(second))['campaign_name'] == 'Synthetic One'
    run(tv.disable_tv_link('camp', username='gm'))
    with pytest.raises(HTTPException):
        run(tv.tv_display_state(second))


def test_only_the_gm_can_make_or_read_the_code(db):
    for action in (tv.get_tv_link, tv.reset_tv_link, tv.disable_tv_link):
        with pytest.raises(HTTPException) as denied:
            run(action('camp', username='player-a'))
        assert denied.value.status_code == 403


def test_tv_link_lookups_are_rate_limited_by_address():
    from utils.rate_limit import ANONYMOUS_PREFIXES, match_rule
    assert match_rule('GET', '/api/tv/ABCD2345/display-state')[1:] == (120, 60)
    assert '/api/tv/' in ANONYMOUS_PREFIXES

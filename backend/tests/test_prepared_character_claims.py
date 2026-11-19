"""GM-prepared characters: offered, previewed, claimed once, and moved to the player."""
import asyncio
import copy
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

import utils.prepared_characters as prepared_utils  # noqa: E402


def _load_route(name):
    # Load the one route file, not the routes package (which pulls in every
    # router and their optional dependencies).
    path = Path(__file__).resolve().parents[1] / 'routes' / f'{name}.py'
    spec = importlib.util.spec_from_file_location(f'focused_{name}_test_module', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


invites = _load_route('campaign_invites')
prepared = _load_route('prepared_characters')


def _matches(doc, query):
    for key, expected in query.items():
        value = doc.get(key)
        if isinstance(expected, dict) and '$ne' in expected:
            if value == expected['$ne']:
                return False
        elif value != expected:
            return False
    return True


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return self.docs


class Collection:
    def __init__(self, docs=None):
        self.docs = [copy.deepcopy(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if _matches(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query, projection=None):
        return Cursor([copy.deepcopy(d) for d in self.docs if _matches(d, query)])

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))

    async def update_one(self, query, update):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get('$set', {}))
                for key, amount in update.get('$inc', {}).items():
                    doc[key] = doc.get(key, 0) + amount
                return SimpleNamespace(matched_count=1, modified_count=1)
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def update_many(self, query, update):
        count = 0
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get('$set', {}))
                count += 1
        return SimpleNamespace(modified_count=count)


@pytest.fixture
def db(monkeypatch):
    fake = SimpleNamespace(
        campaigns=Collection([{'id': 'camp', 'name': 'Synthetic One', 'dm_user_id': 'gm', 'join_mode': 'auto_accept'}]),
        campaign_invites=Collection([{'code': 'ABC123', 'campaign_id': 'camp', 'uses': 0, 'expires_at': None}]),
        campaign_members=Collection(),
        player_characters=Collection([
            {'id': 'ready', 'user_id': 'gm', 'name': 'Synthetic Ranger', 'race': 'Elf', 'character_class': 'Ranger', 'level': 3, 'hp': 24},
            {'id': 'gm-other', 'user_id': 'gm', 'name': 'Busy hero', 'campaign_id': 'another'},
            {'id': 'mine', 'user_id': 'player-a', 'name': 'Own character'},
        ]),
    )
    async def ok(*_args, **_kwargs):
        return None
    monkeypatch.setattr(invites, 'db', fake)
    monkeypatch.setattr(prepared, 'db', fake)
    monkeypatch.setattr(prepared_utils, 'db', fake)
    monkeypatch.setattr(prepared, 'verify_campaign_ownership', ok)
    return fake


def run(coro):
    return asyncio.run(coro)


def test_gm_offers_a_character_and_a_joining_player_sees_only_a_summary(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    preview = run(invites.preview_campaign_by_code({'join_code': 'abc 123'}, username='player-a'))
    assert preview['campaign']['name'] == 'Synthetic One'
    assert preview['prepared_characters'] == [{
        'id': 'ready', 'name': 'Synthetic Ranger', 'race': 'Elf', 'character_class': 'Ranger', 'level': 3, 'portrait_url': '',
    }]
    # An offered character is not in the campaign roster until claimed.
    assert db.player_characters.docs[0].get('campaign_id') is None


def test_gm_cannot_offer_a_character_already_in_a_campaign_or_someone_elses(db):
    with pytest.raises(HTTPException) as busy:
        run(prepared.offer_prepared_character('camp', {'character_id': 'gm-other'}, username='gm'))
    assert busy.value.status_code == 409
    with pytest.raises(HTTPException) as theirs:
        run(prepared.offer_prepared_character('camp', {'character_id': 'mine'}, username='gm'))
    assert theirs.value.status_code == 404


def test_claiming_moves_the_character_to_the_player_and_links_it(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    result = run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-a'))
    assert result['status'] == 'active'
    assert result['message'] == 'Character claimed and linked to campaign'
    character = next(d for d in db.player_characters.docs if d['id'] == 'ready')
    assert character['user_id'] == 'player-a'
    assert character['campaign_id'] == 'camp'
    assert character['prepared_for_campaign_id'] is None
    assert character['prepared_by_gm'] == 'gm'
    assert character['hp'] == 24  # the sheet itself is untouched
    member = db.campaign_members.docs[0]
    assert (member['user_id'], member['character_id']) == ('player-a', 'ready')


def test_a_character_can_only_be_claimed_once(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-a'))
    with pytest.raises(HTTPException) as taken:
        run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-b'))
    assert taken.value.status_code == 409
    assert next(d for d in db.player_characters.docs if d['id'] == 'ready')['user_id'] == 'player-a'


def test_characters_not_on_offer_cannot_be_claimed(db):
    # Not offered yet.
    with pytest.raises(HTTPException) as not_offered:
        run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-a'))
    assert not_offered.value.status_code == 409
    # Another player's own character can never be claimed.
    with pytest.raises(HTTPException) as theirs:
        run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'mine'}, username='player-b'))
    assert theirs.value.status_code == 409
    assert next(d for d in db.player_characters.docs if d['id'] == 'mine')['user_id'] == 'player-a'


def test_withdrawn_characters_stay_with_the_gm_and_cannot_be_claimed(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    run(prepared.withdraw_prepared_character('camp', 'ready', username='gm'))
    preview = run(invites.preview_campaign_by_code({'join_code': 'ABC123'}, username='player-a'))
    assert preview['prepared_characters'] == []
    with pytest.raises(HTTPException):
        run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-a'))
    assert next(d for d in db.player_characters.docs if d['id'] == 'ready')['user_id'] == 'gm'


def test_a_player_with_a_live_character_cannot_claim_a_second(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    run(invites.join_campaign_by_code({'join_code': 'ABC123', 'character_id': 'mine'}, username='player-a'))
    with pytest.raises(HTTPException) as second:
        run(invites.join_campaign_by_code({'join_code': 'ABC123', 'prepared_character_id': 'ready'}, username='player-a'))
    assert second.value.status_code == 400
    assert next(d for d in db.player_characters.docs if d['id'] == 'ready')['user_id'] == 'gm'


def test_the_gm_previewing_their_own_code_sees_no_claim_list(db):
    run(prepared.offer_prepared_character('camp', {'character_id': 'ready'}, username='gm'))
    preview = run(invites.preview_campaign_by_code({'join_code': 'ABC123'}, username='gm'))
    assert preview['is_gm'] is True and preview['prepared_characters'] == []

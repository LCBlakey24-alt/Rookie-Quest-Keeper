"""GM-granted level ups: who can grant, to whom, and what the player sees."""
import asyncio
import copy
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

spec = importlib.util.spec_from_file_location('level_up_grants_test_module', BACKEND_ROOT / 'routes' / 'level_up_grants.py')
grants = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grants)

MISSING = object()


def _get(doc, dotted):
    value = doc
    for part in dotted.split('.'):
        if not isinstance(value, dict) or part not in value:
            return MISSING
        value = value[part]
    return value


def _matches(doc, query):
    for key, expected in query.items():
        actual = _get(doc, key)
        if isinstance(expected, dict) and '$ne' in expected:
            if (None if actual is MISSING else actual) == expected['$ne']:
                return False
        elif expected is None:
            if actual not in (MISSING, None):
                return False
        elif actual is MISSING or actual != expected:
            return False
    return True


class Result:
    def __init__(self, matched):
        self.matched_count = matched


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, limit):
        return self.docs[:limit]


class Collection:
    def __init__(self, docs=None):
        self.docs = [copy.deepcopy(doc) for doc in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if _matches(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query, projection=None):
        return Cursor([copy.deepcopy(doc) for doc in self.docs if _matches(doc, query)])

    async def update_one(self, query, update):
        for doc in self.docs:
            if _matches(doc, query):
                for key, value in update.get('$set', {}).items():
                    target = doc
                    parts = key.split('.')
                    for part in parts[:-1]:
                        target = target.setdefault(part, {})
                    target[parts[-1]] = value
                return Result(1)
        return Result(0)


def setup(monkeypatch, *, characters, members, gm='gm-user'):
    async def verify(campaign_id, username):
        if username != gm or campaign_id != 'camp-1':
            raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    database = SimpleNamespace(player_characters=Collection(characters), campaign_members=Collection(members))
    monkeypatch.setattr(grants, 'db', database)
    monkeypatch.setattr(grants, 'verify_campaign_ownership', verify)
    return database


def run(coro):
    return asyncio.run(coro)


HERO = {'id': 'char-1', 'user_id': 'player-1', 'name': 'Punch', 'level': 4, 'campaign_id': 'camp-1', 'campaign_name': 'Tia-Karta'}
ACTIVE = {'campaign_id': 'camp-1', 'character_id': 'char-1', 'status': 'active'}


def test_the_gm_grants_one_level_and_it_is_stored_on_the_character(monkeypatch):
    database = setup(monkeypatch, characters=[HERO], members=[ACTIVE])
    result = run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert result['grant']['from_level'] == 4
    assert result['grant']['to_level'] == 5
    assert result['already_pending'] is False
    saved = database.player_characters.docs[0]['level_up_grant']
    assert saved['granted_by'] == 'gm-user' and saved['seen_at'] is None
    assert database.player_characters.docs[0]['level'] == 4  # the player still levels up themselves


def test_someone_who_is_not_the_gm_cannot_grant(monkeypatch):
    database = setup(monkeypatch, characters=[HERO], members=[ACTIVE])
    with pytest.raises(HTTPException) as error:
        run(grants.grant_level_up('camp-1', 'char-1', username='player-1'))
    assert error.value.status_code == 404
    assert 'level_up_grant' not in database.player_characters.docs[0]


@pytest.mark.parametrize('member', [None, {**ACTIVE, 'status': 'pending'}, {**ACTIVE, 'status': 'removed'}])
def test_only_active_members_of_the_campaign_can_be_granted(monkeypatch, member):
    setup(monkeypatch, characters=[HERO], members=[member] if member else [])
    with pytest.raises(HTTPException) as error:
        run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert error.value.status_code == 404


def test_a_character_from_another_campaign_cannot_be_granted(monkeypatch):
    setup(monkeypatch, characters=[{**HERO, 'campaign_id': 'camp-2'}], members=[ACTIVE])
    with pytest.raises(HTTPException) as error:
        run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert error.value.status_code == 404


def test_level_20_cannot_be_granted_more(monkeypatch):
    setup(monkeypatch, characters=[{**HERO, 'level': 20}], members=[ACTIVE])
    with pytest.raises(HTTPException) as error:
        run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert error.value.status_code == 400


def test_granting_twice_does_not_stack(monkeypatch):
    database = setup(monkeypatch, characters=[HERO], members=[ACTIVE])
    first = run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    second = run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert second['already_pending'] is True
    assert second['grant']['id'] == first['grant']['id']
    assert database.player_characters.docs[0]['level_up_grant']['to_level'] == 5


def test_after_levelling_up_the_gm_can_grant_the_next_level(monkeypatch):
    database = setup(monkeypatch, characters=[HERO], members=[ACTIVE])
    run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    database.player_characters.docs[0]['level'] = 5
    again = run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    assert again['already_pending'] is False and again['grant']['to_level'] == 6


def test_the_player_sees_only_their_own_waiting_level_ups(monkeypatch):
    other = {**HERO, 'id': 'char-2', 'user_id': 'someone-else', 'level_up_grant': {'id': 'g2', 'to_level': 5}}
    done = {**HERO, 'id': 'char-3', 'level': 6, 'level_up_grant': {'id': 'g3', 'to_level': 6}}
    database = setup(monkeypatch, characters=[HERO, other, done], members=[ACTIVE])
    run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))
    mine = run(grants.my_level_up_grants(username='player-1'))
    assert [entry['character_id'] for entry in mine] == ['char-1']  # not someone else's, not one already spent
    assert mine[0] == {
        'character_id': 'char-1', 'character_name': 'Punch', 'campaign_name': 'Tia-Karta',
        'from_level': 4, 'to_level': 5, 'grant_id': database.player_characters.docs[0]['level_up_grant']['id'], 'seen': False,
    }


def test_marking_seen_only_works_for_the_owner_and_the_current_grant(monkeypatch):
    database = setup(monkeypatch, characters=[HERO], members=[ACTIVE])
    grant_id = run(grants.grant_level_up('camp-1', 'char-1', username='gm-user'))['grant']['id']
    with pytest.raises(HTTPException):
        run(grants.mark_level_up_grant_seen('char-1', {'grant_id': grant_id}, username='someone-else'))
    with pytest.raises(HTTPException):
        run(grants.mark_level_up_grant_seen('char-1', {'grant_id': 'stale'}, username='player-1'))
    assert run(grants.mark_level_up_grant_seen('char-1', {'grant_id': grant_id}, username='player-1')) == {'ok': True}
    assert run(grants.my_level_up_grants(username='player-1'))[0]['seen'] is True
    assert database.player_characters.docs[0]['level_up_grant']['seen_at']


def test_level_up_grant_cannot_be_set_through_the_character_patch_route():
    patch_spec = importlib.util.spec_from_file_location('character_patch_for_grant_test', BACKEND_ROOT / 'routes' / 'character_patch.py')
    patch_module = importlib.util.module_from_spec(patch_spec)
    patch_spec.loader.exec_module(patch_module)
    assert 'level_up_grant' not in patch_module.ALLOWED_CHARACTER_PATCH_FIELDS

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


def load_module():
    path = BACKEND_ROOT / 'routes' / 'custom_creatures.py'
    spec = importlib.util.spec_from_file_location('focused_custom_creatures_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


creatures = load_module()


class FakeRoute:
    def __init__(self, path, methods):
        self.path = path
        self.methods = set(methods)


class Result:
    def __init__(self, *, matched_count=1, deleted_count=1):
        self.matched_count = matched_count
        self.deleted_count = deleted_count


class Cursor:
    def __init__(self, rows):
        self.rows = rows
        self.sort_args = None

    def sort(self, *args):
        self.sort_args = args
        return self

    async def to_list(self, limit):
        return [dict(row) for row in self.rows[:limit]]


def creature_payload(name='Ash Drake'):
    return creatures.CustomCreatureCreate(
        name=name,
        cr='2',
        hp=45,
        ac=14,
        type='dragon',
        size='Medium',
        speed='30 ft.',
        abilities='Bite 1d8+3; Ember Breath',
        description='A soot-scaled drake used for route tests.',
    )


def test_remove_legacy_creature_routes_keeps_unrelated_admin_routes():
    router = SimpleNamespace(routes=[
        FakeRoute('/campaigns/{campaign_id}/custom-creatures', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/custom-creatures', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/custom-creatures/{creature_id}', {'PUT'}),
        FakeRoute('/campaigns/{campaign_id}/custom-creatures/{creature_id}', {'DELETE'}),
        FakeRoute('/campaigns/{campaign_id}/custom-creatures/import', {'POST'}),
        FakeRoute('/admin/users', {'GET'}),
        FakeRoute('/reviews', {'POST'}),
    ])

    removed = creatures.remove_legacy_custom_creature_routes(router)

    assert removed == 5
    assert [(route.path, route.methods) for route in router.routes] == [
        ('/admin/users', {'GET'}),
        ('/reviews', {'POST'}),
    ]


def test_focused_router_registers_all_creature_routes_once():
    actual = []
    for route in creatures.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            key = (method, getattr(route, 'path', ''))
            if key in creatures.CUSTOM_CREATURE_ROUTE_KEYS:
                actual.append(key)

    assert set(actual) == creatures.CUSTOM_CREATURE_ROUTE_KEYS
    assert len(actual) == len(creatures.CUSTOM_CREATURE_ROUTE_KEYS)


def test_ownership_failure_happens_before_creature_collection_read(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        def find(self, *args, **kwargs):
            pytest.fail('Creature collection must not be read before ownership succeeds')

    monkeypatch.setattr(creatures, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(creatures, 'db', SimpleNamespace(custom_creatures=NeverTouch()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(creatures.get_custom_creatures('campaign-b', username='outsider'))
    assert exc.value.status_code == 404


def test_get_creatures_verifies_owner_and_scopes_query(monkeypatch):
    ownership_calls = []
    queries = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Collection:
        def find(self, query, projection=None):
            queries.append((query, projection))
            return Cursor([{'id': 'creature-1', 'campaign_id': 'campaign-a', 'name': 'Ash Drake'}])

    monkeypatch.setattr(creatures, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(creatures, 'db', SimpleNamespace(custom_creatures=Collection()))

    result = asyncio.run(creatures.get_custom_creatures('campaign-a', username='gm-a'))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert queries == [({'campaign_id': 'campaign-a'}, {'_id': 0})]
    assert result[0]['name'] == 'Ash Drake'


def test_create_creature_verifies_owner_and_stamps_campaign_and_creator(monkeypatch):
    ownership_calls = []
    inserts = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Collection:
        async def insert_one(self, doc):
            inserts.append(dict(doc))

    monkeypatch.setattr(creatures, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(creatures, 'db', SimpleNamespace(custom_creatures=Collection()))

    result = asyncio.run(creatures.create_custom_creature(
        'campaign-a', creature_payload(), username='gm-a'
    ))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert inserts[0]['campaign_id'] == 'campaign-a'
    assert inserts[0]['created_by'] == 'gm-a'
    assert inserts[0]['name'] == 'Ash Drake'
    assert result['creature']['campaign_id'] == 'campaign-a'


def test_update_and_delete_are_campaign_scoped(monkeypatch):
    ownership_calls = []
    updates = []
    deletes = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Collection:
        async def update_one(self, query, update):
            updates.append((query, update))
            return Result(matched_count=1)

        async def delete_one(self, query):
            deletes.append(query)
            return Result(deleted_count=1)

    monkeypatch.setattr(creatures, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(creatures, 'db', SimpleNamespace(custom_creatures=Collection()))

    update_result = asyncio.run(creatures.update_custom_creature(
        'campaign-a', 'creature-1', creature_payload('Updated Drake'), username='gm-a'
    ))
    delete_result = asyncio.run(creatures.delete_custom_creature(
        'campaign-a', 'creature-1', username='gm-a'
    ))

    assert ownership_calls == [('campaign-a', 'gm-a'), ('campaign-a', 'gm-a')]
    assert updates[0][0] == {'id': 'creature-1', 'campaign_id': 'campaign-a'}
    assert updates[0][1]['$set']['name'] == 'Updated Drake'
    assert deletes == [{'id': 'creature-1', 'campaign_id': 'campaign-a'}]
    assert update_result == {'message': 'Creature updated!'}
    assert delete_result == {'message': 'Creature deleted!'}


def test_import_verifies_owner_before_any_insert(monkeypatch):
    inserts = []

    async def verify(campaign_id, username):
        assert (campaign_id, username) == ('campaign-a', 'gm-a')

    class Collection:
        async def insert_one(self, doc):
            inserts.append(dict(doc))

    monkeypatch.setattr(creatures, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(creatures, 'db', SimpleNamespace(custom_creatures=Collection()))

    result = asyncio.run(creatures.import_custom_creatures(
        'campaign-a',
        [creature_payload('One'), creature_payload('Two')],
        username='gm-a',
    ))

    assert [doc['name'] for doc in inserts] == ['One', 'Two']
    assert all(doc['campaign_id'] == 'campaign-a' for doc in inserts)
    assert all(doc['created_by'] == 'gm-a' for doc in inserts)
    assert result == {'message': 'Imported 2 creatures!', 'imported': ['One', 'Two']}

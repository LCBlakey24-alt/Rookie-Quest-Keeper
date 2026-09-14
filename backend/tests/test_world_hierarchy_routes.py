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
    path = BACKEND_ROOT / 'routes' / 'world_hierarchy.py'
    spec = importlib.util.spec_from_file_location('focused_world_hierarchy_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


world_module = load_module()


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

    async def to_list(self, limit):
        return [dict(row) for row in self.rows[:limit]]


def test_remove_legacy_hierarchy_keeps_unrelated_world_routes():
    router = SimpleNamespace(routes=[
        FakeRoute('/campaigns/{campaign_id}/world', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/world/region/{region_id}', {'PUT'}),
        FakeRoute('/campaigns/{campaign_id}/world/place/{place_id}', {'DELETE'}),
        FakeRoute('/campaigns/{campaign_id}/gods', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/locations', {'POST'}),
    ])

    removed = world_module.remove_legacy_world_hierarchy_routes(router)

    assert removed == 3
    assert [(route.path, route.methods) for route in router.routes] == [
        ('/campaigns/{campaign_id}/gods', {'GET'}),
        ('/campaigns/{campaign_id}/locations', {'POST'}),
    ]


def test_focused_router_registers_each_hierarchy_route_once():
    actual = []
    for route in world_module.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            if (method, getattr(route, 'path', '')) in world_module.HIERARCHY_ROUTE_KEYS:
                actual.append((method, route.path))

    assert len(actual) == len(world_module.HIERARCHY_ROUTE_KEYS)
    assert set(actual) == world_module.HIERARCHY_ROUTE_KEYS


def test_parent_validation_is_campaign_scoped(monkeypatch):
    queries = []

    class Parents:
        async def find_one(self, query, projection=None):
            queries.append(query)
            return None

    with pytest.raises(HTTPException) as exc:
        asyncio.run(world_module._require_parent(
            Parents(), campaign_id='campaign-a', parent_id='parent-1', label='Region'
        ))

    assert exc.value.status_code == 404
    assert queries == [{'id': 'parent-1', 'campaign_id': 'campaign-a'}]


def test_update_region_verifies_owner_and_scopes_write(monkeypatch):
    ownership_calls = []
    update_calls = []
    find_calls = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Regions:
        async def update_one(self, query, update):
            update_calls.append((query, update))
            return Result(matched_count=1)

        async def find_one(self, query, projection=None):
            find_calls.append((query, projection))
            return {'id': 'region-1', 'campaign_id': 'campaign-a', 'name': 'Updated'}

    monkeypatch.setattr(world_module, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world_module, 'db', SimpleNamespace(world_regions=Regions()))

    result = asyncio.run(world_module.update_region(
        'campaign-a', 'region-1', {'name': 'Updated'}, username='gm-a'
    ))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert update_calls[0][0] == {'id': 'region-1', 'campaign_id': 'campaign-a'}
    assert find_calls[0][0] == {'id': 'region-1', 'campaign_id': 'campaign-a'}
    assert result['name'] == 'Updated'


def test_create_settlement_rejects_parent_from_another_campaign(monkeypatch):
    ownership_calls = []
    parent_queries = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Regions:
        async def find_one(self, query, projection=None):
            parent_queries.append(query)
            return None

    class Settlements:
        async def insert_one(self, doc):
            pytest.fail('Settlement must not be inserted when parent is invalid')

    monkeypatch.setattr(world_module, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(
        world_module,
        'db',
        SimpleNamespace(world_regions=Regions(), world_settlements=Settlements()),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(world_module.create_settlement(
            'campaign-a', {'parent_id': 'region-from-b', 'name': 'Wrong Town'}, username='gm-a'
        ))

    assert exc.value.status_code == 404
    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert parent_queries == [{'id': 'region-from-b', 'campaign_id': 'campaign-a'}]


def test_delete_world_place_verifies_owner_and_scopes_delete(monkeypatch):
    ownership_calls = []
    delete_calls = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Places:
        async def delete_one(self, query):
            delete_calls.append(query)
            return Result(deleted_count=1)

    monkeypatch.setattr(world_module, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world_module, 'db', SimpleNamespace(world_places=Places()))

    result = asyncio.run(world_module.delete_world_place(
        'campaign-a', 'place-1', username='gm-a'
    ))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert delete_calls == [{'id': 'place-1', 'campaign_id': 'campaign-a'}]
    assert result == {'message': 'Place deleted'}


def test_get_world_tree_never_reads_children_outside_campaign(monkeypatch):
    ownership_calls = []
    calls = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Collection:
        def __init__(self, name, rows_by_parent=None, roots=None):
            self.name = name
            self.rows_by_parent = rows_by_parent or {}
            self.roots = roots or []

        def find(self, query, projection=None):
            calls.append((self.name, dict(query)))
            assert query.get('campaign_id') == 'campaign-a'
            if 'parent_id' in query:
                rows = self.rows_by_parent.get(query['parent_id'], [])
            else:
                rows = self.roots
            return Cursor(rows)

    continents = Collection('continents', roots=[{'id': 'continent-1', 'campaign_id': 'campaign-a'}])
    regions = Collection('regions', rows_by_parent={
        'continent-1': [{'id': 'region-1', 'campaign_id': 'campaign-a', 'parent_id': 'continent-1'}]
    })
    settlements = Collection('settlements', rows_by_parent={
        'region-1': [{'id': 'settlement-1', 'campaign_id': 'campaign-a', 'parent_id': 'region-1'}]
    })
    places = Collection('places', rows_by_parent={
        'settlement-1': [{'id': 'place-1', 'campaign_id': 'campaign-a', 'parent_id': 'settlement-1'}]
    })

    monkeypatch.setattr(world_module, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world_module, 'db', SimpleNamespace(
        world_continents=continents,
        world_regions=regions,
        world_settlements=settlements,
        world_places=places,
    ))

    result = asyncio.run(world_module.get_world_data('campaign-a', username='gm-a'))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert result['continents'][0]['regions'][0]['settlements'][0]['places'][0]['id'] == 'place-1'
    assert all(query.get('campaign_id') == 'campaign-a' for _, query in calls)


def test_delete_continent_cascade_is_campaign_scoped(monkeypatch):
    ownership_calls = []
    destructive_calls = []

    async def verify(campaign_id, username):
        ownership_calls.append((campaign_id, username))

    class Continents:
        async def find_one(self, query, projection=None):
            assert query == {'id': 'continent-1', 'campaign_id': 'campaign-a'}
            return {'id': 'continent-1', 'campaign_id': 'campaign-a'}

        async def delete_one(self, query):
            destructive_calls.append(('continents', dict(query)))
            return Result(deleted_count=1)

    class Regions:
        def find(self, query, projection=None):
            assert query == {'campaign_id': 'campaign-a', 'parent_id': 'continent-1'}
            return Cursor([{'id': 'region-1'}])

        async def delete_many(self, query):
            destructive_calls.append(('regions', dict(query)))

    class Settlements:
        def find(self, query, projection=None):
            assert query == {'campaign_id': 'campaign-a', 'parent_id': 'region-1'}
            return Cursor([{'id': 'settlement-1'}])

        async def delete_many(self, query):
            destructive_calls.append(('settlements', dict(query)))

    class Places:
        async def delete_many(self, query):
            destructive_calls.append(('places', dict(query)))

    monkeypatch.setattr(world_module, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world_module, 'db', SimpleNamespace(
        world_continents=Continents(),
        world_regions=Regions(),
        world_settlements=Settlements(),
        world_places=Places(),
    ))

    result = asyncio.run(world_module.delete_continent(
        'campaign-a', 'continent-1', username='gm-a'
    ))

    assert ownership_calls == [('campaign-a', 'gm-a')]
    assert result == {'message': 'Continent deleted'}
    assert destructive_calls == [
        ('places', {'campaign_id': 'campaign-a', 'parent_id': 'settlement-1'}),
        ('settlements', {'campaign_id': 'campaign-a', 'parent_id': 'region-1'}),
        ('regions', {'campaign_id': 'campaign-a', 'parent_id': 'continent-1'}),
        ('continents', {'id': 'continent-1', 'campaign_id': 'campaign-a'}),
    ]

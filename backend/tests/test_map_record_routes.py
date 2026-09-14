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
    path = BACKEND_ROOT / 'routes' / 'map_records.py'
    spec = importlib.util.spec_from_file_location('focused_map_records_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


maps = load_module()


class FakeRoute:
    def __init__(self, path, methods):
        self.path = path
        self.methods = set(methods)


class Result:
    def __init__(self, matched_count=1):
        self.matched_count = matched_count


class Payload:
    def __init__(self, values):
        self.values = values

    def model_dump(self):
        return dict(self.values)


def test_remove_legacy_record_routes_preserves_map_reads_deletes_and_nested_routes():
    focused = [FakeRoute(path, {method}) for method, path in maps.MAP_RECORD_ROUTE_KEYS]
    router = SimpleNamespace(routes=[
        *focused,
        FakeRoute('/campaigns/{campaign_id}/maps', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/maps/{map_id}', {'DELETE'}),
        FakeRoute('/campaigns/{campaign_id}/world-maps/{map_id}', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/local-maps/{map_id}', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/world-maps/{map_id}/pins', {'POST'}),
    ])

    removed = maps.remove_legacy_map_record_routes(router)

    assert removed == len(maps.MAP_RECORD_ROUTE_KEYS)
    remaining = {(next(iter(route.methods)), route.path) for route in router.routes}
    assert ('GET', '/campaigns/{campaign_id}/maps') in remaining
    assert ('DELETE', '/campaigns/{campaign_id}/maps/{map_id}') in remaining
    assert ('GET', '/campaigns/{campaign_id}/world-maps/{map_id}') in remaining
    assert ('GET', '/campaigns/{campaign_id}/local-maps/{map_id}') in remaining
    assert ('POST', '/campaigns/{campaign_id}/world-maps/{map_id}/pins') in remaining


def test_focused_router_registers_all_four_routes_once():
    actual = []
    for route in maps.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            key = (method, getattr(route, 'path', ''))
            if key in maps.MAP_RECORD_ROUTE_KEYS:
                actual.append(key)

    assert set(actual) == maps.MAP_RECORD_ROUTE_KEYS
    assert len(actual) == 4


def test_ownership_failure_stops_local_map_location_lookup(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        async def find_one(self, *args, **kwargs):
            pytest.fail('Location collection must not be touched before ownership succeeds')

    monkeypatch.setattr(maps, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(locations=NeverTouch()))

    data = SimpleNamespace(
        location_id='location-1', name='Town', map_type='city', image_data='', notes=''
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.create_local_map_record('campaign-a', data, username='outsider'))
    assert exc.value.status_code == 404


def test_local_map_requires_location_from_same_campaign_before_insert(monkeypatch):
    queries = []

    async def verify(campaign_id, username):
        return None

    class Locations:
        async def find_one(self, query, projection=None):
            queries.append((query, projection))
            return None

    class NeverInsert:
        async def insert_one(self, *args, **kwargs):
            pytest.fail('Invalid local-map location must fail before insert')

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(locations=Locations(), local_maps=NeverInsert()))

    data = SimpleNamespace(
        location_id='location-from-b', name='Town', map_type='city', image_data='', notes=''
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.create_local_map_record('campaign-a', data, username='gm-a'))

    assert exc.value.status_code == 422
    assert queries == [(
        {'id': 'location-from-b', 'campaign_id': 'campaign-a'},
        {'_id': 0, 'id': 1},
    )]


def test_local_map_persists_exact_validated_location_id(monkeypatch):
    inserts = []

    async def verify(campaign_id, username):
        return None

    class Locations:
        async def find_one(self, query, projection=None):
            assert query == {'id': 'location-1', 'campaign_id': 'campaign-a'}
            return {'id': 'location-1'}

    class LocalMaps:
        async def insert_one(self, doc):
            inserts.append(dict(doc))
            return SimpleNamespace(inserted_id='mongo-id')

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(locations=Locations(), local_maps=LocalMaps()))

    data = SimpleNamespace(
        location_id='  location-1  ', name='Town', map_type='city', image_data='', notes='notes'
    )
    result = asyncio.run(maps.create_local_map_record('campaign-a', data, username='gm-a'))

    assert inserts[0]['campaign_id'] == 'campaign-a'
    assert inserts[0]['location_id'] == 'location-1'
    assert result['location_id'] == 'location-1'
    assert result['campaign_id'] == 'campaign-a'


def test_game_map_update_write_and_response_read_are_campaign_scoped(monkeypatch):
    writes = []
    reads = []

    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            return {'id': 'map-1', 'campaign_id': 'campaign-a', 'name': 'Updated'}

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(maps=Collection()))

    result = asyncio.run(maps.update_game_map(
        'campaign-a', 'map-1', Payload({'name': 'Updated', 'width': None}), username='gm-a'
    ))

    assert writes == [(
        {'id': 'map-1', 'campaign_id': 'campaign-a'},
        {'$set': {'name': 'Updated'}},
    )]
    assert reads == [(
        {'id': 'map-1', 'campaign_id': 'campaign-a'},
        {'_id': 0},
    )]
    assert result['name'] == 'Updated'


def test_world_map_update_write_and_response_read_are_campaign_scoped(monkeypatch):
    writes = []
    reads = []

    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            return {'id': 'world-1', 'campaign_id': 'campaign-a', 'name': 'World'}

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=Collection()))

    result = asyncio.run(maps.update_world_map_record(
        'campaign-a', 'world-1', Payload({'name': 'World', 'notes': None}), username='gm-a'
    ))

    assert writes[0][0] == {'id': 'world-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1]['$set']['name'] == 'World'
    assert 'notes' not in writes[0][1]['$set']
    assert 'updated_at' in writes[0][1]['$set']
    assert reads == [(
        {'id': 'world-1', 'campaign_id': 'campaign-a'},
        {'_id': 0},
    )]
    assert result['name'] == 'World'


def test_local_map_update_write_and_response_read_are_campaign_scoped(monkeypatch):
    writes = []
    reads = []

    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            return {'id': 'local-1', 'campaign_id': 'campaign-a', 'name': 'Local'}

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(local_maps=Collection()))

    result = asyncio.run(maps.update_local_map_record(
        'campaign-a', 'local-1', Payload({'name': 'Local', 'pins': None}), username='gm-a'
    ))

    assert writes[0][0] == {'id': 'local-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1]['$set']['name'] == 'Local'
    assert 'pins' not in writes[0][1]['$set']
    assert 'updated_at' in writes[0][1]['$set']
    assert reads == [(
        {'id': 'local-1', 'campaign_id': 'campaign-a'},
        {'_id': 0},
    )]
    assert result['name'] == 'Local'


def test_matched_write_with_missing_scoped_response_is_not_returned(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            return Result(1)

        async def find_one(self, query, projection=None):
            return None

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=Collection()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.update_world_map_record(
            'campaign-a', 'world-1', Payload({'name': 'Updated'}), username='gm-a'
        ))
    assert exc.value.status_code == 404

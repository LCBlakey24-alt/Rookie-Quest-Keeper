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
    path = BACKEND_ROOT / 'routes' / 'world_record_updates.py'
    spec = importlib.util.spec_from_file_location('focused_world_record_updates_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


world = load_module()


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


def test_remove_legacy_world_record_updates_preserves_other_world_routes():
    focused = [FakeRoute(path, {method}) for method, path in world.WORLD_RECORD_UPDATE_ROUTE_KEYS]
    router = SimpleNamespace(routes=[
        *focused,
        FakeRoute('/campaigns/{campaign_id}/gods', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/calendar', {'PUT'}),
        FakeRoute('/campaigns/{campaign_id}/locations', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/locations/{location_id}/places', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/world', {'GET'}),
    ])

    removed = world.remove_legacy_world_record_update_routes(router)

    assert removed == len(world.WORLD_RECORD_UPDATE_ROUTE_KEYS)
    remaining = {(next(iter(route.methods)), route.path) for route in router.routes}
    assert ('GET', '/campaigns/{campaign_id}/gods') in remaining
    assert ('PUT', '/campaigns/{campaign_id}/calendar') in remaining
    assert ('GET', '/campaigns/{campaign_id}/locations') in remaining
    assert ('POST', '/campaigns/{campaign_id}/locations/{location_id}/places') in remaining
    assert ('GET', '/campaigns/{campaign_id}/world') in remaining


def test_focused_router_registers_all_three_routes_once():
    actual = []
    for route in world.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            key = (method, getattr(route, 'path', ''))
            if key in world.WORLD_RECORD_UPDATE_ROUTE_KEYS:
                actual.append(key)

    assert set(actual) == world.WORLD_RECORD_UPDATE_ROUTE_KEYS
    assert len(actual) == 3


def test_ownership_failure_stops_world_record_write(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Collection must not be touched before ownership succeeds')

    monkeypatch.setattr(world, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(world, 'db', SimpleNamespace(gods=NeverTouch()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(world.update_god_record(
            'campaign-a', 'god-1', Payload({'name': 'Nope'}), username='outsider'
        ))
    assert exc.value.status_code == 404


def test_scoped_update_uses_campaign_for_write_and_response_read():
    writes = []
    reads = []

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            return {'id': 'record-1', 'campaign_id': 'campaign-a', 'name': 'Updated'}

    result = asyncio.run(world._scoped_update(
        Collection(),
        campaign_id='campaign-a',
        record_id='record-1',
        update_dict={'name': 'Updated'},
        not_found='Record not found',
    ))

    assert writes == [(
        {'id': 'record-1', 'campaign_id': 'campaign-a'},
        {'$set': {'name': 'Updated'}},
    )]
    assert reads == [(
        {'id': 'record-1', 'campaign_id': 'campaign-a'},
        {'_id': 0},
    )]
    assert result['name'] == 'Updated'


def test_scoped_update_404s_when_write_does_not_match():
    class Collection:
        async def update_one(self, query, update):
            return Result(0)

        async def find_one(self, *args, **kwargs):
            pytest.fail('No response read should happen after an unmatched write')

    with pytest.raises(HTTPException) as exc:
        asyncio.run(world._scoped_update(
            Collection(),
            campaign_id='campaign-a',
            record_id='missing',
            update_dict={'name': 'Updated'},
            not_found='Record not found',
        ))
    assert exc.value.status_code == 404


def test_scoped_update_404s_if_scoped_response_disappears():
    class Collection:
        async def update_one(self, query, update):
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'record-1', 'campaign_id': 'campaign-a'}
            return None

    with pytest.raises(HTTPException) as exc:
        asyncio.run(world._scoped_update(
            Collection(),
            campaign_id='campaign-a',
            record_id='record-1',
            update_dict={'name': 'Updated'},
            not_found='Record not found',
        ))
    assert exc.value.status_code == 404


def test_god_update_filters_none_and_returns_campaign_scoped_record(monkeypatch):
    writes = []
    reads = []

    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

        async def find_one(self, query, projection=None):
            reads.append(query)
            return {'id': 'god-1', 'campaign_id': 'campaign-a', 'name': 'Akara'}

    monkeypatch.setattr(world, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world, 'db', SimpleNamespace(gods=Collection()))

    result = asyncio.run(world.update_god_record(
        'campaign-a', 'god-1', Payload({'name': 'Akara', 'domain': None}), username='gm-a'
    ))

    assert writes[0][0] == {'id': 'god-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1] == {'$set': {'name': 'Akara'}}
    assert reads == [{'id': 'god-1', 'campaign_id': 'campaign-a'}]
    assert result['name'] == 'Akara'


def test_calendar_event_update_is_campaign_scoped(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            assert query == {'id': 'event-1', 'campaign_id': 'campaign-a'}
            assert update == {'$set': {'name': 'Court of Crowns'}}
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'event-1', 'campaign_id': 'campaign-a'}
            return {'id': 'event-1', 'campaign_id': 'campaign-a', 'name': 'Court of Crowns'}

    monkeypatch.setattr(world, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world, 'db', SimpleNamespace(calendar_events=Collection()))

    result = asyncio.run(world.update_calendar_event_record(
        'campaign-a', 'event-1', Payload({'name': 'Court of Crowns', 'notes': None}), username='gm-a'
    ))
    assert result['campaign_id'] == 'campaign-a'


def test_location_update_is_campaign_scoped(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            assert query == {'id': 'location-1', 'campaign_id': 'campaign-a'}
            assert update == {'$set': {'name': 'Baldering'}}
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'location-1', 'campaign_id': 'campaign-a'}
            return {'id': 'location-1', 'campaign_id': 'campaign-a', 'name': 'Baldering'}

    monkeypatch.setattr(world, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(world, 'db', SimpleNamespace(locations=Collection()))

    result = asyncio.run(world.update_location_record(
        'campaign-a', 'location-1', Payload({'name': 'Baldering', 'notes': None}), username='gm-a'
    ))
    assert result['name'] == 'Baldering'

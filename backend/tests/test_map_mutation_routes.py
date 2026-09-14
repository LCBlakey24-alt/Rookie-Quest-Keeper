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
    path = BACKEND_ROOT / 'routes' / 'map_mutations.py'
    spec = importlib.util.spec_from_file_location('focused_map_mutations_test_module', path)
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


def test_remove_legacy_nested_routes_keeps_top_level_map_handlers():
    nested = [FakeRoute(path, {method}) for method, path in maps.MAP_MUTATION_ROUTE_KEYS]
    router = SimpleNamespace(routes=[
        *nested,
        FakeRoute('/campaigns/{campaign_id}/world-maps', {'GET'}),
        FakeRoute('/campaigns/{campaign_id}/world-maps/{map_id}', {'PUT'}),
        FakeRoute('/campaigns/{campaign_id}/local-maps', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/maps', {'GET'}),
    ])

    removed = maps.remove_legacy_map_mutation_routes(router)

    assert removed == len(maps.MAP_MUTATION_ROUTE_KEYS)
    assert [(route.path, route.methods) for route in router.routes] == [
        ('/campaigns/{campaign_id}/world-maps', {'GET'}),
        ('/campaigns/{campaign_id}/world-maps/{map_id}', {'PUT'}),
        ('/campaigns/{campaign_id}/local-maps', {'POST'}),
        ('/campaigns/{campaign_id}/maps', {'GET'}),
    ]


def test_focused_router_registers_all_nine_routes_once():
    actual = []
    for route in maps.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            key = (method, getattr(route, 'path', ''))
            if key in maps.MAP_MUTATION_ROUTE_KEYS:
                actual.append(key)

    assert set(actual) == maps.MAP_MUTATION_ROUTE_KEYS
    assert len(actual) == 9


def test_allowed_fields_reject_ids_campaign_and_mongo_shaped_keys():
    result = maps._allowed(
        {
            'name': 'Safe',
            'x': 20,
            'id': 'replacement',
            'campaign_id': 'campaign-b',
            '$set': {'bad': True},
            'nested.weird': 'bad',
        },
        maps.WORLD_PIN_FIELDS,
    )

    assert result == {'name': 'Safe', 'x': 20}


def test_ownership_failure_stops_world_pin_write(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Map collection must not be touched before ownership succeeds')

    monkeypatch.setattr(maps, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=NeverTouch()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.add_world_map_pin(
            'campaign-b', 'map-1', {'name': 'Nope'}, username='outsider'
        ))
    assert exc.value.status_code == 404


def test_add_world_pin_is_atomic_and_campaign_scoped(monkeypatch):
    ownership = []
    writes = []

    async def verify(campaign_id, username):
        ownership.append((campaign_id, username))

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=Collection()))

    result = asyncio.run(maps.add_world_map_pin(
        'campaign-a', 'map-1', {'name': 'Harbour', 'x': 12, 'y': 34}, username='gm-a'
    ))

    assert ownership == [('campaign-a', 'gm-a')]
    query, update = writes[0]
    assert query == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert update['$push']['pins']['name'] == 'Harbour'
    assert update['$push']['pins']['x'] == 12
    assert '$set' in update and 'updated_at' in update['$set']
    assert result['id'] == update['$push']['pins']['id']


def test_update_world_pin_uses_positional_set_and_scoped_response_read(monkeypatch):
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
            return {'pins': [{'id': 'pin-1', 'name': 'Updated', 'x': 8}]}

    collection = Collection()
    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=collection))

    result = asyncio.run(maps.update_world_map_pin(
        'campaign-a',
        'map-1',
        'pin-1',
        {'name': 'Updated', 'x': 8, 'id': 'evil', 'campaign_id': 'campaign-b', '$bad': True},
        username='gm-a',
    ))

    query, update = writes[0]
    assert query == {'id': 'map-1', 'campaign_id': 'campaign-a', 'pins.id': 'pin-1'}
    assert update['$set']['pins.$.name'] == 'Updated'
    assert update['$set']['pins.$.x'] == 8
    assert 'pins.$.id' not in update['$set']
    assert 'pins.$.campaign_id' not in update['$set']
    assert all('$bad' not in key for key in update['$set'])
    assert reads[0][0] == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert result == {'id': 'pin-1', 'name': 'Updated', 'x': 8}


def test_delete_world_pin_atomically_removes_connected_paths(monkeypatch):
    writes = []

    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=Collection()))

    result = asyncio.run(maps.delete_world_map_pin(
        'campaign-a', 'map-1', 'pin-1', username='gm-a'
    ))

    query, update = writes[0]
    assert query == {'id': 'map-1', 'campaign_id': 'campaign-a', 'pins.id': 'pin-1'}
    assert update['$pull']['pins'] == {'id': 'pin-1'}
    assert update['$pull']['paths'] == {
        '$or': [{'from_pin_id': 'pin-1'}, {'to_pin_id': 'pin-1'}]
    }
    assert result == {'message': 'Pin deleted'}


def test_world_path_add_update_delete_are_atomic_scoped_and_validate_endpoints(monkeypatch):
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
            return {
                'pins': [{'id': 'a'}, {'id': 'b'}],
                'paths': [{'id': 'path-1', 'from_pin_id': 'a', 'to_pin_id': 'b', 'notes': 'Updated road'}],
            }

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=Collection()))

    added = asyncio.run(maps.add_world_map_path(
        'campaign-a', 'map-1', {'from_pin_id': 'a', 'to_pin_id': 'b'}, username='gm-a'
    ))
    updated = asyncio.run(maps.update_world_map_path(
        'campaign-a', 'map-1', 'path-1', {'notes': 'Updated road', 'id': 'nope'}, username='gm-a'
    ))
    deleted = asyncio.run(maps.delete_world_map_path(
        'campaign-a', 'map-1', 'path-1', username='gm-a'
    ))

    assert reads[0][0] == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert reads[0][1] == {'_id': 0, 'pins': 1, 'paths': 1}
    assert writes[0][0] == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1]['$push']['paths']['from_pin_id'] == 'a'
    assert added['to_pin_id'] == 'b'

    assert writes[1][0] == {'id': 'map-1', 'campaign_id': 'campaign-a', 'paths.id': 'path-1'}
    assert writes[1][1]['$set']['paths.$.notes'] == 'Updated road'
    assert 'paths.$.id' not in writes[1][1]['$set']
    assert reads[1][0] == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert updated['id'] == 'path-1'
    assert updated['notes'] == 'Updated road'

    assert writes[2][0] == {'id': 'map-1', 'campaign_id': 'campaign-a', 'paths.id': 'path-1'}
    assert writes[2][1]['$pull']['paths'] == {'id': 'path-1'}
    assert deleted == {'message': 'Path deleted'}


def test_local_pin_add_update_delete_are_atomic_and_campaign_scoped(monkeypatch):
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
            return {'pins': [{'id': 'pin-1', 'name': 'Smithy'}]}

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(local_maps=Collection()))

    added = asyncio.run(maps.add_local_map_pin(
        'campaign-a', 'local-1', {'name': 'Smithy'}, username='gm-a'
    ))
    updated = asyncio.run(maps.update_local_map_pin(
        'campaign-a', 'local-1', 'pin-1', {'name': 'Smithy', 'linked_location_id': 'not-allowed'}, username='gm-a'
    ))
    deleted = asyncio.run(maps.delete_local_map_pin(
        'campaign-a', 'local-1', 'pin-1', username='gm-a'
    ))

    assert writes[0][0] == {'id': 'local-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1]['$push']['pins']['name'] == 'Smithy'
    assert added['name'] == 'Smithy'

    assert writes[1][0] == {'id': 'local-1', 'campaign_id': 'campaign-a', 'pins.id': 'pin-1'}
    assert writes[1][1]['$set']['pins.$.name'] == 'Smithy'
    assert 'pins.$.linked_location_id' not in writes[1][1]['$set']
    assert reads[0][0] == {'id': 'local-1', 'campaign_id': 'campaign-a'}
    assert updated == {'id': 'pin-1', 'name': 'Smithy'}

    assert writes[2][0] == {'id': 'local-1', 'campaign_id': 'campaign-a', 'pins.id': 'pin-1'}
    assert writes[2][1]['$pull']['pins'] == {'id': 'pin-1'}
    assert deleted == {'message': 'Pin deleted'}


def test_empty_or_unsupported_nested_update_is_rejected(monkeypatch):
    async def verify(campaign_id, username):
        return None

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.update_world_map_pin(
            'campaign-a', 'map-1', 'pin-1', {'id': 'only-disallowed'}, username='gm-a'
        ))
    assert exc.value.status_code == 400


def test_linked_location_must_belong_to_same_campaign(monkeypatch):
    location_queries = []

    class Locations:
        async def find_one(self, query, projection=None):
            location_queries.append(query)
            return None

    class NeverWrite:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Invalid linked location must fail before map mutation')

    async def verify(campaign_id, username):
        return None

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(
        locations=Locations(),
        world_maps=NeverWrite(),
    ))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.add_world_map_pin(
            'campaign-a', 'map-1', {'linked_location_id': 'location-from-b'}, username='gm-a'
        ))

    assert exc.value.status_code == 422
    assert location_queries == [{'id': 'location-from-b', 'campaign_id': 'campaign-a'}]


def test_linked_place_accepts_embedded_or_hierarchy_place_in_campaign(monkeypatch):
    location_queries = []
    hierarchy_queries = []

    class Locations:
        async def find_one(self, query, projection=None):
            location_queries.append(query)
            return None

    class WorldPlaces:
        async def find_one(self, query, projection=None):
            hierarchy_queries.append(query)
            return {'id': 'place-1'}

    monkeypatch.setattr(maps, 'db', SimpleNamespace(
        locations=Locations(),
        world_places=WorldPlaces(),
    ))

    asyncio.run(maps._validate_pin_links('campaign-a', linked_place_id='place-1'))

    assert location_queries == [{
        'campaign_id': 'campaign-a',
        'places_of_interest.id': 'place-1',
    }]
    assert hierarchy_queries == [{'id': 'place-1', 'campaign_id': 'campaign-a'}]


def test_missing_or_self_referential_path_endpoints_are_rejected(monkeypatch):
    writes = []

    async def verify(campaign_id, username):
        return None

    class WorldMaps:
        async def find_one(self, query, projection=None):
            return {'pins': [{'id': 'a'}, {'id': 'b'}], 'paths': []}

        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=WorldMaps()))

    with pytest.raises(HTTPException) as missing:
        asyncio.run(maps.add_world_map_path(
            'campaign-a', 'map-1', {'from_pin_id': 'a', 'to_pin_id': 'missing'}, username='gm-a'
        ))
    assert missing.value.status_code == 422

    with pytest.raises(HTTPException) as self_loop:
        asyncio.run(maps.add_world_map_path(
            'campaign-a', 'map-1', {'from_pin_id': 'a', 'to_pin_id': 'a'}, username='gm-a'
        ))
    assert self_loop.value.status_code == 422
    assert writes == []


def test_one_sided_path_endpoint_edit_validates_against_existing_other_endpoint(monkeypatch):
    writes = []
    reads = []

    async def verify(campaign_id, username):
        return None

    class WorldMaps:
        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            if projection == {'_id': 0, 'pins': 1, 'paths': 1}:
                return {
                    'pins': [{'id': 'a'}, {'id': 'b'}, {'id': 'c'}],
                    'paths': [{'id': 'path-1', 'from_pin_id': 'a', 'to_pin_id': 'b'}],
                }
            return {'paths': [{'id': 'path-1', 'from_pin_id': 'c', 'to_pin_id': 'b'}]}

        async def update_one(self, query, update):
            writes.append((query, update))
            return Result(1)

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(world_maps=WorldMaps()))

    result = asyncio.run(maps.update_world_map_path(
        'campaign-a', 'map-1', 'path-1', {'from_pin_id': 'c'}, username='gm-a'
    ))

    assert writes[0][0] == {'id': 'map-1', 'campaign_id': 'campaign-a', 'paths.id': 'path-1'}
    assert writes[0][1]['$set']['paths.$.from_pin_id'] == 'c'
    assert 'paths.$.to_pin_id' not in writes[0][1]['$set']
    assert reads[0][0] == {'id': 'map-1', 'campaign_id': 'campaign-a'}
    assert result['from_pin_id'] == 'c'
    assert result['to_pin_id'] == 'b'


def test_local_linked_place_must_exist_in_campaign(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Locations:
        async def find_one(self, query, projection=None):
            return None

    class WorldPlaces:
        async def find_one(self, query, projection=None):
            return None

    class NeverWrite:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Invalid local place link must fail before map mutation')

    monkeypatch.setattr(maps, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(maps, 'db', SimpleNamespace(
        locations=Locations(),
        world_places=WorldPlaces(),
        local_maps=NeverWrite(),
    ))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(maps.add_local_map_pin(
            'campaign-a', 'local-1', {'linked_place_id': 'missing'}, username='gm-a'
        ))
    assert exc.value.status_code == 422

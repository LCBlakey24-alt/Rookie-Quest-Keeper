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
    path = BACKEND_ROOT / 'routes' / 'campaign_record_updates.py'
    spec = importlib.util.spec_from_file_location('focused_campaign_record_updates_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


records = load_module()


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


class Nested:
    def __init__(self, **values):
        self.values = values

    def model_dump(self):
        return dict(self.values)


def test_legacy_update_removers_only_remove_target_put_routes():
    npc_target = FakeRoute('/campaigns/{campaign_id}/npcs/{npc_id}', {'PUT'})
    npc_get = FakeRoute('/campaigns/{campaign_id}/npcs', {'GET'})
    player_target = FakeRoute('/campaigns/{campaign_id}/players/{player_id}', {'PUT'})
    player_delete = FakeRoute('/campaigns/{campaign_id}/players/{player_id}', {'DELETE'})
    inventory_target = FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}', {'PUT'})
    inventory_grant = FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}/grant', {'POST'})

    npc_router = SimpleNamespace(routes=[npc_target, npc_get])
    player_router = SimpleNamespace(routes=[player_target, player_delete])
    inventory_router = SimpleNamespace(routes=[inventory_target, inventory_grant])

    assert records.remove_legacy_npc_update_route(npc_router) == 1
    assert records.remove_legacy_player_update_route(player_router) == 1
    assert records.remove_legacy_inventory_update_route(inventory_router) == 1

    assert npc_router.routes == [npc_get]
    assert player_router.routes == [player_delete]
    assert inventory_router.routes == [inventory_grant]


def test_focused_router_registers_all_three_routes_once():
    actual = []
    for route in records.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            key = (method, getattr(route, 'path', ''))
            if key in records.CAMPAIGN_RECORD_UPDATE_ROUTE_KEYS:
                actual.append(key)

    assert set(actual) == records.CAMPAIGN_RECORD_UPDATE_ROUTE_KEYS
    assert len(actual) == 3


def test_ownership_failure_stops_record_collection_access(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Collection must not be touched before ownership succeeds')

    monkeypatch.setattr(records, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(records, 'db', SimpleNamespace(players=NeverTouch()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(records.update_player_record(
            'campaign-a', 'player-1', Payload({'name': 'Nope'}), username='outsider'
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

    result = asyncio.run(records._scoped_update(
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
    assert result['campaign_id'] == 'campaign-a'


def test_scoped_update_404s_on_unmatched_or_missing_scoped_response():
    class Unmatched:
        async def update_one(self, query, update):
            return Result(0)

        async def find_one(self, *args, **kwargs):
            pytest.fail('Unmatched write must not perform a response read')

    with pytest.raises(HTTPException) as unmatched:
        asyncio.run(records._scoped_update(
            Unmatched(), campaign_id='campaign-a', record_id='missing',
            update_dict={'name': 'x'}, not_found='Not found'
        ))
    assert unmatched.value.status_code == 404

    class MissingResponse:
        async def update_one(self, query, update):
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'record-1', 'campaign_id': 'campaign-a'}
            return None

    with pytest.raises(HTTPException) as missing:
        asyncio.run(records._scoped_update(
            MissingResponse(), campaign_id='campaign-a', record_id='record-1',
            update_dict={'name': 'x'}, not_found='Not found'
        ))
    assert missing.value.status_code == 404


def test_npc_serialisation_preserves_nested_stats_attacks_abilities_and_spells():
    payload = Payload({
        'name': 'Captain',
        'notes': None,
        'stats': Nested(strength=16, dexterity=12),
        'attacks': [Nested(name='Longsword', bonus='+5'), {'name': 'Bow', 'bonus': '+3'}],
        'abilities': [Nested(name='Parry', description='Reduce damage')],
        'spells': Nested(casting_ability='Wisdom', spell_save_dc=13),
    })

    update = records._serialise_npc_update(payload)

    assert update['name'] == 'Captain'
    assert 'notes' not in update
    assert update['stats'] == {'strength': 16, 'dexterity': 12}
    assert update['attacks'][0] == {'name': 'Longsword', 'bonus': '+5'}
    assert update['attacks'][1] == {'name': 'Bow', 'bonus': '+3'}
    assert update['abilities'] == [{'name': 'Parry', 'description': 'Reduce damage'}]
    assert update['spells'] == {'casting_ability': 'Wisdom', 'spell_save_dc': 13}


def test_npc_update_returns_only_campaign_scoped_response(monkeypatch):
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
            return {'id': 'npc-1', 'campaign_id': 'campaign-a', 'name': 'Jordan Crow'}

    monkeypatch.setattr(records, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(records, 'db', SimpleNamespace(npcs=Collection()))

    result = asyncio.run(records.update_npc_record(
        'campaign-a', 'npc-1', Payload({'name': 'Jordan Crow', 'notes': None}), username='gm-a'
    ))

    assert writes[0][0] == {'id': 'npc-1', 'campaign_id': 'campaign-a'}
    assert writes[0][1] == {'$set': {'name': 'Jordan Crow'}}
    assert reads == [{'id': 'npc-1', 'campaign_id': 'campaign-a'}]
    assert result['campaign_id'] == 'campaign-a'


def test_player_update_filters_none_and_returns_scoped_response(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            assert query == {'id': 'player-1', 'campaign_id': 'campaign-a'}
            assert update == {'$set': {'name': 'Merithera'}}
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'player-1', 'campaign_id': 'campaign-a'}
            return {'id': 'player-1', 'campaign_id': 'campaign-a', 'name': 'Merithera'}

    monkeypatch.setattr(records, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(records, 'db', SimpleNamespace(players=Collection()))

    result = asyncio.run(records.update_player_record(
        'campaign-a', 'player-1', Payload({'name': 'Merithera', 'notes': None}), username='gm-a'
    ))
    assert result['name'] == 'Merithera'


def test_inventory_update_rejects_empty_payload_before_write(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class NeverTouch:
        async def update_one(self, *args, **kwargs):
            pytest.fail('Empty inventory update must fail before write')

    monkeypatch.setattr(records, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(records, 'db', SimpleNamespace(inventory=NeverTouch()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(records.update_inventory_record(
            'campaign-a', 'item-1', Payload({'name': None, 'notes': None}), current_user='gm-a'
        ))
    assert exc.value.status_code == 400


def test_inventory_update_returns_only_campaign_scoped_response(monkeypatch):
    async def verify(campaign_id, username):
        return None

    class Collection:
        async def update_one(self, query, update):
            assert query == {'id': 'item-1', 'campaign_id': 'campaign-a'}
            assert update == {'$set': {'quantity': 2}}
            return Result(1)

        async def find_one(self, query, projection=None):
            assert query == {'id': 'item-1', 'campaign_id': 'campaign-a'}
            return {'id': 'item-1', 'campaign_id': 'campaign-a', 'quantity': 2}

    monkeypatch.setattr(records, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(records, 'db', SimpleNamespace(inventory=Collection()))

    result = asyncio.run(records.update_inventory_record(
        'campaign-a', 'item-1', Payload({'quantity': 2, 'notes': None}), current_user='gm-a'
    ))
    assert result['quantity'] == 2

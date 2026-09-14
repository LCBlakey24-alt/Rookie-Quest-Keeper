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
    path = BACKEND_ROOT / 'routes' / 'inventory_grants.py'
    spec = importlib.util.spec_from_file_location('focused_inventory_grants_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


grants = load_module()


class FakeRoute:
    def __init__(self, path, methods):
        self.path = path
        self.methods = set(methods)


class UpdateResult:
    def __init__(self, matched_count=1):
        self.matched_count = matched_count


class DeleteResult:
    def __init__(self, deleted_count=1):
        self.deleted_count = deleted_count


def test_remove_legacy_grant_route_preserves_other_inventory_handlers():
    target = FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}/grant', {'POST'})
    get_inventory = FakeRoute('/campaigns/{campaign_id}/inventory', {'GET'})
    update_inventory = FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}', {'PUT'})
    router = SimpleNamespace(routes=[target, get_inventory, update_inventory])

    removed = grants.remove_legacy_inventory_grant_route(router)

    assert removed == 1
    assert router.routes == [get_inventory, update_inventory]


def test_focused_router_registers_grant_route_once():
    matches = []
    for route in grants.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            if (method, getattr(route, 'path', '')) == grants.GRANT_ROUTE_KEY:
                matches.append((method, route.path))
    assert matches == [grants.GRANT_ROUTE_KEY]


def test_ownership_failure_stops_target_and_inventory_access(monkeypatch):
    async def deny(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')

    class NeverTouch:
        async def find_one(self, *args, **kwargs):
            pytest.fail('Collections must not be touched before ownership succeeds')

    monkeypatch.setattr(grants, 'verify_campaign_ownership', deny)
    monkeypatch.setattr(grants, 'db', SimpleNamespace(
        player_characters=NeverTouch(),
        inventory=NeverTouch(),
    ))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants.grant_inventory_item_to_target(
            'campaign-a', 'item-1', {'target_type': 'character', 'target_id': 'char-1'}, current_user='outsider'
        ))
    assert exc.value.status_code == 404


def test_reservation_is_campaign_scoped_atomic_and_has_stale_recovery(monkeypatch):
    writes = []
    reads = []

    class Inventory:
        async def update_one(self, query, update):
            writes.append((query, update))
            return UpdateResult(1)

        async def find_one(self, query, projection=None):
            reads.append((query, projection))
            token = writes[0][1]['$set']['grant_in_progress']['token']
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'name': 'Sword',
                'grant_in_progress': {'token': token},
            }

    monkeypatch.setattr(grants, 'db', SimpleNamespace(inventory=Inventory()))

    item, token = asyncio.run(grants._reserve_inventory_item('campaign-a', 'item-1', 'gm-a'))

    query, update = writes[0]
    assert query['id'] == 'item-1'
    assert query['campaign_id'] == 'campaign-a'
    assert {'grant_in_progress': {'$exists': False}} in query['$or']
    assert {'grant_in_progress': None} in query['$or']
    stale_clause = next(clause for clause in query['$or'] if 'grant_in_progress.started_at' in clause)
    assert '$lt' in stale_clause['grant_in_progress.started_at']
    assert update['$set']['grant_in_progress']['token'] == token
    assert update['$set']['grant_in_progress']['by'] == 'gm-a'
    assert reads[0][0] == {
        'id': 'item-1',
        'campaign_id': 'campaign-a',
        'grant_in_progress.token': token,
    }
    assert item['name'] == 'Sword'


def test_active_reservation_blocks_second_grant(monkeypatch):
    class Inventory:
        async def update_one(self, query, update):
            return UpdateResult(0)

        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'grant_in_progress': {'token': 'other-token', 'by': 'gm-b'},
            }

    monkeypatch.setattr(grants, 'db', SimpleNamespace(inventory=Inventory()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants._reserve_inventory_item('campaign-a', 'item-1', 'gm-a'))
    assert exc.value.status_code == 409
    assert 'already being granted' in exc.value.detail.lower()


def test_missing_item_returns_404_when_reservation_cannot_match(monkeypatch):
    class Inventory:
        async def update_one(self, query, update):
            return UpdateResult(0)

        async def find_one(self, query, projection=None):
            return None

    monkeypatch.setattr(grants, 'db', SimpleNamespace(inventory=Inventory()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants._reserve_inventory_item('campaign-a', 'missing', 'gm-a'))
    assert exc.value.status_code == 404


def test_character_grant_scopes_target_write_and_consumes_reserved_item(monkeypatch):
    inventory_writes = []
    inventory_deletes = []
    character_writes = []
    token_box = {'token': None}

    async def verify(campaign_id, username):
        assert (campaign_id, username) == ('campaign-a', 'gm-a')

    class Characters:
        async def find_one(self, query, projection=None):
            assert query == {'id': 'char-1', 'campaign_id': 'campaign-a'}
            return {'id': 'char-1', 'campaign_id': 'campaign-a', 'name': 'Aria', 'inventory': []}

        async def update_one(self, query, update):
            character_writes.append((query, update))
            return UpdateResult(1)

    class Inventory:
        async def update_one(self, query, update):
            inventory_writes.append((query, update))
            if '$set' in update and 'grant_in_progress' in update['$set']:
                token_box['token'] = update['$set']['grant_in_progress']['token']
            return UpdateResult(1)

        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'name': 'Longsword',
                'quantity': 1,
                'type': 'weapon',
                'grant_in_progress': {'token': token_box['token']},
            }

        async def delete_one(self, query):
            inventory_deletes.append(query)
            return DeleteResult(1)

    monkeypatch.setattr(grants, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(grants, 'db', SimpleNamespace(
        player_characters=Characters(),
        inventory=Inventory(),
    ))

    result = asyncio.run(grants.grant_inventory_item_to_target(
        'campaign-a',
        'item-1',
        {'target_type': 'character', 'target_id': 'char-1'},
        current_user='gm-a',
    ))

    assert character_writes[0][0] == {'id': 'char-1', 'campaign_id': 'campaign-a'}
    assert character_writes[0][1]['$push']['inventory']['name'] == 'Longsword'
    assert inventory_deletes == [{
        'id': 'item-1',
        'campaign_id': 'campaign-a',
        'grant_in_progress.token': token_box['token'],
    }]
    assert result['success'] is True
    assert result['target_name'] == 'Aria'


def test_character_disappearing_after_reservation_releases_item_and_does_not_delete(monkeypatch):
    inventory_updates = []
    inventory_deletes = []
    token_box = {'token': None}

    async def verify(campaign_id, username):
        return None

    class Characters:
        async def find_one(self, query, projection=None):
            return {'id': 'char-1', 'campaign_id': 'campaign-a', 'name': 'Aria'}

        async def update_one(self, query, update):
            assert query == {'id': 'char-1', 'campaign_id': 'campaign-a'}
            return UpdateResult(0)

    class Inventory:
        async def update_one(self, query, update):
            inventory_updates.append((query, update))
            if '$set' in update and 'grant_in_progress' in update['$set']:
                token_box['token'] = update['$set']['grant_in_progress']['token']
            return UpdateResult(1)

        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'name': 'Potion',
                'grant_in_progress': {'token': token_box['token']},
            }

        async def delete_one(self, query):
            inventory_deletes.append(query)
            return DeleteResult(1)

    monkeypatch.setattr(grants, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(grants, 'db', SimpleNamespace(
        player_characters=Characters(),
        inventory=Inventory(),
    ))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants.grant_inventory_item_to_target(
            'campaign-a', 'item-1', {'target_type': 'character', 'target_id': 'char-1'}, current_user='gm-a'
        ))

    assert exc.value.status_code == 409
    assert inventory_deletes == []
    release_query, release_update = inventory_updates[-1]
    assert release_query == {
        'id': 'item-1',
        'campaign_id': 'campaign-a',
        'grant_in_progress.token': token_box['token'],
    }
    assert release_update == {'$unset': {'grant_in_progress': ''}}


def test_npc_grant_uses_campaign_scoped_write_and_response_read(monkeypatch):
    npc_writes = []
    npc_reads = []
    inventory_deletes = []
    token_box = {'token': None}

    async def verify(campaign_id, username):
        return None

    class Npcs:
        async def find_one(self, query, projection=None):
            npc_reads.append((query, projection))
            if len(npc_reads) == 1:
                return {'id': 'npc-1', 'campaign_id': 'campaign-a', 'name': 'Guard', 'inventory': [], 'ac': 12}
            return {'id': 'npc-1', 'campaign_id': 'campaign-a', 'name': 'Guard', 'inventory': [{'name': 'Shield'}]}

        async def update_one(self, query, update):
            npc_writes.append((query, update))
            return UpdateResult(1)

    class Inventory:
        async def update_one(self, query, update):
            token_box['token'] = update['$set']['grant_in_progress']['token']
            return UpdateResult(1)

        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'name': 'Shield',
                'type': 'armor',
                'ac_bonus': 2,
                'grant_in_progress': {'token': token_box['token']},
            }

        async def delete_one(self, query):
            inventory_deletes.append(query)
            return DeleteResult(1)

    monkeypatch.setattr(grants, 'verify_campaign_ownership', verify)
    monkeypatch.setattr(grants, 'db', SimpleNamespace(npcs=Npcs(), inventory=Inventory()))

    result = asyncio.run(grants.grant_inventory_item_to_target(
        'campaign-a',
        'item-1',
        {'target_type': 'npc', 'target_id': 'npc-1', 'auto_equip': True},
        current_user='gm-a',
    ))

    assert npc_writes[0][0] == {'id': 'npc-1', 'campaign_id': 'campaign-a'}
    assert npc_reads[-1][0] == {'id': 'npc-1', 'campaign_id': 'campaign-a'}
    assert inventory_deletes[0]['campaign_id'] == 'campaign-a'
    assert result['success'] is True
    assert result['npc_stat_changes']['ac_bonus_applied'] == 2


def test_consume_fallback_delete_stays_campaign_scoped(monkeypatch):
    deletes = []

    class Inventory:
        async def delete_one(self, query):
            deletes.append(query)
            return DeleteResult(0)

    monkeypatch.setattr(grants, 'db', SimpleNamespace(inventory=Inventory()))

    asyncio.run(grants._consume_reserved_item('campaign-a', 'item-1', 'token-1'))

    assert deletes == [
        {'id': 'item-1', 'campaign_id': 'campaign-a', 'grant_in_progress.token': 'token-1'},
        {'id': 'item-1', 'campaign_id': 'campaign-a'},
    ]

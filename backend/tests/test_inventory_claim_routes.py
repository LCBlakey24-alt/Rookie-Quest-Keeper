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
    path = BACKEND_ROOT / 'routes' / 'inventory_claims.py'
    spec = importlib.util.spec_from_file_location('focused_inventory_claims_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


claims = load_module()


class FakeRoute:
    def __init__(self, path, methods):
        self.path = path
        self.methods = set(methods)


class Result:
    def __init__(self, matched_count=1):
        self.matched_count = matched_count


def test_remove_legacy_claim_routes_keeps_other_inventory_handlers():
    router = SimpleNamespace(routes=[
        FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}/claim', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}/unclaim', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/inventory/{item_id}/grant', {'POST'}),
        FakeRoute('/campaigns/{campaign_id}/inventory', {'GET'}),
    ])

    removed = claims.remove_legacy_inventory_claim_routes(router)

    assert removed == 2
    assert [(route.path, route.methods) for route in router.routes] == [
        ('/campaigns/{campaign_id}/inventory/{item_id}/grant', {'POST'}),
        ('/campaigns/{campaign_id}/inventory', {'GET'}),
    ]


def test_focused_router_registers_claim_and_unclaim_once():
    actual = []
    for route in claims.router.routes:
        for method in getattr(route, 'methods', set()) or set():
            if (method, getattr(route, 'path', '')) in claims.CLAIM_ROUTE_KEYS:
                actual.append((method, route.path))

    assert set(actual) == claims.CLAIM_ROUTE_KEYS
    assert len(actual) == 2


def test_player_claim_target_requires_own_campaign_character(monkeypatch):
    queries = []

    class Characters:
        async def find_one(self, query, projection=None):
            queries.append(query)
            return {'id': 'char-1', 'name': 'Ari', 'user_id': 'player-a', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'db', SimpleNamespace(player_characters=Characters()))

    result = asyncio.run(claims._claim_character(
        campaign={'id': 'campaign-a', 'dm_user_id': 'gm-a'},
        campaign_id='campaign-a',
        character_id='char-1',
        username='player-a',
    ))

    assert result['name'] == 'Ari'
    assert queries == [{
        'id': 'char-1',
        'campaign_id': 'campaign-a',
        'user_id': 'player-a',
    }]


def test_gm_claim_target_may_use_any_character_in_campaign(monkeypatch):
    queries = []

    class Characters:
        async def find_one(self, query, projection=None):
            queries.append(query)
            return {'id': 'char-2', 'name': 'Bryn', 'user_id': 'player-b', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'db', SimpleNamespace(player_characters=Characters()))

    asyncio.run(claims._claim_character(
        campaign={'id': 'campaign-a', 'dm_user_id': 'gm-a'},
        campaign_id='campaign-a',
        character_id='char-2',
        username='gm-a',
    ))

    assert queries == [{'id': 'char-2', 'campaign_id': 'campaign-a'}]


def test_claim_uses_saved_character_name_and_campaign_scoped_atomic_write(monkeypatch):
    membership_calls = []
    item_reads = []
    updates = []

    async def membership(campaign_id, username):
        membership_calls.append((campaign_id, username))
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            item_reads.append(query)
            return {'id': 'item-1', 'campaign_id': 'campaign-a', 'name': 'Sword'}

        async def update_one(self, query, update):
            updates.append((query, update))
            return Result(1)

    class Characters:
        async def find_one(self, query, projection=None):
            assert query == {
                'id': 'char-1',
                'campaign_id': 'campaign-a',
                'user_id': 'player-a',
            }
            return {'id': 'char-1', 'name': 'Saved Name', 'user_id': 'player-a', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(
        inventory=Inventory(),
        player_characters=Characters(),
    ))

    result = asyncio.run(claims.claim_inventory_item(
        'campaign-a',
        'item-1',
        {'character_id': 'char-1', 'character_name': 'Spoofed Name'},
        current_user='player-a',
    ))

    assert membership_calls == [('campaign-a', 'player-a')]
    assert item_reads == [{'id': 'item-1', 'campaign_id': 'campaign-a'}]
    query, update = updates[0]
    assert query['id'] == 'item-1'
    assert query['campaign_id'] == 'campaign-a'
    assert '$or' in query
    assert update['$set']['claimed_by'] == 'Saved Name'
    assert update['$set']['claimed_by_id'] == 'char-1'
    assert result['character_name'] == 'Saved Name'


def test_claim_requires_character_id(monkeypatch):
    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            return {'id': 'item-1', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(inventory=Inventory()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(claims.claim_inventory_item(
            'campaign-a', 'item-1', {}, current_user='player-a'
        ))
    assert exc.value.status_code == 400
    assert 'character_id is required' in exc.value.detail


def test_claim_conflict_does_not_overwrite_new_winner(monkeypatch):
    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            return {'id': 'item-1', 'campaign_id': 'campaign-a'}

        async def update_one(self, query, update):
            return Result(0)

    class Characters:
        async def find_one(self, query, projection=None):
            return {'id': 'char-1', 'name': 'Ari', 'user_id': 'player-a', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(
        inventory=Inventory(),
        player_characters=Characters(),
    ))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(claims.claim_inventory_item(
            'campaign-a', 'item-1', {'character_id': 'char-1'}, current_user='player-a'
        ))
    assert exc.value.status_code == 409


def test_player_unclaim_requires_ownership_of_claimed_character(monkeypatch):
    update_calls = []

    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'claimed_by': 'Ari',
                'claimed_by_id': 'char-1',
            }

        async def update_one(self, query, update):
            update_calls.append((query, update))
            return Result(1)

    class Characters:
        async def find_one(self, query, projection=None):
            assert query == {
                'id': 'char-1',
                'campaign_id': 'campaign-a',
                'user_id': 'player-a',
            }
            return {'id': 'char-1', 'name': 'Ari', 'user_id': 'player-a', 'campaign_id': 'campaign-a'}

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(
        inventory=Inventory(),
        player_characters=Characters(),
    ))

    result = asyncio.run(claims.unclaim_inventory_item(
        'campaign-a', 'item-1', current_user='player-a'
    ))

    query, update = update_calls[0]
    assert query == {
        'id': 'item-1',
        'campaign_id': 'campaign-a',
        'claimed_by_id': 'char-1',
    }
    assert set(update['$unset']) == {'claimed_by', 'claimed_by_id', 'claimed_at'}
    assert result == {'message': 'Item returned to party inventory'}


def test_player_cannot_unclaim_legacy_record_without_character_link(monkeypatch):
    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            return {'id': 'item-1', 'campaign_id': 'campaign-a', 'claimed_by': 'Legacy Name'}

        async def update_one(self, query, update):
            pytest.fail('Unauthorised legacy unclaim must not write')

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(inventory=Inventory()))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(claims.unclaim_inventory_item(
            'campaign-a', 'item-1', current_user='player-a'
        ))
    assert exc.value.status_code == 403


def test_gm_can_unclaim_any_campaign_item_but_write_stays_scoped(monkeypatch):
    update_calls = []

    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': 'gm-a'}

    class Inventory:
        async def find_one(self, query, projection=None):
            return {
                'id': 'item-1',
                'campaign_id': 'campaign-a',
                'claimed_by': 'Ari',
                'claimed_by_id': 'char-1',
            }

        async def update_one(self, query, update):
            update_calls.append((query, update))
            return Result(1)

    monkeypatch.setattr(claims, 'verify_campaign_membership', membership)
    monkeypatch.setattr(claims, 'db', SimpleNamespace(inventory=Inventory()))

    asyncio.run(claims.unclaim_inventory_item(
        'campaign-a', 'item-1', current_user='gm-a'
    ))

    assert update_calls[0][0] == {'id': 'item-1', 'campaign_id': 'campaign-a'}

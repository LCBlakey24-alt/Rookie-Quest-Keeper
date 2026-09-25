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


def load_route(name):
    path = BACKEND_ROOT / 'routes' / f'{name}.py'
    spec = importlib.util.spec_from_file_location(f'{name}_recipient_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


inventory = load_route('inventory')
grants = load_route('inventory_grants')


def matches(row, query):
    return all(row.get(key) == value for key, value in query.items())


class Cursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *_args):
        return self

    async def to_list(self, limit):
        return list(self.rows[:limit])


class Collection:
    def __init__(self, rows=()):
        self.rows = list(rows)

    def find(self, query, _projection=None):
        return Cursor([row for row in self.rows if matches(row, query)])

    async def find_one(self, query, _projection=None):
        return next((row for row in self.rows if matches(row, query)), None)


class NeverReserve:
    async def update_one(self, *_args, **_kwargs):
        pytest.fail('Inactive character must be rejected before reserving inventory')

    async def find_one(self, *_args, **_kwargs):
        pytest.fail('Inactive character must be rejected before reading inventory')


def test_grant_targets_only_offer_active_or_legacy_characters_plus_npcs(monkeypatch):
    async def allow(_campaign_id, _username):
        return None

    fake = SimpleNamespace(
        player_characters=Collection([
            {'id': 'active', 'campaign_id': 'c1', 'user_id': 'active-user', 'name': 'Active Hero'},
            {'id': 'pending', 'campaign_id': 'c1', 'user_id': 'pending-user', 'name': 'Pending Hero'},
            {'id': 'retired', 'campaign_id': 'c1', 'user_id': 'retired-user', 'name': 'Retired Hero'},
            {'id': 'removed', 'campaign_id': 'c1', 'user_id': 'removed-user', 'name': 'Removed Hero'},
            {'id': 'legacy', 'campaign_id': 'c1', 'user_id': 'legacy-user', 'name': 'Legacy Hero'},
        ]),
        campaign_members=Collection([
            {'campaign_id': 'c1', 'user_id': 'active-user', 'character_id': 'active', 'status': 'active'},
            {'campaign_id': 'c1', 'user_id': 'pending-user', 'character_id': 'pending', 'status': 'pending'},
            {'campaign_id': 'c1', 'user_id': 'retired-user', 'character_id': 'retired', 'status': 'retired'},
            {'campaign_id': 'c1', 'user_id': 'removed-user', 'character_id': 'removed', 'status': 'removed'},
        ]),
        npcs=Collection([
            {'id': 'npc-1', 'campaign_id': 'c1', 'name': 'Friendly Guard'},
        ]),
    )
    monkeypatch.setattr(inventory, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(inventory, 'db', fake)

    result = asyncio.run(inventory.get_inventory_grant_targets('c1', current_user='gm'))
    ids = [target['target_id'] for target in result]

    assert ids == ['active', 'legacy', 'npc-1']
    assert [target['target_type'] for target in result] == ['character', 'character', 'npc']


def test_direct_grant_rejects_inactive_member_before_item_reservation(monkeypatch):
    async def allow(_campaign_id, _username):
        return None

    fake = SimpleNamespace(
        player_characters=Collection([
            {'id': 'pending', 'campaign_id': 'c1', 'user_id': 'pending-user', 'name': 'Pending Hero'},
        ]),
        campaign_members=Collection([
            {'campaign_id': 'c1', 'user_id': 'pending-user', 'character_id': 'pending', 'status': 'pending'},
        ]),
        inventory=NeverReserve(),
    )
    monkeypatch.setattr(grants, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(grants, 'db', fake)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants.grant_inventory_item_to_target(
            'c1',
            'item-1',
            {'target_type': 'character', 'target_id': 'pending'},
            current_user='gm',
        ))

    assert exc.value.status_code == 409
    assert 'not an active campaign character' in exc.value.detail


def test_direct_grant_rejects_stale_character_when_active_membership_points_elsewhere(monkeypatch):
    async def allow(_campaign_id, _username):
        return None

    fake = SimpleNamespace(
        player_characters=Collection([
            {'id': 'old-char', 'campaign_id': 'c1', 'user_id': 'player', 'name': 'Old Hero'},
        ]),
        campaign_members=Collection([
            {'campaign_id': 'c1', 'user_id': 'player', 'character_id': 'new-char', 'status': 'active'},
        ]),
        inventory=NeverReserve(),
    )
    monkeypatch.setattr(grants, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(grants, 'db', fake)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(grants.grant_inventory_item_to_target(
            'c1',
            'item-1',
            {'target_type': 'character', 'target_id': 'old-char'},
            current_user='gm',
        ))

    assert exc.value.status_code == 409

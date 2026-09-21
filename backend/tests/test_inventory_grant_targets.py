import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

spec = importlib.util.spec_from_file_location('inventory_targets_under_test', BACKEND_ROOT / 'routes' / 'inventory.py')
inventory = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(inventory)


class Cursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *_args):
        return self

    async def to_list(self, limit):
        return list(self.rows[:limit])


class Collection:
    def __init__(self, rows):
        self.rows = rows

    def find(self, _query, _projection=None):
        return Cursor(self.rows)


def test_grant_targets_only_offer_active_or_legacy_characters_plus_npcs(monkeypatch):
    async def allow(_campaign_id, _username):
        return None

    monkeypatch.setattr(inventory, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(inventory, 'db', SimpleNamespace(
        player_characters=Collection([
            {'id': 'active', 'name': 'Active Hero', 'campaign_join_status': 'active'},
            {'id': 'pending', 'name': 'Pending Hero', 'campaign_join_status': 'pending'},
            {'id': 'retired', 'name': 'Retired Hero', 'campaign_join_status': 'retired'},
            {'id': 'legacy', 'name': 'Legacy Hero'},
        ]),
        npcs=Collection([
            {'id': 'npc-1', 'name': 'Friendly Guard'},
        ]),
    ))

    result = asyncio.run(inventory.get_inventory_grant_targets('campaign-1', current_user='gm'))
    ids = [target['target_id'] for target in result]

    assert ids == ['active', 'legacy', 'npc-1']
    assert [target['target_type'] for target in result] == ['character', 'character', 'npc']

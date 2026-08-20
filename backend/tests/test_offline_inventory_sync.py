import asyncio
import importlib.util
import sys
import types
from pathlib import Path

from models import InventoryItem, InventoryItemCreate

sys.modules.setdefault('config', types.SimpleNamespace(db=None))
sys.modules.setdefault('utils', types.ModuleType('utils'))
sys.modules.setdefault('utils.auth', types.SimpleNamespace(
    get_current_user=lambda: None,
    verify_campaign_ownership=None,
))

spec = importlib.util.spec_from_file_location(
    'offline_inventory_sync_under_test',
    Path(__file__).resolve().parents[1] / 'routes' / 'offline_inventory_sync.py',
)
route = importlib.util.module_from_spec(spec)
spec.loader.exec_module(route)

# Use the real inventory models even though the route module was loaded with
# lightweight config/auth stubs.
route.InventoryItem = InventoryItem
route.InventoryItemCreate = InventoryItemCreate


class FakeInventoryCollection:
    def __init__(self):
        self.docs = {}

    async def update_one(self, query, update, upsert=False):
        storage_id = query['_id']
        if storage_id not in self.docs and upsert:
            self.docs[storage_id] = dict(update.get('$setOnInsert') or {})
        return types.SimpleNamespace(upserted_id=storage_id if storage_id in self.docs else None)

    async def find_one(self, query, projection=None):
        doc = self.docs.get(query['_id'])
        if doc is None:
            return None
        result = dict(doc)
        if projection and projection.get('_id') == 0:
            result.pop('_id', None)
        return result


class FakeDb:
    def __init__(self):
        self.inventory = FakeInventoryCollection()


async def allow_campaign(_campaign_id, _username):
    return None


def test_offline_inventory_retry_returns_one_item():
    fake_db = FakeDb()
    route.db = fake_db
    route.verify_campaign_ownership = allow_campaign
    payload = {
        'operation_id': 'combat-loot-op-123',
        'item': {
            'name': 'Brambleheart Token',
            'quantity': 1,
            'item_type': 'misc',
            'description': 'Recovered after combat',
            'notes': 'Combat loot',
        },
    }

    first = asyncio.run(route.sync_offline_inventory_item('campaign-a', payload, 'gm'))
    second = asyncio.run(route.sync_offline_inventory_item('campaign-a', payload, 'gm'))

    assert len(fake_db.inventory.docs) == 1
    assert first == second
    assert first['id'] == second['id']
    assert first['offline_operation_id'] == 'combat-loot-op-123'
    assert first['name'] == 'Brambleheart Token'


def test_same_operation_id_is_scoped_to_campaign():
    assert route._storage_id('campaign-a', 'same-op') != route._storage_id('campaign-b', 'same-op')

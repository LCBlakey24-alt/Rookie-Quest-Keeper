"""Campaign setup creation should not leave partial records behind."""
import copy
import importlib.util
import os
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'rqk_unit_tests',
    'JWT_SECRET_KEY': 'unit-test-only-secret',
    'APP_URL': 'http://localhost',
    'CORS_ORIGINS': 'http://localhost',
}.items():
    os.environ.setdefault(key, value)


def route_module(name):
    spec = importlib.util.spec_from_file_location('campaign_setup_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


campaign_setup = route_module('campaign_setup')


def matches(row, query):
    return all(row.get(key) == value for key, value in query.items())


class Collection:
    def __init__(self, rows=()):
        self.rows = copy.deepcopy(list(rows))

    async def insert_one(self, row):
        self.rows.append(copy.deepcopy(row))
        return SimpleNamespace(inserted_id=row.get('id'))

    async def delete_one(self, query):
        previous = len(self.rows)
        self.rows = [row for row in self.rows if not matches(row, query)]
        return SimpleNamespace(deleted_count=previous - len(self.rows))


class CampaignSetupAtomicityTests(unittest.IsolatedAsyncioTestCase):
    async def test_failed_join_code_creation_rolls_back_inserted_campaign(self):
        db = SimpleNamespace(
            campaigns=Collection(),
            campaign_invites=Collection(),
        )

        with (
            patch.object(campaign_setup, 'db', db),
            patch.object(campaign_setup, 'site_flag_enabled', AsyncMock(return_value=True)),
            patch.object(
                campaign_setup,
                'create_unique_join_code',
                AsyncMock(side_effect=RuntimeError('join-code generation failed')),
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, 'join-code generation failed'):
                await campaign_setup.create_campaign({'name': 'Atomic Test'}, 'gm')

        self.assertEqual(db.campaigns.rows, [])
        self.assertEqual(db.campaign_invites.rows, [])


if __name__ == '__main__':
    unittest.main()

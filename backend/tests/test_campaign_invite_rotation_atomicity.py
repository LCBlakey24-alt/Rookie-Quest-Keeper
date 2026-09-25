"""Join-code rotation should never destroy the old code before the replacement is safe."""
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
    spec = importlib.util.spec_from_file_location('invite_rotation_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


campaign_invites = route_module('campaign_invites')


class FailingInviteCollection:
    def __init__(self):
        self.rows = [{
            'id': 'old-invite',
            'campaign_id': 'campaign-1',
            'created_by': 'gm',
            'code': 'OLD123',
            'expires_at': None,
        }]
        self.delete_many_called = False

    async def insert_one(self, row):
        raise RuntimeError('invite persistence failed')

    async def delete_many(self, query):
        self.delete_many_called = True
        self.rows = []

    async def delete_one(self, query):
        self.rows = [row for row in self.rows if row.get('id') != query.get('id')]


class JoinCodeRotationAtomicityTests(unittest.IsolatedAsyncioTestCase):
    async def test_failed_replacement_insert_keeps_existing_join_code(self):
        invites = FailingInviteCollection()
        db = SimpleNamespace(
            campaign_invites=invites,
            campaigns=SimpleNamespace(find_one=AsyncMock(return_value={'id': 'campaign-1', 'name': 'Test'})),
        )

        with (
            patch.object(campaign_invites, 'db', db),
            patch.object(campaign_invites, 'verify_campaign_ownership', AsyncMock(return_value={'id': 'campaign-1'})),
            patch.object(campaign_invites, 'create_unique_join_code', AsyncMock(return_value='NEW456')),
        ):
            with self.assertRaisesRegex(RuntimeError, 'invite persistence failed'):
                await campaign_invites.rotate_campaign_invite('campaign-1', 'gm')

        self.assertFalse(invites.delete_many_called)
        self.assertEqual([row['code'] for row in invites.rows], ['OLD123'])


if __name__ == '__main__':
    unittest.main()

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

    async def test_failed_rollback_does_not_mask_join_code_error(self):
        campaigns = Collection()
        campaigns.delete_one = AsyncMock(side_effect=RuntimeError('database unavailable'))
        db = SimpleNamespace(campaigns=campaigns, campaign_invites=Collection())
        with (
            patch.object(campaign_setup, 'db', db),
            patch.object(campaign_setup, 'site_flag_enabled', AsyncMock(return_value=True)),
            patch.object(campaign_setup, 'create_unique_join_code', AsyncMock(side_effect=RuntimeError('join-code generation failed'))),
            self.assertLogs(campaign_setup.logger, level='ERROR'),
        ):
            with self.assertRaisesRegex(RuntimeError, 'join-code generation failed'):
                await campaign_setup.create_campaign({'name': 'Atomic Test'}, 'gm')

    def test_update_can_clear_optional_text_and_preserves_omitted_fields(self):
        existing = {
            'name': 'The campaign',
            'description': 'Old summary',
            'world_name': 'Old world',
            'world_setting_notes': 'Old notes',
            'campaign_feel': 'Old feel',
            'system': 'Custom system',
        }
        updated = campaign_setup.build_campaign_update({
            'description': '', 'world_name': '  ', 'world_setting_notes': '', 'campaign_feel': '',
        }, existing)
        for field in ('description', 'world_name', 'world_setting_notes', 'campaign_feel'):
            self.assertEqual(updated[field], '')
        self.assertEqual(updated['system'], 'Custom system')
        unchanged = campaign_setup.build_campaign_update({}, existing)
        for field in ('description', 'world_name', 'world_setting_notes', 'campaign_feel', 'system'):
            self.assertEqual(unchanged[field], existing[field])

    def test_update_edition_refreshes_standard_system_but_preserves_custom_system(self):
        existing = {'name': 'The campaign', 'rules_edition': '2014', 'system': 'D&D 5e 2014 Compatible'}
        updated = campaign_setup.build_campaign_update({'rules_edition': '2024'}, existing)
        self.assertEqual(updated['system'], 'D&D 5e 2024 Compatible')
        existing['system'] = 'Custom system'
        updated = campaign_setup.build_campaign_update({'rules_edition': '2024'}, existing)
        self.assertEqual(updated['system'], 'Custom system')


if __name__ == '__main__':
    unittest.main()

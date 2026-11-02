"""Regression tests for account identity and private rule-system read access."""
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
for name, value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'rookiequestkeeper_test',
    'JWT_SECRET_KEY': 'rule-access-test-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(name, value)

from models import RulesetUpload  # noqa: E402
from routes import rule_systems  # noqa: E402


class EmptyCursor:
    async def to_list(self, length):
        return []


class PersonalRulesetIdentityTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_six_personal_ruleset_actions_find_username_not_email(self):
        user = {'_id': 'mongo-owner-1', 'username': 'Rook', 'email': 'rook@example.com'}
        users = SimpleNamespace(find_one=AsyncMock(return_value=user))
        ruleset = {'id': 'ruleset-one', 'owner_id': 'mongo-owner-1',
                   'name': 'Own Rules', 'shared_with': [], 'shared_campaigns': [], 'is_public': False}
        records = SimpleNamespace(
            find_one=AsyncMock(return_value=dict(ruleset)),
            find=Mock(return_value=EmptyCursor()),
            insert_one=AsyncMock(),
            update_one=AsyncMock(),
            delete_one=AsyncMock(),
        )
        fake_db = SimpleNamespace(users=users, custom_rulesets=records)
        calls = [
            lambda: rule_systems.upload_custom_ruleset(
                RulesetUpload(name='Own Rules', rules_type='full', content={}), username='Rook'),
            lambda: rule_systems.get_user_rulesets(username='Rook'),
            lambda: rule_systems.get_ruleset('ruleset-one', username='Rook'),
            lambda: rule_systems.update_ruleset('ruleset-one', {'name': 'Renamed'}, username='Rook'),
            lambda: rule_systems.delete_ruleset('ruleset-one', username='Rook'),
            lambda: rule_systems.share_ruleset('ruleset-one', {'user_ids': ['player-two']}, username='Rook'),
        ]
        with patch.object(rule_systems, 'db', fake_db):
            for action in calls:
                users.find_one.reset_mock()
                await action()
                users.find_one.assert_awaited_once_with({'username': 'Rook'})

    async def test_another_user_cannot_change_someone_elses_ruleset(self):
        fake_db = SimpleNamespace(
            users=SimpleNamespace(find_one=AsyncMock(return_value={'_id': 'stranger', 'username': 'Stranger'})),
            custom_rulesets=SimpleNamespace(
                find_one=AsyncMock(return_value={'id': 'ruleset-one', 'owner_id': 'original-owner'}),
                update_one=AsyncMock(),
            )
        )
        with patch.object(rule_systems, 'db', fake_db):
            with self.assertRaises(HTTPException) as rejected:
                await rule_systems.update_ruleset('ruleset-one', {'name': 'Hacked'}, username='Stranger')
        self.assertEqual(rejected.exception.status_code, 403)
        fake_db.custom_rulesets.update_one.assert_not_awaited()


class PrivateRuleSystemReadTests(unittest.IsolatedAsyncioTestCase):
    async def test_private_and_missing_systems_are_not_exposed_to_other_users(self):
        methods = [
            lambda: rule_systems.get_rule_system('secret', username='Stranger'),
            lambda: rule_systems.get_system_classes('secret', username='Stranger'),
            lambda: rule_systems.get_class_details('secret', 'class-a', username='Stranger'),
            lambda: rule_systems.get_system_races('secret', username='Stranger'),
            lambda: rule_systems.get_system_spells('secret', username='Stranger'),
            lambda: rule_systems.get_system_items('secret', username='Stranger'),
            lambda: rule_systems.get_system_feats('secret', username='Stranger'),
            lambda: rule_systems.get_system_monsters('secret', username='Stranger'),
        ]
        collection = SimpleNamespace(find_one=AsyncMock(return_value={'id': 'secret', 'owner_id': 'Owner', 'is_official': False}))
        with patch.object(rule_systems, 'db', SimpleNamespace(rule_systems=collection)):
            for call in methods:
                with self.subTest(method=call):
                    with self.assertRaises(HTTPException) as rejected:
                        await call()
                    self.assertEqual(rejected.exception.status_code, 404)

    async def test_official_system_and_own_system_remain_visible(self):
        for system in [
            {'id': 'standard', 'is_official': True, 'owner_id': None},
            {'id': 'mine', 'is_official': False, 'owner_id': 'Rook'},
        ]:
            collection = SimpleNamespace(find_one=AsyncMock(return_value=system))
            with patch.object(rule_systems, 'db', SimpleNamespace(rule_systems=collection)):
                actual = await rule_systems._require_visible_rule_system(system['id'], 'Rook')
            self.assertEqual(actual, system)


if __name__ == '__main__':
    unittest.main()

"""Regression: campaign ruleset sharing must translate usernames to Mongo IDs."""
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
for key, value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'keeper_ruleset_sharing_test',
    'JWT_SECRET_KEY': 'ruleset-sharing-unit-test-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(key, value)

from routes import campaigns, rule_systems  # noqa: E402


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, length):
        return list(self.rows[:length])


class SharingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.users = [
            {'_id': 'db-gm', 'username': 'guild-gm', 'email': 'different@example.com'},
            {'_id': 'db-player', 'username': 'player', 'email': 'player@example.com'},
            {'_id': 'db-pending', 'username': 'pending', 'email': 'pending@example.com'},
            {'_id': 'db-stranger', 'username': 'stranger', 'email': 'stranger@example.com'},
        ]
        self.ruleset = {'id': 'private-rules', 'owner_id': 'db-gm',
                        'name': 'Private rules', 'is_public': False,
                        'shared_campaigns': [], 'shared_with': ['db-previous']}
        self.members = [
            {'campaign_id': 'c1', 'user_id': 'player', 'username': 'player', 'status': 'active', 'shared_rulesets': []},
            {'campaign_id': 'c1', 'user_id': 'pending', 'username': 'pending', 'status': 'pending', 'shared_rulesets': []},
        ]
        self.campaign = {'id': 'c1', 'dm_user_id': 'guild-gm'}
        async def find_user(query):
            if 'username' in query:
                return next((dict(u) for u in self.users if u['username'] == query['username']), None)
            if '_id' in query:
                return next((dict(u) for u in self.users if u['_id'] == query['_id']), None)
            return None

        def find_rules(query):
            if 'owner_id' in query and isinstance(query['owner_id'], str):
                return Cursor([dict(self.ruleset)] if self.ruleset['owner_id'] == query['owner_id'] else [])
            if 'shared_with' in query:
                return Cursor([dict(self.ruleset)] if query['shared_with'] in self.ruleset['shared_with'] else [])
            return Cursor([])

        async def update_rules(query, update):
            for key, value in update.get('$addToSet', {}).items():
                entries = value.get('$each', []) if isinstance(value, dict) and '$each' in value else [value]
                for entry in entries:
                    if entry not in self.ruleset[key]:
                        self.ruleset[key].append(entry)

        async def update_members(query, update):
            ids = query.get('user_id', {}).get('$in', [])
            for member in self.members:
                if member['user_id'] in ids and member['status'] == 'active':
                    for value in update.get('$addToSet', {}).values():
                        if value not in member['shared_rulesets']:
                            member['shared_rulesets'].append(value)

        self.db = SimpleNamespace(
            users=SimpleNamespace(find_one=AsyncMock(side_effect=find_user)),
            campaigns=SimpleNamespace(find_one=AsyncMock(return_value=self.campaign)),
            custom_rulesets=SimpleNamespace(find_one=AsyncMock(side_effect=lambda q: dict(self.ruleset) if q.get('id') == 'private-rules' else None),
                                             find=Mock(side_effect=find_rules),
                                             update_one=AsyncMock(side_effect=update_rules)),
            campaign_members=SimpleNamespace(find=Mock(return_value=Cursor(self.members)),
                                             update_many=AsyncMock(side_effect=update_members)),
        )

    async def test_username_email_GM_shares_only_to_approved_player_and_list_and_open_work(self):
        with patch.object(campaigns, 'db', self.db), patch.object(rule_systems, 'db', self.db), patch.object(campaigns.ws_manager, 'broadcast_to_campaign', new_callable=AsyncMock):
            await campaigns.share_rulesets_with_campaign('c1', {'ruleset_ids': ['private-rules']}, username='guild-gm')
            self.assertIn('db-player', self.ruleset['shared_with'])
            self.assertIn('db-previous', self.ruleset['shared_with'])
            self.assertNotIn('player', self.ruleset['shared_with'])
            self.assertNotIn('db-pending', self.ruleset['shared_with'])
            self.assertEqual(self.members[0]['shared_rulesets'], ['private-rules'])
            self.assertEqual(self.members[1]['shared_rulesets'], [])
            listing = await rule_systems.get_user_rulesets(username='player')
            self.assertEqual([r['id'] for r in listing['shared']], ['private-rules'])
            detail = await rule_systems.get_ruleset('private-rules', username='player')
            self.assertEqual(detail['owner_id'], 'db-gm')
            with self.assertRaises(HTTPException) as pending:
                await rule_systems.get_ruleset('private-rules', username='pending')
            self.assertEqual(pending.exception.status_code, 403)

    async def test_non_GM_cannot_share_and_records_are_unchanged(self):
        with patch.object(campaigns, 'db', self.db), patch.object(campaigns.ws_manager, 'broadcast_to_campaign', new_callable=AsyncMock):
            with self.assertRaises(HTTPException) as forbidden:
                await campaigns.share_rulesets_with_campaign('c1', {'ruleset_ids': ['private-rules']}, username='stranger')
            self.assertEqual(forbidden.exception.status_code, 403)
            self.assertEqual(self.ruleset['shared_with'], ['db-previous'])
            self.db.custom_rulesets.update_one.assert_not_awaited()


if __name__ == '__main__':
    unittest.main()

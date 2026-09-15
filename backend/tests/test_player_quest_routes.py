import asyncio
import importlib.util
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'rookiequestkeeper_test',
    'JWT_SECRET_KEY': 'unit-test-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(key, value)


def route_module(name):
    spec = importlib.util.spec_from_file_location('quest_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


quest_routes = route_module('quests')


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.sort_spec = None

    def sort(self, spec):
        self.sort_spec = spec
        return self

    async def to_list(self, length):
        return self.rows[:length]


class FakeQuestsCollection:
    def __init__(self, rows):
        self.rows = rows
        self.query = None
        self.projection = None
        self.cursor = None

    def find(self, query, projection):
        self.query = query
        self.projection = projection
        self.cursor = FakeCursor(self.rows)
        return self.cursor


class FakeDb:
    def __init__(self, rows):
        self.quests = FakeQuestsCollection(rows)


def run_async(coro):
    return asyncio.run(coro)


class PlayerQuestRouteTests(unittest.TestCase):
    def test_new_quests_are_private_by_default(self):
        payload = quest_routes.QuestCreate(title='Secret prep')
        self.assertFalse(payload.shared_with_players)

    def test_player_feed_requires_membership_and_queries_only_explicitly_shared_non_archived_quests(self):
        fake_db = FakeDb([])
        membership = AsyncMock(return_value={'id': 'campaign-1'})
        with patch.object(quest_routes, 'db', fake_db), patch.object(quest_routes, 'verify_campaign_membership', membership):
            result = run_async(quest_routes.list_player_quests('campaign-1', username='player-one'))

        self.assertEqual(result, [])
        membership.assert_awaited_once_with('campaign-1', 'player-one')
        self.assertEqual(fake_db.quests.query, {
            'campaign_id': 'campaign-1',
            'shared_with_players': True,
            'status': {'$ne': 'archived'},
        })
        self.assertEqual(fake_db.quests.cursor.sort_spec, [('is_pinned', -1), ('updated_at', -1)])

    def test_player_feed_strips_all_gm_only_and_linked_fields(self):
        fake_db = FakeDb([{
            'id': 'quest-1',
            'campaign_id': 'campaign-1',
            'title': 'Find the courier',
            'summary': 'The courier is missing.',
            'hook': 'Last seen on the forest road.',
            'status': 'active',
            'is_pinned': True,
            'updated_at': '2026-09-15T06:00:00+00:00',
            'shared_with_players': True,
            'gm_notes': 'The innkeeper did it.',
            'created_by': 'gm-one',
            'linked_npc_ids': ['secret-npc'],
            'linked_location_ids': ['secret-location'],
            'linked_encounter_ids': ['secret-encounter'],
            'linked_map_ids': ['secret-map'],
            'linked_handout_ids': ['secret-handout'],
            'linked_reward_ids': ['secret-reward'],
            'objectives': [{
                'id': 'objective-1',
                'title': 'Search the bridge',
                'status': 'upcoming',
                'optional': False,
                'notes': 'Ambush triggers here.',
                'linked_encounter_id': 'secret-encounter',
                'dependency_ids': ['secret-dependency'],
            }],
        }])
        with patch.object(quest_routes, 'db', fake_db), patch.object(quest_routes, 'verify_campaign_membership', AsyncMock(return_value={'id': 'campaign-1'})):
            result = run_async(quest_routes.list_player_quests('campaign-1', username='player-one'))

        self.assertEqual(result, [{
            'id': 'quest-1',
            'title': 'Find the courier',
            'summary': 'The courier is missing.',
            'hook': 'Last seen on the forest road.',
            'status': 'active',
            'is_pinned': True,
            'updated_at': '2026-09-15T06:00:00+00:00',
            'objectives': [{
                'id': 'objective-1',
                'title': 'Search the bridge',
                'status': 'upcoming',
                'optional': False,
            }],
        }])
        serialized = repr(result)
        for secret in ['gm_notes', 'created_by', 'linked_', 'dependency_ids', 'Ambush triggers here']:
            self.assertNotIn(secret, serialized)


if __name__ == '__main__':
    unittest.main()

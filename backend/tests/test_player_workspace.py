"""Exercise real route permissions and persistence with an in-memory database."""
import copy
import importlib.util
import os
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    'MONGO_URL': 'mongodb://localhost:27017', 'DB_NAME': 'rqk_unit_tests',
    'JWT_SECRET_KEY': 'unit-test-only-secret', 'APP_URL': 'http://localhost',
    'CORS_ORIGINS': 'http://localhost',
}.items():
    os.environ.setdefault(key, value)

from fastapi import HTTPException
from pydantic import ValidationError
from models import TimelineEventCreate
from utils import auth
from utils.player_views import player_campaign_summary


def route_module(name):
    # Avoid importing unrelated route integrations through routes/__init__.py.
    spec = importlib.util.spec_from_file_location('workspace_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


players = route_module('players')
notes = route_module('notes')
invites = route_module('campaign_invites')


def matches(row, query):
    return all(row.get(key) in value['$in'] if isinstance(value, dict) and '$in' in value
               else row.get(key) == value for key, value in query.items())


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *args):
        return self

    async def to_list(self, length):
        return copy.deepcopy(self.rows[:length])


class Collection:
    def __init__(self, rows=()):
        self.rows = copy.deepcopy(list(rows))

    async def find_one(self, query, projection=None):
        return next((copy.deepcopy(row) for row in self.rows if matches(row, query)), None)

    def find(self, query, projection=None):
        # Deliberately ignore projection: the public serializer must also filter.
        return Cursor([row for row in self.rows if matches(row, query)])

    async def insert_one(self, row):
        self.rows.append(copy.deepcopy(row))

    async def delete_one(self, query):
        previous = len(self.rows)
        self.rows = [row for row in self.rows if not matches(row, query)]
        return SimpleNamespace(deleted_count=previous - len(self.rows))


class PlayerWorkspaceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.campaign = {
            'id': 'c1', 'name': 'Test table', 'dm_user_id': 'gm',
            'world_setting_notes': 'SECRET', 'join_code': 'SECRET',
            'environment': {'weather': 'Rain', 'gm_notes': 'SECRET'},
        }
        self.db = SimpleNamespace(
            campaigns=Collection([self.campaign, {'id': 'c2', 'dm_user_id': 'other-gm'}]),
            player_characters=Collection([
                {'id': 'p1', 'campaign_id': 'c1', 'user_id': 'player', 'name': 'Hero', 'level': 3, 'notes': 'PRIVATE'},
                {'id': 'p2', 'campaign_id': 'c2', 'user_id': 'other', 'name': 'Other hero'},
            ]),
            players=Collection([{'id': 'legacy', 'campaign_id': 'c1', 'character_name': 'Companion', 'gm_notes': 'SECRET'}]),
            campaign_members=Collection([{'campaign_id': 'c1', 'user_id': 'player', 'character_id': 'p1'}]),
            timeline_events=Collection(),
        )
        for module in (auth, players, notes, invites):
            patcher = patch.object(module, 'db', self.db)
            patcher.start()
            self.addCleanup(patcher.stop)

    async def test_player_view_excludes_gm_and_private_character_data(self):
        result = await players.get_player_campaign('c1', 'player')
        self.assertEqual(result['name'], 'Test table')
        self.assertEqual(result['environment'], {'weather': 'Rain'})
        self.assertEqual({p.get('name') or p.get('character_name') for p in result['party']}, {'Hero', 'Companion'})
        self.assertNotIn('SECRET', str(result))
        self.assertNotIn('PRIVATE', str(result))
        self.assertNotIn('user_id', str(result))

    async def test_outsider_cannot_read_campaign_or_timeline(self):
        for route in (players.get_player_campaign, notes.get_campaign_timeline):
            with self.assertRaises(HTTPException) as error:
                await route('c1', 'outsider')
            self.assertEqual(error.exception.status_code, 403)

    async def test_joined_campaigns_do_not_return_gm_documents(self):
        result = await invites.get_joined_campaigns('player')
        self.assertEqual(result[0]['character_id'], 'p1')
        self.assertNotIn('SECRET', str(result))
        self.assertEqual(self.db.campaigns.rows[0], self.campaign)

    async def test_player_cannot_use_gm_roster(self):
        with self.assertRaises(HTTPException):
            await players.get_players('c1', 'player')

    async def test_timeline_save_reload_and_delete(self):
        data = TimelineEventCreate(type='major', title='  New event  ', session_number='', in_game_date=' Day 3 ')
        saved = await notes.create_timeline_event('c1', data, 'gm')
        self.assertEqual(saved['type'], 'major')
        self.assertEqual(saved['title'], 'New event')
        self.assertEqual(saved['session_number'], 0)
        self.assertEqual(saved['in_game_date'], 'Day 3')
        for user in ('gm', 'player'):
            loaded = await notes.get_campaign_timeline('c1', user)
            self.assertEqual(loaded['events'][0]['id'], saved['id'])
        self.assertEqual((await notes.get_player_timeline('player'))[0]['in_game_date'], 'Day 3')
        await notes.delete_timeline_event('c1', saved['id'], 'gm')
        self.assertEqual((await notes.get_campaign_timeline('c1', 'gm'))['events'], [])

    async def test_player_cannot_mutate_timeline_and_delete_is_campaign_scoped(self):
        data = TimelineEventCreate(event_type='session', title='Event')
        with self.assertRaises(HTTPException):
            await notes.create_timeline_event('c1', data, 'player')
        self.db.timeline_events.rows.append({'id': 'e2', 'campaign_id': 'c2'})
        for user in ('player', 'gm'):
            with self.assertRaises(HTTPException):
                await notes.delete_timeline_event('c1', 'e2', user)
        self.assertEqual(len(self.db.timeline_events.rows), 1)

    def test_legacy_event_type_and_validation(self):
        self.assertEqual(TimelineEventCreate(event_type='npc_met', title='Meeting').event_type, 'npc_met')
        for values in ({'title': '  '}, {'title': 'Event', 'session_number': -1}):
            with self.assertRaises(ValidationError):
                TimelineEventCreate(**values)

    def test_public_summary_does_not_mutate_campaign(self):
        original = copy.deepcopy(self.campaign)
        player_campaign_summary(self.campaign)
        self.assertEqual(self.campaign, original)


if __name__ == '__main__':
    unittest.main()

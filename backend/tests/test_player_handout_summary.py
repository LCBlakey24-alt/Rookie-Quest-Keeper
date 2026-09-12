import asyncio
import importlib.util
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

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
    spec = importlib.util.spec_from_file_location('summary_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


summary_routes = route_module('player_handout_summary')


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, length):
        return self.rows[:length]


class FakePlayerHandoutsCollection:
    def __init__(self, rows):
        self.rows = rows
        self.pipeline = None

    def aggregate(self, pipeline):
        self.pipeline = pipeline
        return FakeCursor(self.rows)


class FakeDb:
    def __init__(self, rows):
        self.player_handouts = FakePlayerHandoutsCollection(rows)


def run_async(coro):
    return asyncio.run(coro)


class PlayerHandoutSummaryTests(unittest.TestCase):
    def test_returns_counts(self):
        fake_db = FakeDb([{'_id': None, 'total': 7, 'unread': 3, 'saved': 2}])
        with patch.object(summary_routes, 'db', fake_db):
            result = run_async(summary_routes.get_player_handout_summary(current_user='player-one'))

        self.assertEqual(result, {'total': 7, 'unread': 3, 'saved': 2})
        self.assertEqual(fake_db.player_handouts.pipeline[0], {'$match': {'username': 'player-one'}})

    def test_returns_zeroes_when_player_has_none(self):
        with patch.object(summary_routes, 'db', FakeDb([])):
            result = run_async(summary_routes.get_player_handout_summary(current_user='player-one'))

        self.assertEqual(result, {'total': 0, 'unread': 0, 'saved': 0})


if __name__ == '__main__':
    unittest.main()

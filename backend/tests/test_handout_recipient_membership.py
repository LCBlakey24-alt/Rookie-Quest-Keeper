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

spec = importlib.util.spec_from_file_location('handouts_membership_under_test', BACKEND_ROOT / 'routes' / 'handouts.py')
handouts = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(handouts)


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return list(self.rows)


class Collection:
    def __init__(self, rows):
        self.rows = rows

    def find(self, _query, _projection=None):
        return Cursor(self.rows)


def test_handout_recipients_exclude_pending_and_removed_but_keep_approved_members(monkeypatch):
    members = [
        {'user_id': 'active-player', 'username': 'active-player', 'status': 'active'},
        {'user_id': 'pending-player', 'username': 'pending-player', 'status': 'pending'},
        {'user_id': 'removed-player', 'username': 'removed-player', 'status': 'removed'},
        {'user_id': 'dead-player', 'username': 'dead-player', 'status': 'dead'},
        {'user_id': 'retired-player', 'username': 'retired-player', 'status': 'retired'},
    ]
    characters = [
        {'user_id': 'active-player', 'name': 'Ari'},
        {'user_id': 'pending-player', 'name': 'Pending Hero'},
        {'user_id': 'removed-player', 'name': 'Removed Hero'},
        {'user_id': 'dead-player', 'name': 'Dead Hero'},
        {'user_id': 'retired-player', 'name': 'Retired Hero'},
        {'user_id': 'legacy-player', 'name': 'Legacy Hero'},
    ]

    monkeypatch.setattr(handouts, 'db', SimpleNamespace(
        campaign_members=Collection(members),
        player_characters=Collection(characters),
    ))

    recipients = asyncio.run(handouts._get_handout_recipients('campaign-1'))
    usernames = [item['username'] for item in recipients]

    assert usernames == ['active-player', 'dead-player', 'legacy-player', 'retired-player']
    active = next(item for item in recipients if item['username'] == 'active-player')
    assert active['character_name'] == 'Ari'

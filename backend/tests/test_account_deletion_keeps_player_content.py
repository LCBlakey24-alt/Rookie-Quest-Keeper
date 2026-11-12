"""Deleting a GM account must not delete other players' campaign-linked content.

cleanup_user_account swept every collection by the GM's campaign ids, with a
shorter exclusion list than campaign deletion uses, so a player's homebrew or
playtest content shared with the GM's campaign was deleted along with it.
"""
import asyncio
import importlib.util
import os
import sys
import types
from pathlib import Path

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
try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(api_key=None, Emails=types.SimpleNamespace(send=lambda params: None))

from unittest.mock import patch  # noqa: E402


def _matches(doc, query):
    for key, cond in query.items():
        if key == '$or':
            if not any(_matches(doc, sub) for sub in cond):
                return False
            continue
        value = doc.get(key)
        if isinstance(cond, dict) and '$in' in cond:
            if value not in cond['$in']:
                return False
        elif value != cond:
            return False
    return True


class _Result:
    def __init__(self, deleted=0, modified=0):
        self.deleted_count = deleted
        self.modified_count = modified


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit=None):
        return [dict(doc) for doc in self.docs]


class _Collection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query, _projection=None):
        return next((dict(d) for d in self.docs if _matches(d, query)), None)

    def find(self, query, _projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query)])

    async def delete_many(self, query):
        before = len(self.docs)
        self.docs = [d for d in self.docs if not _matches(d, query)]
        return _Result(deleted=before - len(self.docs))

    async def delete_one(self, query):
        return await self.delete_many(query)

    async def update_many(self, query, update):
        count = 0
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get('$set', {}))
                count += 1
        return _Result(modified=count)


class _Db:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        return self.collections.setdefault(name, _Collection())

    def __getattr__(self, name):
        if name.startswith('_') or name == 'collections':
            raise AttributeError(name)
        return self[name]

    async def list_collection_names(self):
        return list(self.collections)


def _auth_module():
    spec = importlib.util.spec_from_file_location('account_deletion_auth', ROOT / 'routes' / 'auth.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_gm_account_deletion_keeps_players_campaign_linked_content():
    auth = _auth_module()
    db = _Db()
    db['users'].docs = [{'_id': 'm1', 'username': 'gm', 'email': 'gm@example.invalid'}, {'_id': 'm2', 'username': 'pat'}]
    db['campaigns'].docs = [{'id': 'camp-1', 'dm_user_id': 'gm'}]
    db['quests'].docs = [{'id': 'q1', 'campaign_id': 'camp-1'}]
    db['user_races'].docs = [
        {'id': 'player-race', 'user_id': 'pat', 'campaign_id': 'camp-1', 'visibility': 'campaign'},
        {'id': 'gm-race', 'user_id': 'gm', 'campaign_id': 'camp-1', 'visibility': 'campaign'},
    ]
    db['user_playtest_packs'].docs = [{'id': 'player-pack', 'user_id': 'pat', 'campaign_id': 'camp-1'}]
    db['player_journal'].docs = [{'id': 'player-journal', 'user_id': 'pat', 'campaign_id': 'camp-1'}]

    with patch.object(auth, 'db', db):
        asyncio.run(auth.cleanup_user_account('gm'))

    races = {doc['id']: doc for doc in db['user_races'].docs}
    assert 'gm-race' not in races  # the GM's own content goes with the account
    assert races['player-race']['campaign_id'] is None  # the player's stays, unlinked
    assert races['player-race']['visibility'] == 'private'
    assert [doc['id'] for doc in db['user_playtest_packs'].docs] == ['player-pack']
    assert db['user_playtest_packs'].docs[0]['campaign_id'] is None
    assert [doc['id'] for doc in db['player_journal'].docs] == ['player-journal']
    assert db['quests'].docs == []  # campaign-owned records are still removed
    assert db['campaigns'].docs == []
    assert [doc['username'] for doc in db['users'].docs] == ['pat']

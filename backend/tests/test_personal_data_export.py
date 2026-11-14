"""Self-service personal-data export: account boundary, secrets and integrity."""
import asyncio
import importlib.util
import os
import sys
import types
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rqk_export_tests')
os.environ.setdefault('JWT_SECRET_KEY', 'local-test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda _: None)
    )

spec = importlib.util.spec_from_file_location('rqk_auth_export_tests', ROOT / 'routes' / 'auth.py')
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


def matches(doc, query):
    if '$or' in query:
        return any(matches(doc, q) for q in query['$or'])
    return all(doc.get(k) == v for k, v in query.items())


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=None):
        return self.docs[:length] if length is not None else list(self.docs)


class Collection:
    def __init__(self, docs):
        self.docs = list(docs)

    async def find_one(self, query):
        return next((d.copy() for d in self.docs if matches(d, query)), None)

    def find(self, query, projection=None):
        items = [dict(doc) for doc in self.docs if matches(doc, query)]
        if isinstance(projection, dict):
            positive = {k for k, v in projection.items() if v}
            excluded = {k for k, v in projection.items() if not v}
            if positive:
                items = [{k: d[k] for k in positive if k in d} for d in items]
            else:
                items = [{k: v for k, v in d.items() if k not in excluded} for d in items]
        return Cursor(items)


class FakeDatabase:
    def __init__(self, data):
        self.collections = {k: Collection(v) for k, v in data.items()}

    def __getitem__(self, name):
        return self.collections.get(name, Collection([]))

    def __getattr__(self, name):
        return self[name]


def sample_db():
    return FakeDatabase({
        'users': [
            {'_id': 'mongo-owner', 'username': 'keeper1',
             'email': 'keeper1@example.test', 'password_hash': 'TOP-SECRET-HASH',
             'token_version': 5},
            {'_id': 'mongo-other', 'username': 'member2',
             'email': 'member2@example.test', 'password_hash': 'SOME-OTHER-HASH'},
        ],
        'campaigns': [
            {'id': 'campaign1', 'dm_user_id': 'keeper1',
             'name': 'Original Adventure', 'players': ['member2'],
             'secret_join_code': 'PRIVATE'},
            {'id': 'campaign2', 'dm_user_id': 'member2',
             'name': 'Other GM campaign'},
        ],
        'player_characters': [
            {'id': 'pc1', 'user_id': 'keeper1', 'name': 'Character A',
             'private': {'token': 'secret-session', 'story': 'Personal'}},
            {'id': 'pc2', 'user_id': 'member2', 'name': 'Character B'},
            {'id': 'pc3', 'user_id': 'member2',
             'created_by': 'keeper1', 'name': 'Another player GM helped'},
        ],
        'player_notes': [
            {'id': 'note1', 'username': 'keeper1', 'content': 'My private notes'},
            {'id': 'note2', 'username': 'member2', 'content': 'Their secret notes'},
        ],
        'custom_rulesets': [
            {'owner_id': 'mongo-owner', 'name': 'Own pack',
             'shared_with': ['mongo-other'], 'api_key': 'secret'},
            {'owner_id': 'mongo-other', 'name': 'Their private pack'},
        ],
    })


def test_account_owner_can_export_without_leaking_other_players():
    with patch.object(auth, 'db', sample_db()):
        data = asyncio.run(auth.build_personal_data_export('keeper1'))
    assert data['account']['username'] == 'keeper1'
    assert data['account']['email'] == 'keeper1@example.test'
    assert data['campaigns_created'] == [{
        'id': 'campaign1', 'name': 'Original Adventure',
    }]
    assert [c['id'] for c in data['records']['player_characters']] == ['pc1']
    assert [n['id'] for n in data['records']['player_notes']] == ['note1']
    assert data['records']['custom_rulesets'] == [{
        'owner_id': 'mongo-owner', 'name': 'Own pack',
    }]
    assert data['records']['player_characters'][0]['private']['story'] == 'Personal'
    assert 'token' not in data['records']['player_characters'][0]['private']
    payload = str(data)
    for secret in ('TOP-SECRET-HASH', 'SOME-OTHER-HASH', 'Other GM campaign',
                   'Character B', 'Another player GM helped',
                   'Their secret notes', 'secret-session', 'secret'):
        assert secret not in payload


def test_other_member_export_isolated_from_admin_data():
    with patch.object(auth, 'db', sample_db()):
        data = asyncio.run(auth.build_personal_data_export('member2'))
    assert data['account']['username'] == 'member2'
    assert [x['id'] for x in data['records']['player_characters']] == ['pc2', 'pc3']
    assert [x['id'] for x in data['campaigns_created']] == ['campaign2']
    assert 'My private notes' not in str(data)


def test_oversize_export_fails_instead_of_silently_truncating_records():
    db = sample_db()
    with patch.object(auth, 'db', db), patch.object(auth, 'PERSONAL_EXPORT_ROW_LIMIT', 1):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(auth.build_personal_data_export('member2'))
    assert exc.value.status_code == 413
    assert 'Contact support' in str(exc.value.detail)


def test_nonexistent_account_does_not_produce_export():
    with patch.object(auth, 'db', sample_db()):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(auth.build_personal_data_export('no-such-user'))
    assert exc.value.status_code == 404


def test_export_is_a_downloadable_non_cacheable_response():
    with patch.object(auth, 'db', sample_db()):
        response = asyncio.run(auth.export_my_data(current_username='keeper1'))
    assert response.headers['cache-control'] == 'no-store, private'
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert b'keeper1' in response.body
    assert b'Character B' not in response.body

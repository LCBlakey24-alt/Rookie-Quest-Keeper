"""Admin identity and username look-alike protection.

A new account must not be able to claim a configured admin name (or any
existing name) by changing letter case, and an existing look-alike account
must not inherit admin rights.
"""
import asyncio
import importlib.util
import os
import re
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

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

from utils import admin_identity  # noqa: E402

# CI installs only the core backend packages. routes/auth.py imports the email
# client at module level, so give it a stand-in when it isn't installed, and
# load the route file directly instead of importing every router.
try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda params: None)
    )


def _route_module(name):
    spec = importlib.util.spec_from_file_location(f'admin_identity_{name}', ROOT / 'routes' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

ADMINS = ['lcblakey24']
RESERVED = ['admin', 'administrator', 'lcblakey24']


def run(coro):
    return asyncio.run(coro)


def _matches(doc, query):
    condition = query.get('username')
    if isinstance(condition, dict) and '$regex' in condition:
        flags = re.IGNORECASE if 'i' in condition.get('$options', '') else 0
        return re.search(condition['$regex'], doc.get('username', ''), flags) is not None
    return doc.get('username') == condition


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=None):
        return list(self.docs if length is None else self.docs[:length])


class FakeUsers:
    """Just enough of a Motor collection to evaluate username queries."""

    def __init__(self, docs):
        self.docs = docs
        self.queries = []

    async def find_one(self, query, projection=None):
        self.queries.append(query)
        return next((dict(doc) for doc in self.docs if _matches(doc, query)), None)

    def find(self, query, projection=None):
        self.queries.append(query)
        return FakeCursor([dict(doc) for doc in self.docs if _matches(doc, query)])


@pytest.fixture
def configured():
    with patch.object(admin_identity, 'ADMIN_USERNAMES', ADMINS), \
         patch.object(admin_identity, 'RESERVED_USERNAMES', RESERVED):
        yield


def with_users(docs):
    users = FakeUsers(docs)
    return users, patch.object(admin_identity, 'db', SimpleNamespace(users=users))


def test_admin_and_reserved_names_match_in_any_case(configured):
    assert admin_identity.admin_name_matches('LCBlakey24')
    assert admin_identity.admin_name_matches(' lcblakey24 ')
    assert not admin_identity.admin_name_matches('Rook')
    assert admin_identity.is_reserved_username('LCBLAKEY24')
    assert admin_identity.is_reserved_username('Admin')
    assert not admin_identity.is_reserved_username('Rook')
    assert not admin_identity.is_reserved_username('')


def test_reserved_name_is_unavailable_without_a_database_lookup(configured):
    users, patched = with_users([])
    with patched:
        assert run(admin_identity.username_is_available('lcBlakey24')) is False
        assert run(admin_identity.username_is_available('ADMIN')) is False
    assert users.queries == []


def test_existing_name_blocks_a_case_variant(configured):
    users, patched = with_users([{'username': 'Rook'}])
    with patched:
        assert run(admin_identity.username_is_available('rook')) is False
        assert run(admin_identity.username_is_available('ROOK')) is False
        assert run(admin_identity.username_is_available('Rook2')) is True


def test_username_query_is_anchored_and_escaped():
    query = admin_identity.case_insensitive_username_query('a.b')
    assert query == {'username': {'$regex': r'^a\.b$', '$options': 'i'}}
    assert not _matches({'username': 'axb'}, query)


def test_only_the_original_account_holding_an_admin_name_is_admin(configured):
    users, patched = with_users([
        {'username': 'LCBlakey24', 'created_at': '2025-01-01T00:00:00+00:00'},
        {'username': 'lcblakey24', 'created_at': '2026-10-30T09:00:00+00:00'},
    ])
    with patched:
        assert run(admin_identity.is_admin_username('LCBlakey24')) is True
        assert run(admin_identity.is_admin_username('lcblakey24')) is False


def test_legacy_admin_without_created_at_still_wins(configured):
    users, patched = with_users([
        {'username': 'lcblakey24', 'created_at': '2026-10-30T09:00:00+00:00'},
        {'username': 'LCBlakey24'},
    ])
    with patched:
        assert run(admin_identity.is_admin_username('LCBlakey24')) is True
        assert run(admin_identity.is_admin_username('lcblakey24')) is False


def test_sole_admin_account_is_admin_and_other_names_are_not(configured):
    users, patched = with_users([
        {'username': 'LCBlakey24', 'created_at': '2025-01-01T00:00:00+00:00'},
        {'username': 'Rook', 'created_at': '2024-01-01T00:00:00+00:00'},
    ])
    with patched:
        assert run(admin_identity.is_admin_username('LCBlakey24')) is True
        assert run(admin_identity.is_admin_username('Rook')) is False
        assert run(admin_identity.is_admin_username('')) is False
        assert run(admin_identity.is_admin_username(None)) is False


def test_admin_name_with_no_matching_account_is_not_admin(configured):
    users, patched = with_users([])
    with patched:
        assert run(admin_identity.is_admin_username('lcblakey24')) is False


def test_require_admin_rejects_look_alike(configured):
    users, patched = with_users([
        {'username': 'LCBlakey24', 'created_at': '2025-01-01T00:00:00+00:00'},
        {'username': 'lcblakey24', 'created_at': '2026-10-30T09:00:00+00:00'},
    ])
    with patched:
        run(admin_identity.require_admin('LCBlakey24'))
        with pytest.raises(HTTPException) as denied:
            run(admin_identity.require_admin('lcblakey24'))
    assert denied.value.status_code == 403


def test_register_rejects_admin_look_alike(configured):
    auth_routes = _route_module('auth')
    from models import UserRegister

    users, patched = with_users([
        {'username': 'LCBlakey24', 'created_at': '2025-01-01T00:00:00+00:00'},
    ])
    users.insert_one = AsyncMock()
    with patched, patch.object(auth_routes, 'db', SimpleNamespace(users=users)), \
         patch.object(auth_routes, 'require_signups_enabled', AsyncMock()):
        with pytest.raises(HTTPException) as rejected:
            run(auth_routes.register(UserRegister(username='lcblakey24', password='long-enough-1')))
    assert rejected.value.status_code == 400
    assert rejected.value.detail == admin_identity.USERNAME_UNAVAILABLE
    users.insert_one.assert_not_awaited()


def test_register_rejects_case_variant_of_existing_player(configured):
    auth_routes = _route_module('auth')
    from models import UserRegister

    users, patched = with_users([{'username': 'TableRook', 'created_at': '2025-01-01T00:00:00+00:00'}])
    users.insert_one = AsyncMock()
    with patched, patch.object(auth_routes, 'db', SimpleNamespace(users=users)), \
         patch.object(auth_routes, 'require_signups_enabled', AsyncMock()):
        with pytest.raises(HTTPException) as rejected:
            run(auth_routes.register(UserRegister(username='tablerook', password='long-enough-1')))
    assert rejected.value.status_code == 400
    users.insert_one.assert_not_awaited()


def test_register_accepts_a_new_name(configured):
    auth_routes = _route_module('auth')
    from models import UserRegister

    users, patched = with_users([{'username': 'TableRook', 'created_at': '2025-01-01T00:00:00+00:00'}])
    users.insert_one = AsyncMock()
    with patched, patch.object(auth_routes, 'db', SimpleNamespace(users=users)), \
         patch.object(auth_routes, 'require_signups_enabled', AsyncMock()), \
         patch.object(auth_routes, 'hash_password', return_value='hashed'), \
         patch.object(auth_routes, 'create_token', return_value='token-1'):
        result = run(auth_routes.register(UserRegister(username='NewRook', password='long-enough-1')))
    assert result.username == 'NewRook'
    users.insert_one.assert_awaited_once()

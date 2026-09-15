import asyncio
import importlib.util
import os
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

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


def route_module(name):
    spec = importlib.util.spec_from_file_location('fast_auth_' + name, ROOT / 'routes' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


login_routes = route_module('auth_login_fast')


class FakeRoute:
    def __init__(self, path, methods):
        self.path = path
        self.methods = set(methods)


class FakeUsers:
    def __init__(self, user):
        self.user = user
        self.queries = []

    async def find_one(self, query):
        self.queries.append(query)
        return self.user


def run(coro):
    return asyncio.run(coro)


class FastLoginTests(unittest.TestCase):
    def test_remover_only_removes_legacy_login(self):
        login = FakeRoute('/auth/login', {'POST'})
        register = FakeRoute('/auth/register', {'POST'})
        me = FakeRoute('/auth/me', {'GET'})
        router = SimpleNamespace(routes=[login, register, me])

        self.assertEqual(login_routes.remove_legacy_auth_login_route(router), 1)
        self.assertEqual(router.routes, [register, me])

    def test_lookup_uses_one_or_query_for_email_or_username(self):
        query = login_routes.login_lookup_query(SimpleNamespace(
            username=' Player@Example.com ', email=None, password='secret'
        ))
        self.assertEqual(query, {'$or': [
            {'email': 'player@example.com'},
            {'username': 'Player@Example.com'},
            {'username': 'player@example.com'},
        ]})

        username_query = login_routes.login_lookup_query(SimpleNamespace(
            username='Rook', email=None, password='secret'
        ))
        self.assertEqual(username_query, {'$or': [
            {'username': 'Rook'},
            {'email': 'rook'},
        ]})

    def test_successful_login_uses_single_lookup_and_threaded_password_check(self):
        users = FakeUsers({
            'username': 'Rook',
            'email': 'rook@example.com',
            'password_hash': 'hash',
        })
        threaded = AsyncMock(return_value=True)

        with patch.object(login_routes, 'db', SimpleNamespace(users=users)), \
             patch.object(login_routes, 'run_in_threadpool', threaded), \
             patch.object(login_routes, 'create_token', return_value='token-1'):
            result = run(login_routes.login_fast(SimpleNamespace(
                username='Rook', email=None, password='secret'
            )))

        self.assertEqual(len(users.queries), 1)
        threaded.assert_awaited_once_with(login_routes.verify_password, 'secret', 'hash')
        self.assertEqual(result.token, 'token-1')
        self.assertEqual(result.username, 'Rook')

    def test_missing_user_or_bad_password_returns_401(self):
        users = FakeUsers(None)
        threaded = AsyncMock(return_value=True)
        with patch.object(login_routes, 'db', SimpleNamespace(users=users)), \
             patch.object(login_routes, 'run_in_threadpool', threaded):
            with self.assertRaises(HTTPException) as missing:
                run(login_routes.login_fast(SimpleNamespace(
                    username='Missing', email=None, password='secret'
                )))
        self.assertEqual(missing.exception.status_code, 401)
        threaded.assert_not_awaited()

        users = FakeUsers({'username': 'Rook', 'password_hash': 'hash'})
        threaded = AsyncMock(return_value=False)
        with patch.object(login_routes, 'db', SimpleNamespace(users=users)), \
             patch.object(login_routes, 'run_in_threadpool', threaded):
            with self.assertRaises(HTTPException) as rejected:
                run(login_routes.login_fast(SimpleNamespace(
                    username='Rook', email=None, password='wrong'
                )))
        self.assertEqual(rejected.exception.status_code, 401)


if __name__ == '__main__':
    unittest.main()

import asyncio
import importlib.util
import os
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda params: None)
    )

from models import UserRegister
spec = importlib.util.spec_from_file_location('auth_username_validation', ROOT / 'routes' / 'auth.py')
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)
normalize_username_for_auth = auth.normalize_username_for_auth
register = auth.register


def test_normalize_username_accepts_safe_nicknames():
    assert normalize_username_for_auth('  Kid_Rogue-7  ') == 'Kid_Rogue-7'


@pytest.mark.parametrize('username', ['', 'ab', 'too long username for rook kids', 'kid@example.com', 'real name', 'name!'])
def test_normalize_username_rejects_unsafe_values(username):
    with pytest.raises(HTTPException) as exc:
        normalize_username_for_auth(username)

    assert exc.value.status_code == 400
    assert 'Username must be 3-24 characters' in exc.value.detail or exc.value.detail == 'Username is required'


def test_registration_requires_email_but_not_a_username():
    assert UserRegister(email='Hero@Example.com', password='strong-password').username is None
    with pytest.raises(ValidationError):
        UserRegister(username='Hero', password='strong-password')


def test_registration_generates_stable_internal_handle_without_changing_email():
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    with patch.object(auth, 'require_signups_enabled', new=AsyncMock()), \
         patch.object(auth, 'username_is_available', new=AsyncMock(return_value=True)), \
         patch.object(auth, 'db', SimpleNamespace(users=users)), \
         patch.object(auth, 'hash_password', return_value='hashed'), \
         patch.object(auth, 'create_token', return_value='token'):
        result = asyncio.run(register(UserRegister(email='Hero@Example.com', password='strong-password')))
    assert result.username == 'hero'
    assert result.email == 'hero@example.com'
    assert users.insert_one.await_args.args[0]['username'] == 'hero'
    assert users.insert_one.await_args.args[0]['email'] == 'hero@example.com'


def test_generated_handle_uses_a_suffix_when_taken():
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    available = AsyncMock(side_effect=[False, True])
    with patch.object(auth, 'require_signups_enabled', new=AsyncMock()), \
         patch.object(auth, 'username_is_available', new=available), \
         patch.object(auth, 'db', SimpleNamespace(users=users)), \
         patch.object(auth, 'hash_password', return_value='hashed'), \
         patch.object(auth, 'create_token', return_value='token'):
        result = asyncio.run(register(UserRegister(email='hero@example.com', password='strong-password')))
    assert result.username == 'hero2'
    assert users.insert_one.await_args.args[0]['username'] == 'hero2'

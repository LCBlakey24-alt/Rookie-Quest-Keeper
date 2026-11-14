"""New public accounts are adult-only pending proper child onboarding.

These tests use in-memory mocks. This self-declaration is not verified age.
Existing users still authenticate without any retrospective age assertion.
"""
import asyncio
import importlib.util
import os
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
    'DB_NAME': 'rqk_registration_age_tests',
    'JWT_SECRET_KEY': 'local-age-gate-test-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
    'GOOGLE_CLIENT_ID': 'test-client.apps.googleusercontent.com',
}.items():
    os.environ.setdefault(key, value)

try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda _p: None)
    )

from models import UserRegister  # noqa: E402
from utils.registration_age import adult_attestation_record, require_public_adult_attestation  # noqa: E402


def module(name):
    spec = importlib.util.spec_from_file_location(
        f'rqk_age_{name}', ROOT / 'routes' / f'{name}.py'
    )
    imported = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(imported)
    return imported


auth = module('auth')
google = module('auth_login_fast')


@pytest.mark.parametrize('declared', [False, None, 0])
def test_adult_gate_fails_closed(declared):
    with pytest.raises(HTTPException) as rejected:
        require_public_adult_attestation(declared)
    assert rejected.value.status_code == 403
    assert '18' in rejected.value.detail


def test_no_date_of_birth_is_collected():
    require_public_adult_attestation(True)
    record = adult_attestation_record()
    assert set(record) == {'self_declared_adult_at', 'self_declared_adult_method'}
    assert record['self_declared_adult_method'] == 'adult-self-declaration'
    assert 'birth' not in str(record).lower()


def test_password_registration_without_declaration_never_reads_or_writes_accounts():
    db = SimpleNamespace(users=SimpleNamespace(find_one=AsyncMock(), insert_one=AsyncMock()))
    with patch.object(auth, 'db', db), \
         patch.object(auth, 'require_signups_enabled', AsyncMock()), \
         patch.object(auth, 'hash_password') as hash_password:
        with pytest.raises(HTTPException) as rejected:
            asyncio.run(auth.register(UserRegister(
                email='new@example.test', password='a-long-password',
            )))
    assert rejected.value.status_code == 403
    db.users.find_one.assert_not_awaited()
    db.users.insert_one.assert_not_awaited()
    hash_password.assert_not_called()


def test_password_signup_records_attestation_and_not_a_birth_date():
    db = SimpleNamespace(users=SimpleNamespace(
        find_one=AsyncMock(return_value=None), insert_one=AsyncMock(),
    ))
    with patch.object(auth, 'db', db), \
         patch.object(auth, 'require_signups_enabled', AsyncMock()), \
         patch.object(auth, 'username_is_available', AsyncMock(return_value=True)), \
         patch.object(auth, 'hash_password', return_value='hashed'), \
         patch.object(auth, 'create_token', return_value='token'):
        result = asyncio.run(auth.register(UserRegister(
            email='adult@example.test', password='a-long-password',
            adult_self_attested=True,
        )))
    assert result.email == 'adult@example.test'
    stored = db.users.insert_one.await_args.args[0]
    assert stored['self_declared_adult_at']
    assert stored['self_declared_adult_method'] == 'adult-self-declaration'
    assert 'dob' not in stored
    assert 'birth_date' not in stored


def test_google_new_signup_missing_declaration_is_blocked_before_hashing():
    users = SimpleNamespace(
        find_one=AsyncMock(side_effect=[None, None]), insert_one=AsyncMock()
    )
    claims = {'sub': 'google-new', 'email': 'new@gmail.com', 'email_verified': True}
    threaded = AsyncMock(return_value=claims)
    with patch.object(google, 'db', SimpleNamespace(users=users)), \
         patch.object(google, 'require_signups_enabled', AsyncMock()), \
         patch.object(google, 'run_in_threadpool', threaded), \
         patch.object(google, 'GOOGLE_CLIENT_ID', 'client'):
        with pytest.raises(HTTPException) as rejected:
            asyncio.run(google.login_google(
                google.GoogleLoginRequest(credential='g1', username='NewRook')
            ))
    assert rejected.value.status_code == 403
    users.insert_one.assert_not_awaited()
    assert threaded.await_count == 1  # Google token verification only


def test_google_existing_account_can_sign_in_without_new_age_declaration():
    existing = {'username': 'ExistingMember', 'google_sub': 'g-123', 'email': 'existing@gmail.com'}
    users = SimpleNamespace(find_one=AsyncMock(return_value=existing))
    claims = {'sub': 'g-123', 'email': 'existing@gmail.com', 'email_verified': True}
    with patch.object(google, 'db', SimpleNamespace(users=users)), \
         patch.object(google, 'run_in_threadpool', AsyncMock(return_value=claims)), \
         patch.object(google, 'GOOGLE_CLIENT_ID', 'client'), \
         patch.object(google, 'create_token', return_value='token'):
        result = asyncio.run(google.login_google(
            google.GoogleLoginRequest(credential='g1')
        ))
    assert result['username'] == 'ExistingMember'
    assert result['token'] == 'token'

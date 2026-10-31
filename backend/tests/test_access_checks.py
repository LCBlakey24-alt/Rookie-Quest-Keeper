"""Access checks: shared rule systems, combat tokens and the sign-up switch."""
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
    'DB_NAME': 'rookiequestkeeper_test',
    'JWT_SECRET_KEY': 'unit-test-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(key, value)

from utils import site_settings  # noqa: E402

# CI installs only the core backend packages: stand in for the email client and
# load single route files rather than importing every router.
try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda params: None)
    )


def _route_module(name):
    spec = importlib.util.spec_from_file_location(f'access_checks_{name}', ROOT / 'routes' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(coro):
    return asyncio.run(coro)


# --- Sign-up switch -----------------------------------------------------------------------

def _settings(doc):
    return SimpleNamespace(site_settings=SimpleNamespace(find_one=AsyncMock(return_value=doc)))


@pytest.mark.parametrize('doc, expected', [
    (None, True),
    ({}, True),
    ({'signup_enabled': True}, True),
    ({'signup_enabled': False}, False),
])
def test_signups_enabled_reads_the_admin_switch(doc, expected):
    with patch.object(site_settings, 'db', _settings(doc)):
        assert run(site_settings.signups_enabled()) is expected


def test_paused_signups_block_password_registration():
    from models import UserRegister
    auth_routes = _route_module('auth')

    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    with patch.object(site_settings, 'db', _settings({'signup_enabled': False})), \
         patch.object(auth_routes, 'db', SimpleNamespace(users=users)):
        with pytest.raises(HTTPException) as paused:
            run(auth_routes.register(UserRegister(username='NewRook', password='long-enough-1')))
    assert paused.value.status_code == 403
    assert paused.value.detail == site_settings.SIGNUPS_PAUSED
    users.insert_one.assert_not_awaited()


def test_paused_signups_still_let_existing_google_players_in():
    login_routes = _route_module('auth_login_fast')

    claims = {'sub': 'google-1', 'email': 'rook@gmail.com', 'email_verified': True}
    existing = {'_id': 'm1', 'username': 'Rook', 'google_sub': 'google-1'}
    paused = AsyncMock(side_effect=HTTPException(status_code=403, detail='paused'))

    with patch.object(login_routes, 'db', SimpleNamespace(users=SimpleNamespace(find_one=AsyncMock(return_value=existing)))), \
         patch.object(login_routes, 'run_in_threadpool', AsyncMock(return_value=claims)), \
         patch.object(login_routes, 'require_signups_enabled', paused), \
         patch.object(login_routes, 'create_token', return_value='token-1'), \
         patch.object(login_routes, 'GOOGLE_CLIENT_ID', 'client'):
        result = run(login_routes.login_google(login_routes.GoogleLoginRequest(credential='c')))
    assert result['username'] == 'Rook'
    paused.assert_not_awaited()

    new_player = SimpleNamespace(find_one=AsyncMock(side_effect=[None, None]), insert_one=AsyncMock())
    with patch.object(login_routes, 'db', SimpleNamespace(users=new_player)), \
         patch.object(login_routes, 'run_in_threadpool', AsyncMock(return_value=claims)), \
         patch.object(login_routes, 'require_signups_enabled', paused), \
         patch.object(login_routes, 'GOOGLE_CLIENT_ID', 'client'):
        with pytest.raises(HTTPException) as blocked:
            run(login_routes.login_google(login_routes.GoogleLoginRequest(credential='c', username='NewRook')))
    assert blocked.value.status_code == 403
    new_player.insert_one.assert_not_awaited()


# --- Shared rule systems ------------------------------------------------------------------

def _rule_db(system):
    collection = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock(), update_one=AsyncMock())
    return SimpleNamespace(
        rule_systems=SimpleNamespace(find_one=AsyncMock(return_value=system)),
        game_classes=collection, game_subclasses=collection, game_races=collection,
        game_spells=collection, game_items=collection, game_feats=collection,
        game_monsters=collection, class_level_features=collection,
    ), collection


def _upload():
    from models import ContentUpload
    return ContentUpload(system_id='starter-fantasy', content_type='classes', data=[{'name': 'Hexblade'}], overwrite_existing=True)


def test_non_admin_cannot_write_into_the_unowned_starter_system():
    rule_systems = _route_module('rule_systems')
    fake_db, collection = _rule_db({'id': 'starter-fantasy', 'owner_id': None})
    with patch.object(rule_systems, 'db', fake_db), patch.object(rule_systems, 'is_admin', AsyncMock(return_value=False)):
        with pytest.raises(HTTPException) as denied:
            run(rule_systems.bulk_upload_content('starter-fantasy', _upload(), username='Rook'))
    assert denied.value.status_code == 403
    collection.insert_one.assert_not_awaited()
    collection.update_one.assert_not_awaited()


def test_admin_and_owner_can_still_upload():
    rule_systems = _route_module('rule_systems')
    fake_db, collection = _rule_db({'id': 'starter-fantasy', 'owner_id': None})
    with patch.object(rule_systems, 'db', fake_db), patch.object(rule_systems, 'is_admin', AsyncMock(return_value=True)):
        result = run(rule_systems.bulk_upload_content('starter-fantasy', _upload(), username='LCBlakey24'))
    assert result['created'] == 1

    fake_db, collection = _rule_db({'id': 'mine', 'owner_id': 'Rook'})
    with patch.object(rule_systems, 'db', fake_db), patch.object(rule_systems, 'is_admin', AsyncMock(return_value=False)):
        result = run(rule_systems.bulk_upload_content('mine', _upload(), username='Rook'))
    assert result['created'] == 1


# --- Combat tokens ------------------------------------------------------------------------

@pytest.mark.parametrize('call', [
    lambda ai: ai.get_campaign_tokens('campaign-1', username='Stranger'),
    lambda ai: ai.get_entity_token('campaign-1', 'npc-1', username='Stranger'),
])
def test_combat_tokens_require_campaign_membership(call):
    ai = _route_module('ai')
    tokens = SimpleNamespace(find=AsyncMock(), find_one=AsyncMock())
    denied = AsyncMock(side_effect=HTTPException(status_code=403, detail='You must be a member of this campaign'))
    with patch.object(ai, 'db', SimpleNamespace(combat_tokens=tokens)), \
         patch.object(ai, 'verify_campaign_membership', denied):
        with pytest.raises(HTTPException) as blocked:
            run(call(ai))
    assert blocked.value.status_code == 403
    denied.assert_awaited_once_with('campaign-1', 'Stranger')
    tokens.find_one.assert_not_awaited()

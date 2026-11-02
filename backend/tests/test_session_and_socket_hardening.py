"""Session versions, live-socket tracking and message limits."""
import asyncio
import importlib.util
import json
import os
import re
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

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

from utils import auth as auth_utils  # noqa: E402
from utils.ws_manager import ConnectionManager  # noqa: E402
from utils.ws_messages import (  # noqa: E402
    GM_ONLY_MESSAGE_TYPES,
    MAX_CLIENT_MESSAGE_CHARS,
    parse_client_message,
)

try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda params: None)
    )


def _route_module(name):
    spec = importlib.util.spec_from_file_location(f'hardening_{name}', ROOT / 'routes' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(coro):
    return asyncio.run(coro)


def _claims(token):
    return jwt.decode(token, auth_utils.JWT_SECRET, algorithms=[auth_utils.JWT_ALGORITHM])


def _credentials(token):
    return HTTPAuthorizationCredentials(scheme='Bearer', credentials=token)


def _users_db(user):
    return SimpleNamespace(users=SimpleNamespace(find_one=AsyncMock(return_value=user)))


# --- Session versions ---------------------------------------------------------------------

def test_tokens_carry_the_session_version():
    assert _claims(auth_utils.create_token('Rook'))['tv'] == 0
    assert _claims(auth_utils.create_token('Rook', 3))['tv'] == 3
    assert auth_utils.session_version(None) == 0
    assert auth_utils.session_version({'token_version': '2'}) == 2


def test_token_from_before_a_password_change_is_rejected():
    old_token = auth_utils.create_token('Rook', 0)
    with patch.object(auth_utils, 'db', _users_db({'username': 'Rook', 'token_version': 1})):
        with pytest.raises(HTTPException) as expired:
            run(auth_utils.get_current_user(_credentials(old_token)))
    assert expired.value.status_code == 401


def test_current_and_legacy_tokens_still_work():
    with patch.object(auth_utils, 'db', _users_db({'username': 'Rook', 'token_version': 2})):
        assert run(auth_utils.get_current_user(_credentials(auth_utils.create_token('Rook', 2)))) == 'Rook'

    legacy = jwt.encode({'sub': 'Rook'}, auth_utils.JWT_SECRET, algorithm=auth_utils.JWT_ALGORITHM)
    with patch.object(auth_utils, 'db', _users_db({'username': 'Rook'})):
        assert run(auth_utils.get_current_user(_credentials(legacy))) == 'Rook'


def test_changing_password_signs_out_other_sessions_but_not_this_one():
    auth_routes = _route_module('auth')
    from models import ChangePasswordRequest

    users = SimpleNamespace(
        find_one=AsyncMock(return_value={'username': 'Rook', 'password_hash': 'old', 'token_version': 4}),
        update_one=AsyncMock(),
    )
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users)), \
         patch.object(auth_routes, 'verify_password', return_value=True), \
         patch.object(auth_routes, 'hash_password', return_value='new-hash'):
        result = run(auth_routes.change_password(
            ChangePasswordRequest(current_password='old-password', new_password='new-password-1'),
            current_username='Rook',
        ))

    query, update = users.update_one.await_args.args
    assert query == {'username': 'Rook'}
    assert update == {'$set': {'password_hash': 'new-hash', 'token_version': 5}}
    assert _claims(result['token'])['tv'] == 5
    assert _claims(result['token'])['sub'] == 'Rook'


def test_missing_email_provider_reports_outage_for_every_address():
    auth_routes = _route_module('auth')
    from models import ForgotPasswordRequest

    users = SimpleNamespace(find_one=AsyncMock())
    with patch.object(auth_routes, 'EMAIL_DELIVERY_CONFIGURED', False), \\
         patch.object(auth_routes, 'db', SimpleNamespace(users=users)):
        with pytest.raises(HTTPException) as missing:
            run(auth_routes.forgot_password(ForgotPasswordRequest(email='player@example.com')))
    assert missing.value.status_code == 503
    users.find_one.assert_not_awaited()


def test_failed_recovery_send_does_not_invalidate_previous_good_link():
    auth_routes = _route_module('auth')
    from models import ForgotPasswordRequest

    users = SimpleNamespace(find_one=AsyncMock(return_value={'email': 'player@example.com'}))
    resets = SimpleNamespace(
        insert_one=AsyncMock(),
        delete_one=AsyncMock(),
        delete_many=AsyncMock(),
    )
    with patch.object(auth_routes, 'EMAIL_DELIVERY_CONFIGURED', True), \\
         patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \\
         patch.object(auth_routes.resend.Emails, 'send', side_effect=RuntimeError('provider down')):
        response = run(auth_routes.forgot_password(ForgotPasswordRequest(email='player@example.com')))

    assert response['message'].startswith('If an account exists')
    resets.insert_one.assert_awaited_once()
    resets.delete_one.assert_awaited_once()
    assert resets.delete_one.await_args.args[0]['token'] == resets.insert_one.await_args.args[0]['token']
    resets.delete_many.assert_not_awaited()


def test_accepted_recovery_send_retires_only_older_links():
    auth_routes = _route_module('auth')
    from models import ForgotPasswordRequest

    users = SimpleNamespace(find_one=AsyncMock(return_value={'email': 'player@example.com'}))
    resets = SimpleNamespace(
        insert_one=AsyncMock(),
        delete_one=AsyncMock(),
        delete_many=AsyncMock(),
    )
    with patch.object(auth_routes, 'EMAIL_DELIVERY_CONFIGURED', True), \\
         patch.object(auth_routes, 'APP_URL', 'https://rookiequestkeeper.com/'), \\
         patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \\
         patch.object(auth_routes.resend.Emails, 'send', return_value={'id': 'provider-message-id'}) as sender:
        response = run(auth_routes.forgot_password(ForgotPasswordRequest(email='Player@Example.com')))

    assert response['message'].startswith('If an account exists')
    inserted = resets.insert_one.await_args.args[0]
    assert inserted['email'] == 'player@example.com'
    assert inserted['token']
    assert inserted['token'] in sender.call_args.args[0]['html']
    assert 'https://rookiequestkeeper.com/reset-password?token=' in sender.call_args.args[0]['html']
    resets.delete_one.assert_not_awaited()
    resets.delete_many.assert_awaited_once_with({
        'email': 'player@example.com',
        'token': {'$ne': inserted['token']},
    })


def test_unknown_recovery_email_never_sends_email():
    auth_routes = _route_module('auth')
    from models import ForgotPasswordRequest

    users = SimpleNamespace(find_one=AsyncMock(return_value=None))
    resets = SimpleNamespace(insert_one=AsyncMock())
    with patch.object(auth_routes, 'EMAIL_DELIVERY_CONFIGURED', True), \\
         patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \\
         patch.object(auth_routes.resend.Emails, 'send') as sender:
        response = run(auth_routes.forgot_password(ForgotPasswordRequest(email='unknown@example.com')))
    assert response['message'].startswith('If an account exists')
    resets.insert_one.assert_not_awaited()
    sender.assert_not_called()


def test_password_reset_signs_out_every_session():
    auth_routes = _route_module('auth')
    from models import ResetPasswordRequest

    resets = SimpleNamespace(
        find_one_and_delete=AsyncMock(return_value={'email': 'rook@example.com', 'token': 't', 'expires_at': '2999-01-01T00:00:00+00:00'}),
    )
    users = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)))
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \
         patch.object(auth_routes, 'hash_password', return_value='new-hash'):
        run(auth_routes.reset_password(ResetPasswordRequest(token='t', new_password='new-password-1')))

    _query, update = users.update_one.await_args.args
    assert update['$inc'] == {'token_version': 1}
    assert update['$set']['password_hash'] == 'new-hash'



def test_password_reset_token_is_consumed_once_even_for_repeated_requests():
    auth_routes = _route_module('auth')
    from models import ResetPasswordRequest

    record = {'email': 'rook@example.com', 'token': 'single-use', 'expires_at': '2999-01-01T00:00:00+00:00'}
    resets = SimpleNamespace(find_one_and_delete=AsyncMock(side_effect=[record, None]))
    users = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)))
    request = ResetPasswordRequest(token='single-use', new_password='new-password-1')

    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \
         patch.object(auth_routes, 'hash_password', return_value='new-hash'):
        assert run(auth_routes.reset_password(request))['message'] == 'Password reset successful'
        with pytest.raises(HTTPException) as consumed:
            run(auth_routes.reset_password(request))
    assert consumed.value.status_code == 400
    assert resets.find_one_and_delete.await_count == 2
    users.update_one.assert_awaited_once()


def test_expired_password_reset_token_cannot_change_password():
    auth_routes = _route_module('auth')
    from models import ResetPasswordRequest

    resets = SimpleNamespace(find_one_and_delete=AsyncMock(return_value={
        'email': 'rook@example.com', 'expires_at': '2000-01-01T00:00:00+00:00',
    }))
    users = SimpleNamespace(update_one=AsyncMock())
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)):
        with pytest.raises(HTTPException) as expired:
            run(auth_routes.reset_password(ResetPasswordRequest(token='old', new_password='new-password-1')))
    assert expired.value.status_code == 400
    users.update_one.assert_not_awaited()


def test_token_of_deleted_account_cannot_report_a_successful_reset():
    auth_routes = _route_module('auth')
    from models import ResetPasswordRequest

    resets = SimpleNamespace(find_one_and_delete=AsyncMock(return_value={
        'email': 'missing@example.com', 'expires_at': '2999-01-01T00:00:00+00:00',
    }))
    users = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=0)))
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \
         patch.object(auth_routes, 'hash_password', return_value='new-hash'):
        with pytest.raises(HTTPException) as missing:
            run(auth_routes.reset_password(ResetPasswordRequest(token='orphan', new_password='new-password-1')))
    assert missing.value.status_code == 400


def test_rule_system_lookup_treats_the_name_as_text():
    campaigns = SimpleNamespace(find_one=AsyncMock(return_value={'id': 'c1', 'system': 'D&D (5e)+'}))
    systems = SimpleNamespace(find_one=AsyncMock(return_value=None))
    with patch.object(auth_utils, 'db', SimpleNamespace(campaigns=campaigns, rule_systems=systems)):
        run(auth_utils.get_campaign_rule_system('c1'))
    first_query = systems.find_one.await_args_list[0].args[0]
    assert first_query['name']['$regex'] == r'D\&D\ \(5e\)\+'


def test_ai_routes_do_not_echo_exception_text():
    # Provider errors can include request details or partial keys; they are
    # logged server-side and players see a plain retry message instead.
    source = (ROOT / 'routes' / 'ai.py').read_text()
    assert re.search(r'detail=f"[^"]*\{(str\()?e\)?\}', source) is None


# --- Live sockets -------------------------------------------------------------------------

class FakeSocket:
    def __init__(self, name, fail=False):
        self.name = name
        self.fail = fail
        self.sent = []

    async def accept(self):
        return None

    async def send_json(self, message):
        if self.fail:
            raise RuntimeError('closed')
        self.sent.append(message)

    def __repr__(self):
        return f'<FakeSocket {self.name}>'


def test_closing_one_of_the_gms_windows_keeps_them_in_the_campaign():
    manager = ConnectionManager()
    gm_screen, display, player = FakeSocket('gm'), FakeSocket('display'), FakeSocket('player')

    run(manager.connect(player, 'Pip', 'c1'))
    run(manager.connect(gm_screen, 'GM', 'c1'))
    run(manager.connect(display, 'GM', 'c1'))

    joins = [m for m in player.sent if m['type'] == 'user_joined']
    assert [m['user_id'] for m in joins] == ['GM']  # second GM window is not a new arrival

    assert manager.disconnect(display, 'GM', 'c1') is False
    assert manager.get_campaign_users('c1') == {'GM', 'Pip'}

    run(manager.send_to_user('GM', {'type': 'ping'}))
    assert gm_screen.sent[-1] == {'type': 'ping'}

    assert manager.disconnect(gm_screen, 'GM', 'c1') is True
    assert manager.get_campaign_users('c1') == {'Pip'}


def test_dead_sockets_are_dropped_on_broadcast():
    manager = ConnectionManager()
    alive, dead = FakeSocket('alive'), FakeSocket('dead', fail=True)
    run(manager.connect(alive, 'Pip', 'c1'))
    run(manager.connect(dead, 'Quill', 'c1'))
    run(manager.broadcast_to_campaign('c1', {'type': 'dice_roll'}))
    assert manager.get_campaign_users('c1') == {'Pip'}
    assert 'Quill' not in manager.user_sockets


def test_socket_messages_are_size_capped_json_objects():
    assert parse_client_message(json.dumps({'type': 'ping'})) == {'type': 'ping'}
    assert parse_client_message('not json') is None
    assert parse_client_message('[1, 2]') is None
    assert parse_client_message(None) is None
    huge = json.dumps({'type': 'chat_message', 'message': 'x' * MAX_CLIENT_MESSAGE_CHARS})
    assert parse_client_message(huge) is None
    assert GM_ONLY_MESSAGE_TYPES == {'map_update', 'initiative_update'}

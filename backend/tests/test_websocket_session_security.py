"""The live campaign WebSocket follows the HTTP session policy, for its whole life.

Integration tests: the real `server.websocket_campaign_sync` endpoint over a
real WebSocket (Starlette TestClient), with an in-memory database standing
in for Mongo. Every user, campaign and token here is synthetic.

The vulnerability: the socket authenticated with `verify_token` (signature
and expiry only), so tokens retired by a password change/reset or belonging
to a deleted account still connected; and nothing re-checked an open
socket, so revocation, expiry or removal from the campaign never ended it.
"""
import os
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import jwt
import pytest

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

import types as _types  # noqa: E402

try:  # CI's focused route job does not install the email SDK
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = _types.SimpleNamespace(
        api_key=None, Emails=_types.SimpleNamespace(send=lambda params: None))

from fastapi import FastAPI  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402
from starlette.websockets import WebSocketDisconnect  # noqa: E402

from utils import live_socket as server  # noqa: E402  (the endpoint module)
from utils import auth as auth_utils  # noqa: E402
from utils.ws_manager import ws_manager  # noqa: E402

try:  # absent on the vulnerable implementation; the tests still run there
    from utils import ws_session
except ImportError:  # pragma: no cover
    ws_session = None

CAMPAIGN = 'synthetic-campaign'
GM, PLAYER, OUTSIDER, CHILD = 'synthetic-gm', 'synthetic-player', 'synthetic-outsider', 'synthetic-child'
INTERVAL = 0.05  # revalidation interval under test, seconds


class Collection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None


class FakeDb:
    def __init__(self):
        self.users = Collection([
            {'username': GM, 'token_version': 0},
            {'username': PLAYER, 'token_version': 0},
            {'username': OUTSIDER, 'token_version': 0},
            {'username': CHILD, 'token_version': 0},
        ])
        self.campaigns = Collection([{'id': CAMPAIGN, 'dm_user_id': GM, 'name': 'Synthetic'}])
        self.campaign_members = Collection([
            {'campaign_id': CAMPAIGN, 'user_id': PLAYER, 'status': 'active'},
            {'campaign_id': CAMPAIGN, 'user_id': CHILD, 'status': 'active'},
        ])
        self.player_characters = Collection([])

    def bump_session(self, username):
        for doc in self.users.docs:
            if doc['username'] == username:
                doc['token_version'] = doc.get('token_version', 0) + 1

    def delete_user(self, username):
        self.users.docs = [d for d in self.users.docs if d['username'] != username]

    def set_member_status(self, username, state):
        for doc in self.campaign_members.docs:
            if doc['user_id'] == username:
                doc['status'] = state


def token(username, tv=0, minutes=60, secret=None, **extra):
    payload = {'sub': username, 'tv': tv, 'iat': datetime.now(timezone.utc),
               'exp': datetime.now(timezone.utc) + timedelta(minutes=minutes), **extra}
    return jwt.encode(payload, secret or auth_utils.JWT_SECRET, algorithm=auth_utils.JWT_ALGORITHM)


@pytest.fixture
def db():
    fake = FakeDb()
    patches = [patch.object(auth_utils, 'db', fake)]
    if ws_session is not None:
        patches.append(patch.object(ws_session, 'REVALIDATE_SECONDS', INTERVAL))
    for p in patches:
        p.start()
    ws_manager.campaign_sockets.clear()
    ws_manager.user_sockets.clear()
    getattr(ws_manager, 'sessions', {}).clear()
    yield fake
    for p in patches:
        p.stop()


@pytest.fixture
def client():
    app = FastAPI()
    app.add_api_websocket_route('/ws/campaign/{campaign_id}', server.websocket_campaign_sync)
    # server.py registers the same function at the same path; see
    # test_server_registers_the_hardened_endpoint.
    with TestClient(app) as test_client:
        yield test_client


ALLOWED_ORIGIN = os.environ['CORS_ORIGINS'].split(',')[0].strip()


@contextmanager
def live(client, tok, campaign=CAMPAIGN, origin=ALLOWED_ORIGIN):
    """Open a live socket the way the web app does.

    Origin header from a trusted site, no token in the URL, and the token as
    the first message. Yields once the server has answered auth_ok; a refusal
    surfaces as WebSocketDisconnect with the close code.
    """
    with client.websocket_connect(f'/ws/campaign/{campaign}', headers={'origin': origin}) as ws:
        ws.send_json({'type': 'auth', 'token': tok})
        reply = ws.receive_json()
        assert reply == {'type': 'auth_ok'}, reply
        yield ws


# The pre-fix URL form, kept to prove it is now refused.
def url(tok, campaign=CAMPAIGN):
    return f'/ws/campaign/{campaign}?token={tok}'


def expect_refused(client, tok, campaign=CAMPAIGN):
    with pytest.raises(WebSocketDisconnect) as refused:
        with live(client, tok, campaign) as ws:
            ws.send_json({'type': 'ping'})
            ws.receive_json()
    return refused.value


def ping(ws):
    ws.send_json({'type': 'ping'})
    return ws.receive_json()


def receive_until_closed(ws, limit=20):
    """Drain everything up to the close; return (messages, close code)."""
    seen = []
    for _ in range(limit):
        try:
            seen.append(ws.receive_json())
        except WebSocketDisconnect as closed:
            return seen, closed.code
    raise AssertionError(f'socket stayed open; received {seen}')


def wait_for(predicate, timeout=3.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return predicate()


# 1 ---------------------------------------------------------------------------
def test_valid_token_connects(db, client):
    with live(client, token(PLAYER)) as ws:
        assert ping(ws) == {'type': 'pong'}


# 2, 3 --------------------------------------------------------------------------
def test_expired_token_is_refused(db, client):
    assert expect_refused(client, token(PLAYER, minutes=-1)).code == 4001


@pytest.mark.parametrize('bad', ['', 'not-a-jwt', 'a.b.c'])
def test_malformed_token_is_refused(db, client, bad):
    assert expect_refused(client, bad).code == 4001


def test_token_signed_with_another_secret_is_refused(db, client):
    assert expect_refused(client, token(PLAYER, secret='someone-elses-secret-key-0123456789')).code == 4001


def test_token_without_a_subject_is_refused(db, client):
    tok = jwt.encode({'tv': 0, 'exp': datetime.now(timezone.utc) + timedelta(minutes=5)},
                     auth_utils.JWT_SECRET, algorithm=auth_utils.JWT_ALGORITHM)
    assert expect_refused(client, tok).code == 4001


# 4 ---------------------------------------------------------------------------
def test_revoked_token_is_refused_before_connecting(db, client):
    old = token(PLAYER, tv=0)
    db.bump_session(PLAYER)  # password change or reset
    assert expect_refused(client, old).code == 4001
    with live(client, token(PLAYER, tv=1)) as ws:
        assert ping(ws) == {'type': 'pong'}


# 5 ---------------------------------------------------------------------------
def test_deleted_account_cannot_connect(db, client):
    tok = token(PLAYER)
    db.delete_user(PLAYER)
    assert expect_refused(client, tok).code == 4001


# 6 ---------------------------------------------------------------------------
def test_account_outside_the_campaign_cannot_connect(db, client):
    assert expect_refused(client, token(OUTSIDER)).code == 4003


@pytest.mark.parametrize('state', ['pending', 'removed', 'retired', 'dead'])
def test_inactive_membership_cannot_connect(db, client, state):
    db.set_member_status(PLAYER, state)
    assert expect_refused(client, token(PLAYER)).code == 4003


def test_unknown_campaign_cannot_connect(db, client):
    assert expect_refused(client, token(GM), campaign='no-such-campaign').code == 4003


def test_child_account_is_refused_as_on_http(db, client):
    # Child access is deny-by-default and the live channel is not allowed.
    assert expect_refused(client, token(CHILD, typ='child')).code == 4003


# 7 ---------------------------------------------------------------------------
def test_removing_membership_ends_an_open_socket(db, client):
    with live(client, token(PLAYER)) as ws:
        assert ping(ws) == {'type': 'pong'}
        db.set_member_status(PLAYER, 'removed')
        _, code = receive_until_closed(ws)
        assert code == 4003


# 8 ---------------------------------------------------------------------------
def test_password_change_ends_an_open_socket(db, client):
    with live(client, token(PLAYER, tv=0)) as ws:
        assert ping(ws) == {'type': 'pong'}
        db.bump_session(PLAYER)
        _, code = receive_until_closed(ws)
        assert code == 4001


def test_deleting_the_account_ends_an_open_socket(db, client):
    with live(client, token(PLAYER)) as ws:
        assert ping(ws) == {'type': 'pong'}
        db.delete_user(PLAYER)
        _, code = receive_until_closed(ws)
        assert code == 4001


def test_token_expiry_ends_an_open_socket_without_any_database_change(db, client):
    short = jwt.encode({'sub': PLAYER, 'tv': 0, 'exp': int(time.time()) + 1},
                       auth_utils.JWT_SECRET, algorithm=auth_utils.JWT_ALGORITHM)
    with live(client, short) as ws:
        assert ping(ws) == {'type': 'pong'}
        _, code = receive_until_closed(ws)
        assert code == 4001


# 9 ---------------------------------------------------------------------------
def test_revoked_passive_socket_receives_no_further_broadcasts(db, client):
    with live(client, token(PLAYER)) as listener:
        # The listener never sends a thing after this point.
        assert ping(listener) == {'type': 'pong'}
        db.bump_session(PLAYER)
        # Well past the revocation window before anything is broadcast.
        assert wait_for(lambda: PLAYER not in ws_manager.get_campaign_users(CAMPAIGN))
        with live(client, token(GM)) as gm:
            gm.send_json({'type': 'chat_message', 'message': 'secret plan'})
            assert ping(gm) == {'type': 'pong'}
        seen, code = receive_until_closed(listener)
        assert code == 4001
        assert not any(m.get('type') == 'chat_message' for m in seen)


# 10, 11 ------------------------------------------------------------------------
def test_gm_can_send_gm_only_events(db, client):
    with live(client, token(PLAYER)) as player, \
            live(client, token(GM)) as gm:
        assert player.receive_json()['type'] == 'user_joined'
        gm.send_json({'type': 'map_update', 'data': {'fog': 1}})
        update = player.receive_json()
        assert update['type'] == 'map_update' and update['user_id'] == GM


def test_non_gm_cannot_send_gm_only_events(db, client):
    with live(client, token(PLAYER)) as player:
        player.send_json({'type': 'map_update', 'data': {'fog': 0}})
        reply = player.receive_json()
        assert reply['type'] == 'error' and reply['code'] == 'gm_only'


# 12, 13 ------------------------------------------------------------------------
def test_one_user_on_two_screens_gets_broadcasts_on_both(db, client):
    with live(client, token(GM)) as screen_a, \
            live(client, token(GM)) as screen_b, \
            live(client, token(PLAYER)) as player:
        assert screen_a.receive_json()['type'] == 'user_joined'
        assert screen_b.receive_json()['type'] == 'user_joined'
        player.send_json({'type': 'dice_roll', 'roll': {'total': 17}})
        assert screen_a.receive_json()['type'] == 'dice_roll'
        assert screen_b.receive_json()['type'] == 'dice_roll'


def test_closing_one_screen_keeps_the_other_connected(db, client):
    with live(client, token(GM)) as kept:
        with live(client, token(GM)) as closed_one:
            assert ping(closed_one) == {'type': 'pong'}
        assert ping(kept) == {'type': 'pong'}
        assert wait_for(lambda: len(ws_manager.user_sockets.get(GM, ())) == 1)
        assert GM in ws_manager.get_campaign_users(CAMPAIGN)


# 14 ---------------------------------------------------------------------------
def test_disconnect_and_revocation_leave_no_manager_entries_or_tasks(db, client):
    watchers = []
    real_watch = server.watch_session if hasattr(server, 'watch_session') else None
    if real_watch is None:
        pytest.fail('the endpoint runs no session watcher: an open socket is never re-checked')

    async def recording_watch(*args, **kwargs):
        import asyncio
        watchers.append(asyncio.current_task())
        return await real_watch(*args, **kwargs)

    with patch.object(server, 'watch_session', recording_watch):
        with live(client, token(GM)):
            pass  # ordinary close
        with live(client, token(PLAYER)) as revoked:
            assert ping(revoked) == {'type': 'pong'}
            db.bump_session(PLAYER)
            receive_until_closed(revoked)

    assert wait_for(lambda: not ws_manager.campaign_sockets and not ws_manager.user_sockets
                    and not getattr(ws_manager, 'sessions', {}))
    assert len(watchers) == 2
    assert wait_for(lambda: all(task.done() for task in watchers))


# Immediate revocation hooks ---------------------------------------------------
def test_revoke_user_ends_sockets_at_once_without_waiting_for_the_interval(db, client):
    assert ws_session is not None
    with patch.object(ws_session, 'REVALIDATE_SECONDS', 300):
        with live(client, token(PLAYER)) as ws:
            assert ping(ws) == {'type': 'pong'}
            closed = client.portal.call(ws_manager.revoke_user, PLAYER, 4001, 'x') \
                if hasattr(client, 'portal') else None
            if closed is None:
                pytest.skip('TestClient portal unavailable')
            assert closed == 1
            _, code = receive_until_closed(ws)
            assert code == 4001


def test_no_token_appears_in_close_reasons_or_logs(db, client, caplog):
    secret_token = token(PLAYER, tv=0)
    db.bump_session(PLAYER)
    with caplog.at_level('DEBUG'):
        refused = expect_refused(client, secret_token)
    assert secret_token not in (refused.reason or '')
    assert secret_token not in caplog.text


# Route hooks: the change that revokes access also ends live sockets ---------
import asyncio  # noqa: E402
import importlib.util  # noqa: E402
import types  # noqa: E402
from types import SimpleNamespace  # noqa: E402
from unittest.mock import AsyncMock  # noqa: E402


def _route_module(name):
    try:
        import resend  # noqa: F401
    except ImportError:  # pragma: no cover
        sys.modules['resend'] = types.SimpleNamespace(api_key=None, Emails=types.SimpleNamespace(send=lambda p: None))
    spec = importlib.util.spec_from_file_location(f'ws_hook_{name}', ROOT / 'routes' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_password_change_ends_this_users_live_sockets():
    auth_routes = _route_module('auth')
    from models import ChangePasswordRequest
    users = SimpleNamespace(
        find_one=AsyncMock(return_value={'username': PLAYER, 'password_hash': 'old', 'token_version': 0}),
        update_one=AsyncMock(),
    )
    ended = AsyncMock(return_value=1)
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users)), \
         patch.object(auth_routes, 'verify_password', return_value=True), \
         patch.object(auth_routes, 'hash_password', return_value='h'), \
         patch.object(auth_routes, 'end_live_sessions', ended):
        asyncio.run(auth_routes.change_password(
            ChangePasswordRequest(current_password='old-password', new_password='new-password-1'),
            current_username=PLAYER))
    ended.assert_awaited_once_with(PLAYER)


def test_password_reset_ends_live_sockets_and_survives_a_failed_lookup():
    auth_routes = _route_module('auth')
    from models import ResetPasswordRequest
    resets = SimpleNamespace(find_one_and_delete=AsyncMock(return_value={
        'email': 'synthetic@example.invalid', 'token': 't', 'expires_at': '2999-01-01T00:00:00+00:00'}))
    users = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),
                            find_one=AsyncMock(return_value={'username': PLAYER}))
    ended = AsyncMock(return_value=1)
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \
         patch.object(auth_routes, 'hash_password', return_value='h'), \
         patch.object(auth_routes, 'end_live_sessions', ended):
        asyncio.run(auth_routes.reset_password(ResetPasswordRequest(token='t', new_password='new-password-1')))
    ended.assert_awaited_once_with(PLAYER)

    users.find_one = AsyncMock(side_effect=RuntimeError('database blip'))
    with patch.object(auth_routes, 'db', SimpleNamespace(users=users, password_resets=resets)), \
         patch.object(auth_routes, 'hash_password', return_value='h'):
        result = asyncio.run(auth_routes.reset_password(ResetPasswordRequest(token='t', new_password='new-password-1')))
    assert result['message'] == 'Password reset successful'


@pytest.mark.parametrize('state,ends', [('removed', True), ('retired', True), ('dead', True),
                                        ('pending', True), ('active', False)])
def test_member_status_change_ends_only_lost_access(state, ends):
    invites = _route_module('campaign_invites')
    member = {'id': 'm1', 'campaign_id': CAMPAIGN, 'user_id': PLAYER, 'character_id': None}
    fake = SimpleNamespace(campaign_members=SimpleNamespace(
        update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),
        find_one=AsyncMock(return_value=member)))
    ended = AsyncMock(return_value=1)
    with patch.object(invites, 'db', fake), \
         patch.object(invites, 'verify_campaign_ownership', AsyncMock()), \
         patch.object(invites, 'end_live_sessions', ended):
        asyncio.run(invites.update_campaign_member_status(CAMPAIGN, 'm1', {'status': state}, username=GM))
    if ends:
        ended.assert_awaited_once()
        assert ended.await_args.args[:2] == (PLAYER, CAMPAIGN)
    else:
        ended.assert_not_awaited()


def test_end_live_sessions_never_raises():
    assert ws_session is not None
    with patch.object(ws_manager, 'revoke_user', AsyncMock(side_effect=RuntimeError('x'))):
        assert asyncio.run(ws_session.end_live_sessions(PLAYER)) == 0
    assert asyncio.run(ws_session.end_live_sessions(None)) == 0


def test_revalidation_interval_is_bounded(monkeypatch):
    assert ws_session is not None
    for raw, expected in [('1', 15.0), ('100000', 300.0), ('junk', 60.0), ('45', 45.0)]:
        monkeypatch.setenv('WS_REVALIDATE_SECONDS', raw)
        assert ws_session._revalidate_seconds() == expected


def test_a_database_outage_gets_one_more_interval_then_closes():
    assert ws_session is not None
    closes = []

    class Socket:
        async def close(self, code, reason):
            closes.append(code)

    session = ws_session.SocketSession(PLAYER, CAMPAIGN, False, None)
    manager = SimpleNamespace(disconnect=lambda *a: None)
    calls = {'n': 0}

    async def flaky(*args):
        calls['n'] += 1
        raise RuntimeError('database unreachable')

    with patch.object(ws_session, 'authorise_campaign_socket', flaky):
        asyncio.run(ws_session.watch_session(Socket(), 'tok', session, manager, interval=0.01))
    assert calls['n'] == 2 and closes == [ws_session.CLOSE_TRY_AGAIN] and session.revoked


def test_server_registers_the_hardened_endpoint():
    source = (ROOT / 'server.py').read_text(encoding='utf-8')
    assert 'from utils.live_socket import websocket_campaign_sync' in source
    assert 'app.add_api_websocket_route("/ws/campaign/{campaign_id}", websocket_campaign_sync)' in source
    assert 'verify_token' not in source

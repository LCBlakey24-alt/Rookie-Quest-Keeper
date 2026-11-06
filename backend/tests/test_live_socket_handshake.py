"""The live socket handshake: trusted Origin, no token in the URL, auth first.

Two production defects:

* The token rode in the WebSocket URL (`?token=<JWT>`), and uvicorn's access
  log -- kept by Render -- records the full URL, so session tokens were
  written to logs.
* There was no Origin check, so any web page could try to open the campaign
  channel on a visitor's behalf (cross-site WebSocket hijacking).

The new handshake: the Origin must be one the API already trusts
(CORS_ORIGINS); the URL carries no credentials; the first message must be
{"type": "auth", "token": ...} within a short deadline; and until it is
verified by the #772 session policy the socket joins nothing and is sent
nothing. Synthetic users, campaigns and tokens only.
"""
import asyncio
import logging
import os
import socket
import sys
import threading
import time
import types
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

try:  # CI's focused route job does not install the email SDK
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(api_key=None, Emails=types.SimpleNamespace(send=lambda params: None))

from fastapi import FastAPI  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402
from starlette.websockets import WebSocketDisconnect  # noqa: E402

from utils import auth as auth_utils  # noqa: E402
from utils import live_socket  # noqa: E402
from utils.ws_manager import ws_manager  # noqa: E402

try:
    from utils import ws_session
except ImportError:  # pragma: no cover
    ws_session = None

CAMPAIGN = 'synthetic-campaign'
GM, PLAYER = 'synthetic-gm', 'synthetic-player'
TRUSTED = os.environ['CORS_ORIGINS'].split(',')[0].strip()


class Collection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None


class FakeDb:
    def __init__(self):
        self.users = Collection([{'username': GM, 'token_version': 0}, {'username': PLAYER, 'token_version': 0}])
        self.campaigns = Collection([{'id': CAMPAIGN, 'dm_user_id': GM}])
        self.campaign_members = Collection([{'campaign_id': CAMPAIGN, 'user_id': PLAYER, 'status': 'active'}])
        self.player_characters = Collection([])


def token(username, minutes=60):
    return jwt.encode({'sub': username, 'tv': 0, 'exp': datetime.now(timezone.utc) + timedelta(minutes=minutes)},
                      auth_utils.JWT_SECRET, algorithm=auth_utils.JWT_ALGORITHM)


@pytest.fixture(autouse=True)
def fake_db():
    with patch.object(auth_utils, 'db', FakeDb()):
        ws_manager.campaign_sockets.clear()
        ws_manager.user_sockets.clear()
        getattr(ws_manager, 'sessions', {}).clear()
        yield


def make_app():
    app = FastAPI()
    app.add_api_websocket_route('/ws/campaign/{campaign_id}', live_socket.websocket_campaign_sync)
    return app


@pytest.fixture
def client():
    with TestClient(make_app()) as test_client:
        yield test_client


def authenticated(client, tok, origin=TRUSTED):
    ws = client.websocket_connect(f'/ws/campaign/{CAMPAIGN}', headers={'origin': origin}).__enter__()
    ws.send_json({'type': 'auth', 'token': tok})
    assert ws.receive_json() == {'type': 'auth_ok'}
    return ws


def refusal(client, path, headers=None, first_message=None):
    with pytest.raises(WebSocketDisconnect) as refused:
        with client.websocket_connect(path, headers=headers or {}) as ws:
            if first_message is not None:
                ws.send_text(first_message) if isinstance(first_message, str) else ws.send_json(first_message)
            ws.receive_json()
    return refused.value


# Token never in the URL ---------------------------------------------------
def test_a_valid_token_in_the_url_is_refused(client):
    closed = refusal(client, f'/ws/campaign/{CAMPAIGN}?token={token(PLAYER)}', headers={'origin': TRUSTED})
    assert closed.code == 4001
    assert not ws_manager.campaign_sockets


def test_the_token_in_the_first_message_connects(client):
    ws = authenticated(client, token(PLAYER))
    ws.send_json({'type': 'ping'})
    assert ws.receive_json() == {'type': 'pong'}
    assert PLAYER in ws_manager.get_campaign_users(CAMPAIGN)
    ws.__exit__(None, None, None)


# Origin -------------------------------------------------------------------
@pytest.mark.parametrize('origin', ['https://evil.example', 'http://localhost:3001', 'null'])
def test_an_untrusted_origin_is_refused_before_anything_else(client, origin):
    closed = refusal(client, f'/ws/campaign/{CAMPAIGN}', headers={'origin': origin}, first_message={'type': 'auth', 'token': token(PLAYER)})
    assert closed.code == 4003
    assert not ws_manager.campaign_sockets


def test_a_missing_origin_is_refused(client):
    closed = refusal(client, f'/ws/campaign/{CAMPAIGN}', first_message={'type': 'auth', 'token': token(PLAYER)})
    assert closed.code == 4003


def test_origin_match_ignores_only_a_trailing_slash():
    assert ws_session.origin_allowed('https://rookiequestkeeper.com/', ['https://rookiequestkeeper.com'])
    assert not ws_session.origin_allowed('https://rookiequestkeeper.com.evil.example', ['https://rookiequestkeeper.com'])
    assert not ws_session.origin_allowed('http://rookiequestkeeper.com', ['https://rookiequestkeeper.com'])
    assert not ws_session.origin_allowed('', ['https://rookiequestkeeper.com'])


# First-message authentication ----------------------------------------------
def test_no_credentials_within_the_deadline_closes_the_socket(client):
    with patch.object(live_socket, 'AUTH_DEADLINE_SECONDS', 0.2):
        start = time.time()
        closed = refusal(client, f'/ws/campaign/{CAMPAIGN}', headers={'origin': TRUSTED})
        assert closed.code == 4001
        assert time.time() - start < 3
    assert not ws_manager.campaign_sockets


@pytest.mark.parametrize('first', [
    'not json',
    {'type': 'ping'},
    {'type': 'auth'},
    {'type': 'auth', 'token': ''},
    {'type': 'auth', 'token': 123},
    {'type': 'auth', 'token': 'x' * 5000},
    {'type': 'chat_message', 'message': 'hello', 'token': 'ignored'},
])
def test_anything_but_an_auth_message_first_is_refused(client, first):
    closed = refusal(client, f'/ws/campaign/{CAMPAIGN}', headers={'origin': TRUSTED}, first_message=first)
    assert closed.code == 4001


def test_a_revoked_or_invalid_token_in_the_first_message_is_refused(client):
    assert refusal(client, f'/ws/campaign/{CAMPAIGN}', headers={'origin': TRUSTED},
                   first_message={'type': 'auth', 'token': 'not-a-jwt'}).code == 4001
    assert refusal(client, f'/ws/campaign/{CAMPAIGN}', headers={'origin': TRUSTED},
                   first_message={'type': 'auth', 'token': token(PLAYER, minutes=-1)}).code == 4001


def test_an_unauthenticated_socket_joins_nothing_and_hears_nothing(client):
    gm = authenticated(client, token(GM))
    with client.websocket_connect(f'/ws/campaign/{CAMPAIGN}', headers={'origin': TRUSTED}) as waiting:
        # Accepted, but not yet authenticated: not in the campaign.
        assert ws_manager.get_campaign_users(CAMPAIGN) == {GM}
        gm.send_json({'type': 'chat_message', 'message': 'synthetic secret'})
        gm.send_json({'type': 'ping'})
        assert gm.receive_json() == {'type': 'pong'}
        # Now authenticate: the first thing it hears is auth_ok, not the chat.
        waiting.send_json({'type': 'auth', 'token': token(PLAYER)})
        assert waiting.receive_json() == {'type': 'auth_ok'}
        waiting.send_json({'type': 'ping'})
        assert waiting.receive_json() == {'type': 'pong'}
    gm.__exit__(None, None, None)


def test_auth_ok_precedes_campaign_traffic(client):
    player = authenticated(client, token(PLAYER))
    gm = authenticated(client, token(GM))
    assert player.receive_json()['type'] == 'user_joined'
    gm.__exit__(None, None, None)
    player.__exit__(None, None, None)


def test_a_late_second_auth_message_is_just_unsupported(client):
    ws = authenticated(client, token(PLAYER))
    ws.send_json({'type': 'auth', 'token': token(GM)})
    reply = ws.receive_json()
    assert reply['type'] == 'error' and reply['code'] == 'unsupported_message_type'
    assert ws_manager.get_campaign_users(CAMPAIGN) == {PLAYER}
    ws.__exit__(None, None, None)


# The access log, from a real server ----------------------------------------
def test_the_session_token_never_reaches_the_access_log(caplog):
    uvicorn = pytest.importorskip('uvicorn')
    websockets = pytest.importorskip('websockets')
    from websockets.asyncio.client import connect

    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    # log_config=None: let records propagate to pytest instead of uvicorn's own handlers.
    config = uvicorn.Config(make_app(), host='127.0.0.1', port=port, log_level='info', access_log=True, lifespan='off', log_config=None)
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    secret = token(PLAYER)
    with caplog.at_level(logging.INFO, logger='uvicorn.access'), caplog.at_level(logging.INFO, logger='uvicorn.error'):
        thread.start()
        deadline = time.time() + 10
        while not server.started and time.time() < deadline:
            time.sleep(0.05)
        assert server.started

        async def session():
            async with connect(f'ws://127.0.0.1:{port}/ws/campaign/{CAMPAIGN}', origin=TRUSTED) as ws:
                await ws.send('{"type": "auth", "token": "%s"}' % secret)
                assert '"auth_ok"' in await ws.recv()
                await ws.send('{"type": "ping"}')
                assert '"pong"' in await ws.recv()

        asyncio.run(session())
        server.should_exit = True
        thread.join(timeout=10)

    logged = '\n'.join(record.getMessage() for record in caplog.records)
    assert f'/ws/campaign/{CAMPAIGN}' in logged, logged  # the request was logged...
    assert secret not in logged                             # ...without the token
    assert 'token=' not in logged

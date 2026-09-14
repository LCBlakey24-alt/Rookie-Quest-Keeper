import asyncio
import importlib.util
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi import HTTPException

spec = importlib.util.spec_from_file_location(
    'campaign_display_under_test',
    BACKEND_ROOT / 'routes' / 'campaign_display.py',
)
campaign_display_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(campaign_display_module)

acknowledge_campaign_display_state = campaign_display_module.acknowledge_campaign_display_state
default_display_state = campaign_display_module.default_display_state
router = campaign_display_module.router
sanitize_display_state = campaign_display_module.sanitize_display_state


def route_endpoint(path, method):
    for route in router.routes:
        if method in getattr(route, 'methods', set()) and getattr(route, 'path', '') == path:
            return route.endpoint.__name__
    return ''


def test_campaign_display_state_routes_are_registered():
    assert route_endpoint('/campaigns/{campaign_id}/display-state', 'GET') == 'get_campaign_display_state'
    assert route_endpoint('/campaigns/{campaign_id}/display-state', 'PUT') == 'update_campaign_display_state'
    assert route_endpoint('/campaigns/{campaign_id}/display-state/ack', 'POST') == 'acknowledge_campaign_display_state'


def test_default_display_state_is_safe_blank_state():
    state = default_display_state('campaign-1')

    assert state['campaign_id'] == 'campaign-1'
    assert state['mode'] == 'blank'
    assert state['payload'] == {}
    assert state['updated_by'] == ''
    assert state['sync_id'].startswith('campaign-1-')
    assert state['sequence'] > 0
    assert state['delivery_ack'] == {}


def test_sanitize_display_state_accepts_known_modes_and_rejects_unknown_modes():
    state = sanitize_display_state('campaign-1', {'mode': 'image', 'payload': {'title': 'Map'}}, 'gm-user')

    assert state['campaign_id'] == 'campaign-1'
    assert state['mode'] == 'image'
    assert state['payload'] == {'title': 'Map'}
    assert state['updated_by'] == 'gm-user'
    assert state['sync_id'].startswith('campaign-1-')
    assert state['delivery_ack'] == {}

    try:
        sanitize_display_state('campaign-1', {'mode': 'private-notes', 'payload': {'secret': 'Nope'}}, 'gm-user')
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError('Unsupported display mode should raise HTTPException')


def test_sanitize_display_state_preserves_sync_identity_for_delivery_tracking():
    state = sanitize_display_state('campaign-1', {
        'mode': 'title',
        'payload': {'title': 'The Gate Opens'},
        'sync_id': 'sync-123',
        'sequence': 42,
        'source_tab': 'gm-tab-1',
    }, 'gm-user')

    assert state['sync_id'] == 'sync-123'
    assert state['sequence'] == 42
    assert state['source_tab'] == 'gm-tab-1'
    assert state['delivery_ack'] == {}


def test_acknowledgement_records_only_the_current_display_state(monkeypatch):
    class FakeCollection:
        def __init__(self):
            self.state = {
                'campaign_id': 'campaign-1',
                'mode': 'title',
                'sync_id': 'sync-current',
            }
            self.updates = []

        async def find_one(self, query, projection=None):
            return dict(self.state)

        async def update_one(self, query, update, **kwargs):
            self.updates.append((query, update, kwargs))

    class FakeDb:
        def __init__(self):
            self.campaign_display_states = FakeCollection()

    async def allow_membership(campaign_id, username):
        return True

    fake_db = FakeDb()
    monkeypatch.setattr(campaign_display_module, 'db', fake_db)
    monkeypatch.setattr(campaign_display_module, 'verify_campaign_membership', allow_membership)

    result = asyncio.run(acknowledge_campaign_display_state(
        'campaign-1',
        {'sync_id': 'sync-current', 'display_target': 'standing-tv', 'mode': 'title'},
        username='player-user',
    ))

    assert result['acknowledged'] is True
    assert result['sync_id'] == 'sync-current'
    assert result['display_target'] == 'standing-tv'
    assert fake_db.campaign_display_states.updates[0][1]['$set']['delivery_ack']['sync_id'] == 'sync-current'

    stale = asyncio.run(acknowledge_campaign_display_state(
        'campaign-1',
        {'sync_id': 'sync-old', 'display_target': 'standing-tv', 'mode': 'title'},
        username='player-user',
    ))

    assert stale['acknowledged'] is False
    assert stale['stale'] is True
    assert stale['current_sync_id'] == 'sync-current'
    assert len(fake_db.campaign_display_states.updates) == 1

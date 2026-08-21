import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from routes.campaign_display import default_display_state, router, sanitize_display_state


def route_endpoint(path, method):
    for route in router.routes:
        if method in getattr(route, 'methods', set()) and getattr(route, 'path', '') == path:
            return route.endpoint.__name__
    return ''


def test_campaign_display_state_routes_are_registered():
    assert route_endpoint('/campaigns/{campaign_id}/display-state', 'GET') == 'get_campaign_display_state'
    assert route_endpoint('/campaigns/{campaign_id}/display-state', 'PUT') == 'update_campaign_display_state'


def test_default_display_state_is_safe_blank_state():
    state = default_display_state('campaign-1')

    assert state['campaign_id'] == 'campaign-1'
    assert state['mode'] == 'blank'
    assert state['payload'] == {}
    assert state['updated_by'] == ''


def test_sanitize_display_state_accepts_known_modes_and_rejects_unknown_modes():
    state = sanitize_display_state('campaign-1', {'mode': 'image', 'payload': {'title': 'Map'}}, 'gm-user')

    assert state['campaign_id'] == 'campaign-1'
    assert state['mode'] == 'image'
    assert state['payload'] == {'title': 'Map'}
    assert state['updated_by'] == 'gm-user'

    try:
        sanitize_display_state('campaign-1', {'mode': 'private-notes', 'payload': {'secret': 'Nope'}}, 'gm-user')
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError('Unsupported display mode should raise HTTPException')


def test_sanitize_display_state_preserves_safe_sync_metadata():
    state = sanitize_display_state(
        'campaign-1',
        {
            'mode': 'title',
            'payload': {'title': 'Reveal'},
            'sync_id': 'sync-123',
            'sequence': 1787338800123,
            'source_tab': 'tab-abc',
        },
        'gm-user',
    )

    assert state['sync_id'] == 'sync-123'
    assert state['sequence'] == 1787338800123
    assert state['source_tab'] == 'tab-abc'


def test_sanitize_display_state_rejects_bad_sync_metadata_without_rejecting_display():
    state = sanitize_display_state(
        'campaign-1',
        {
            'mode': 'blank',
            'payload': {},
            'sync_id': 'x' * 400,
            'sequence': 'not-a-number',
            'source_tab': 'y' * 400,
        },
        'gm-user',
    )

    assert state['sync_id'] == 'x' * 200
    assert 'sequence' not in state
    assert state['source_tab'] == 'y' * 200

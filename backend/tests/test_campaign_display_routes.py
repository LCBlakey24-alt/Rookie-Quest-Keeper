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


def test_player_display_accepts_live_battle_and_table_roll_modes():
    for mode in ('battle-start', 'table-result'):
        state = sanitize_display_state('campaign-1', {
            'mode': mode,
            'payload': {
                'title': 'Roll Initiative' if mode == 'battle-start' else 'Lucky Roll',
                'die': 'd20', 'roll': 17, 'result': 'Success',
                'party': [{'name': 'Rowan', 'hp': 20}],
            },
        }, 'gm')
        assert state['mode'] == mode
        assert state['payload']['title']
        if mode == 'table-result':
            assert state['payload']['roll'] == 17
        else:
            assert 'roll' not in state['payload']


def test_player_display_removes_private_nested_gm_data_and_hidden_tokens():
    original = {
        'mode': 'combat',
        'payload': {
            'title': 'Council Ambush',
            'display_target': 'virtual-table',
            'gm_notes': 'Final boss is her father',
            'party': [{
                'id': 'p1', 'name': 'Rowan', 'hp': 19,
                'maxHp': 25, 'ac': 17, 'notes': 'Secret PC backstory',
                'character': {'private_story': 'Do not reveal'},
            }],
            'tokens': [
                {'id': 'hidden', 'name': 'Secret Lich', 'hidden': True,
                 'x': 0, 'y': 0, 'secret': True, 'gm_notes': 'Trap'},
                {'id': 'visible', 'name': 'Skeleton', 'hidden': False,
                 'x': 0, 'y': 0, 'initiative': 11, 'hp': 400,
                 'ac': 27, "gm_notes": "Do not reveal resistances",
                 'position': {'x': 0, 'y': 0, 'gm_note': 'north trap'}},
                {'id': 'invisible', 'name': 'Secret Dragon', 'visible': False},
                {'id': 'private', 'name': 'Shadow', 'visibility': 'gm-only'},
            ],
            'banner': {
                'id': 'announcement-1', 'text': 'A creature approaches',
                'gm_notes': 'It's the lich', 'tone': 'danger',
            },
        },
    }
    state = sanitize_display_state('campaign-1', original, 'gm')
    payload = state['payload']
    assert payload['display_target'] == 'virtual-table'
    assert payload['party'] == [{'id': 'p1', 'name': 'Rowan', 'hp': 19, 'maxHp': 25, 'ac': 17}]
    assert payload['tokens'] == [{
        'id': 'visible', 'name': 'Skeleton', 'x': 0, 'y': 0,
        'initiative': 11, 'position': {'x': 0, 'y': 0},
    }]
    assert payload['banner'] == {
        'id': 'announcement-1', 'text': 'A creature approaches', 'tone': 'danger',
    }
    assert 'Secret Lich' not in str(payload)
    assert 'Final boss' not in str(payload)
    assert 'resistances' not in str(payload)
    assert 'Secret PC' not in str(payload)


def test_player_display_npc_group_check_and_recap_preserve_public_shapes():
    npc = sanitize_display_state('c', {
        'mode': 'npc-grid',
        'payload': {'title': 'NPCs', 'npcs': [
            {'id': 'n1', 'name': 'Mira', 'subtitle': 'Trader',
             'description': 'Friendly merchant', 'image_url': '/mira.png',
             'gm_notes': 'Secret villain'},
        ]},
    }, 'gm')['payload']
    assert npc['npcs'] == [{
        'id': 'n1', 'name': 'Mira', 'subtitle': 'Trader',
        'description': 'Friendly merchant', 'image_url': '/mira.png',
    }]

    group = sanitize_display_state('c', {
        'mode': 'group-check',
        'payload': {
            'check_name': 'Perception', 'dc': 14, 'notation': '1d20',
            'party': [{'id': 'p1', 'name': 'Rowan', 'className': 'Druid'}],
            'results': [{'id': 'p1', 'total': 18, 'natural': 16,
                         'visibleRolls': [{'sides': 20, 'result': 16,
                                           'dropped': False, 'secret': 'DM'}],
                         'gm_notes': 'hidden DC modifier'}],
        },
    }, 'gm')['payload']
    assert group['check_name'] == 'Perception'
    assert group['results'][0]['visibleRolls'] == [
        {'sides': 20, 'result': 16, 'dropped': False}]
    assert 'gm_notes' not in str(group)

    recap = sanitize_display_state('c', {
        'mode': 'end-session-stats',
        'payload': {
            'campaignName': 'Tia-Karta', 'generated_at': 42,
            'session': {
                'nat20s': 5, 'playerRolls': 30,
                'awards': [{'title': 'Best Crit', 'name': 'Rowan',
                            'value': '20', 'dmOnly': 'Secret'}],
                'actors': [{'name': 'Rowan', 'rolls': 10,
                            'nat20s': 3, 'nat1s': 1, 'email': 'private'}],
                'private': {'gm': 'notes'},
            },
            'allTime': {'nat20s': 50, 'totalRolls': 100, 'secrets': 'no'},
        },
    }, 'gm')['payload']
    assert recap['session']['awards'] == [
        {'title': 'Best Crit', 'name': 'Rowan', 'value': '20'}]
    assert recap['session']['actors'] == [
        {'name': 'Rowan', 'rolls': 10, 'nat20s': 3, 'nat1s': 1}]
    assert recap['allTime'] == {'nat20s': 50, 'totalRolls': 100}


def test_member_get_sanitizes_an_older_saved_snapshot(monkeypatch):
    class FakeCollection:
        async def find_one(self, query, projection=None):
            return {
                'campaign_id': 'campaign-1', 'mode': 'npc-grid',
                'sync_id': 'older-sync', 'sequence': 23,
                'updated_at': '2026-10-23T12:00:00+00:00',
                'top_level_secret': 'Should not leave the server',
                'payload': {
                    'npcs': [{'name': 'Mira', 'gm_notes': 'Betrayal'}],
                    'private_notes': 'The dungeon secret',
                    'title': 'Welcome',
                },
            }

    class FakeDb:
        campaign_display_states = FakeCollection()

    async def allow_membership(campaign_id, username):
        return True

    monkeypatch.setattr(campaign_display_module, 'db', FakeDb())
    monkeypatch.setattr(campaign_display_module, 'verify_campaign_membership', allow_membership)
    state = asyncio.run(campaign_display_module.get_campaign_display_state(
        'campaign-1', username='member',
    ))
    assert state['sync_id'] == 'older-sync'
    assert state['payload'] == {
        'title': 'Welcome', 'npcs': [{'name': 'Mira'}],
    }
    assert 'top_level_secret' not in state

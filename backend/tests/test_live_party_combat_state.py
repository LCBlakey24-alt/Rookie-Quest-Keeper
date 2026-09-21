import asyncio
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

sys.modules.setdefault('config', types.SimpleNamespace(db=None))
sys.modules.setdefault('utils', types.ModuleType('utils'))
sys.modules.setdefault('utils.auth', types.SimpleNamespace(get_current_user=lambda: None, verify_campaign_ownership=None))

spec = importlib.util.spec_from_file_location('live_party_under_test', Path(__file__).resolve().parents[1] / 'routes' / 'live_party.py')
live_party = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live_party)


def test_character_row_preserves_full_safe_combat_state():
    row = live_party._character_row({
        'id': 'char-1',
        'name': 'Hero',
        'max_hit_points': 40,
        'current_hit_points': 17,
        'temporary_hit_points': 6,
        'armor_class': 16,
        'conditions': ['poisoned'],
        'death_saves_successes': 1,
        'death_saves_failures': 2,
        'concentrating_on': 'Bless',
        'dexterity': 14,
    }, {'id': 'member-1'})

    assert row['hp'] == 17
    assert row['max_hp'] == 40
    assert row['temporary_hit_points'] == 6
    assert row['temp_hp'] == 6
    assert row['conditions'] == ['poisoned']
    assert row['death_saves_successes'] == 1
    assert row['death_saves_failures'] == 2
    assert row['concentrating_on'] == 'Bless'


def test_character_row_clamps_unsafe_death_save_and_temp_values():
    row = live_party._character_row({
        'id': 'char-1',
        'max_hit_points': 10,
        'current_hit_points': 0,
        'temporary_hit_points': -4,
        'death_saves_successes': 9,
        'death_saves_failures': -2,
    }, {})

    assert row['temporary_hit_points'] == 0
    assert row['death_saves_successes'] == 3
    assert row['death_saves_failures'] == 0


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return list(self.rows)


class _Collection:
    def __init__(self, rows):
        self.rows = rows
        self.queries = []

    def find(self, query, projection=None):
        self.queries.append((query, projection))
        if 'status' in query:
            allowed = set(query['status'].get('$in', []))
            rows = [row for row in self.rows if row.get('status') in allowed]
        elif 'id' in query and isinstance(query['id'], dict) and '$in' in query['id']:
            allowed = set(query['id']['$in'])
            rows = [row for row in self.rows if row.get('id') in allowed]
        elif 'campaign_id' in query:
            rows = [row for row in self.rows if row.get('campaign_id') == query['campaign_id']]
        else:
            rows = list(self.rows)
        return _Cursor(rows)


def test_live_party_builder_uses_approved_linked_character_sheets_and_legacy_fallback(monkeypatch):
    members = _Collection([
        {'id': 'member-active', 'campaign_id': 'campaign-1', 'character_id': 'char-1', 'status': 'active'},
        {'id': 'member-pending', 'campaign_id': 'campaign-1', 'character_id': 'char-2', 'status': 'pending'},
    ])
    characters = _Collection([
        {
            'id': 'char-1', 'campaign_id': 'campaign-1', 'name': 'Ari',
            'current_hit_points': 7, 'max_hit_points': 20, 'armor_class': 16,
        },
        {
            'id': 'char-2', 'campaign_id': 'campaign-1', 'name': 'Pending Hero',
            'current_hit_points': 20, 'max_hit_points': 20, 'armor_class': 14,
        },
    ])
    legacy = _Collection([
        {'id': 'legacy-ari', 'campaign_id': 'campaign-1', 'name': 'Ari', 'hp': 99, 'max_hp': 99, 'ac': 99},
        {'id': 'legacy-bryn', 'campaign_id': 'campaign-1', 'name': 'Bryn', 'hp': 12, 'max_hp': 12, 'ac': 13},
    ])
    monkeypatch.setattr(live_party, 'db', SimpleNamespace(
        campaign_members=members,
        player_characters=characters,
        players=legacy,
    ))

    rows = asyncio.run(live_party.build_live_party_rows('campaign-1'))

    assert [row['name'] for row in rows] == ['Ari', 'Bryn']
    ari = rows[0]
    assert ari['source'] == 'character'
    assert ari['hp'] == 7
    assert ari['ac'] == 16
    assert all(row['name'] != 'Pending Hero' for row in rows)


def test_live_bootstrap_uses_the_same_canonical_party_builder():
    source = (Path(__file__).resolve().parents[1] / 'routes' / 'dashboard_bootstrap.py').read_text()
    assert 'players_request = build_live_party_rows(campaign_id)' in source

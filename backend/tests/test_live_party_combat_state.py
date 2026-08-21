import importlib.util
import sys
import types
from pathlib import Path

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

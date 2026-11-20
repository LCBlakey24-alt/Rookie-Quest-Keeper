import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import CombatScenario, CombatScenarioCreate, CombatScenarioUpdate  # noqa: E402


def test_placements_default_empty_and_round_trip():
    assert CombatScenario(campaign_id='c', name='Ambush').placements == []
    created = CombatScenarioCreate(name='Ambush', placements=[{'id': 'goblin-1', 'col': 4, 'row': 7}])
    assert created.placements == [{'id': 'goblin-1', 'col': 4, 'row': 7}]
    assert CombatScenarioUpdate().placements is None
    update = CombatScenarioUpdate(placements=[{'id': 'hero', 'col': '2', 'row': 3.0}])
    assert update.model_dump(exclude_unset=True) == {'placements': [{'id': 'hero', 'col': 2, 'row': 3}]}


def test_placements_drop_malformed_duplicate_and_off_grid_entries():
    cleaned = CombatScenarioUpdate(placements=[
        {'id': 'a', 'col': 1, 'row': 1},
        {'id': 'a', 'col': 2, 'row': 2},
        {'id': '', 'col': 1, 'row': 1},
        {'id': 'b', 'col': -1, 'row': 1},
        {'id': 'c', 'col': 120, 'row': 1},
        {'id': 'd', 'col': 'x', 'row': 1},
        'junk',
        {'id': 'e', 'col': 0, 'row': 99, 'extra': 'ignored'},
    ]).placements
    assert cleaned == [{'id': 'a', 'col': 1, 'row': 1}, {'id': 'e', 'col': 0, 'row': 99}]

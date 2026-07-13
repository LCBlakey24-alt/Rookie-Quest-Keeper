import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.characters import calculate_spell_slots, compute_multiclass_spell_slots


def test_level_19_full_caster_has_one_9th_level_slot():
    slots = calculate_spell_slots('Wizard', 19)

    assert slots['9'] == 1
    assert slots['8'] == 1
    assert slots['7'] == 1


def test_epic_multiclass_spell_slots_stay_capped_at_level_20_table():
    slots = compute_multiclass_spell_slots([
        {"name": "Wizard", "level": 20},
        {"name": "Cleric", "level": 5},
    ])

    assert slots == {
        "1": 4,
        "2": 3,
        "3": 3,
        "4": 3,
        "5": 3,
        "6": 2,
        "7": 2,
        "8": 1,
        "9": 1,
    }

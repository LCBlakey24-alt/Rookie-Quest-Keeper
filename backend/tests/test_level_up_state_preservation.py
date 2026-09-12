import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import all_routers
from routes.character_level_up import router as safe_level_up_router
from routes.character_level_up import preserve_level_up_state, preserve_spell_slot_usage
from routes.characters import router as legacy_character_router


class LevelUpStatePreservationTests(unittest.TestCase):
    def test_safe_level_up_router_precedes_legacy_character_router(self):
        self.assertLess(
            all_routers.index(safe_level_up_router),
            all_routers.index(legacy_character_router),
        )

    def test_damaged_character_gains_new_hp_without_becoming_fully_healed(self):
        existing = {
            'level': 4,
            'max_hit_points': 36,
            'current_hit_points': 12,
            'hit_dice_remaining': 2,
            'spell_slots': {},
            'spell_slots_remaining': {},
        }
        calculated = {
            'level': 5,
            'max_hit_points': 45,
            'current_hit_points': 45,
            'hit_dice_remaining': 5,
            'spell_slots': {},
            'spell_slots_remaining': {},
        }

        result = preserve_level_up_state(existing, calculated, 'Fighter')

        self.assertEqual(result['max_hit_points'], 45)
        self.assertEqual(result['current_hit_points'], 21)
        self.assertEqual(result['hit_dice_remaining'], 3)

    def test_full_health_character_stays_full_after_gaining_hp(self):
        existing = {
            'level': 2,
            'max_hit_points': 20,
            'current_hit_points': 20,
            'hit_dice_remaining': 2,
        }
        calculated = {
            'level': 3,
            'max_hit_points': 27,
            'current_hit_points': 27,
            'hit_dice_remaining': 3,
            'spell_slots': {},
        }

        result = preserve_level_up_state(existing, calculated, 'Barbarian')

        self.assertEqual(result['current_hit_points'], 27)
        self.assertEqual(result['hit_dice_remaining'], 3)

    def test_spent_standard_spell_slots_stay_spent_while_new_capacity_is_added(self):
        result = preserve_spell_slot_usage(
            {'1': 4, '2': 2},
            {'1': 1, '2': 0},
            {'1': 4, '2': 3, '3': 2},
        )

        self.assertEqual(result, {'1': 1, '2': 1, '3': 2})

    def test_missing_remaining_slot_state_defaults_to_unspent(self):
        result = preserve_spell_slot_usage(
            {'1': 3},
            None,
            {'1': 4, '2': 2},
        )

        self.assertEqual(result, {'1': 4, '2': 2})

    def test_warlock_slot_rank_change_preserves_number_of_slots_spent(self):
        result = preserve_spell_slot_usage(
            {'1': 2},
            {'1': 1},
            {'2': 2},
            pooled=True,
        )

        self.assertEqual(result, {'2': 1})

    def test_warlock_level_up_uses_pooled_slot_preservation(self):
        existing = {
            'level': 2,
            'max_hit_points': 15,
            'current_hit_points': 9,
            'hit_dice_remaining': 0,
            'spell_slots': {'1': 2},
            'spell_slots_remaining': {'1': 1},
        }
        calculated = {
            'level': 3,
            'max_hit_points': 21,
            'current_hit_points': 21,
            'hit_dice_remaining': 3,
            'spell_slots': {'2': 2},
            'spell_slots_remaining': {'2': 2},
        }

        result = preserve_level_up_state(existing, calculated, 'Warlock')

        self.assertEqual(result['current_hit_points'], 15)
        self.assertEqual(result['hit_dice_remaining'], 1)
        self.assertEqual(result['spell_slots_remaining'], {'2': 1})


if __name__ == '__main__':
    unittest.main()

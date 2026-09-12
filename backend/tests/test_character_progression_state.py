"""Regression tests for preserving live character state through level-up."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-progression-state-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_progression_state import (  # noqa: E402
    preserve_level_up_live_state,
    preserve_spell_slot_state,
)


class TestCharacterProgressionState(unittest.TestCase):
    def test_level_up_preserves_damage_while_adding_new_hp(self):
        existing = {
            "character_class": "Fighter",
            "level": 3,
            "max_hit_points": 20,
            "current_hit_points": 9,
            "hit_dice_remaining": 2,
            "spell_slots": {},
            "spell_slots_remaining": {},
        }
        legacy_update = {
            "level": 4,
            "max_hit_points": 28,
            "current_hit_points": 28,
            "hit_dice_remaining": 4,
            "spell_slots": {},
            "spell_slots_remaining": {},
            "class_levels": {"Fighter": 4},
        }

        fixed = preserve_level_up_live_state(existing, legacy_update)
        self.assertEqual(fixed["current_hit_points"], 17)
        self.assertEqual(fixed["max_hit_points"], 28)

    def test_level_up_adds_one_new_unspent_hit_die(self):
        existing = {
            "character_class": "Fighter",
            "level": 3,
            "max_hit_points": 20,
            "current_hit_points": 20,
            "hit_dice_remaining": 1,
            "spell_slots": {},
            "spell_slots_remaining": {},
        }
        legacy_update = {
            "level": 4,
            "max_hit_points": 26,
            "current_hit_points": 26,
            "hit_dice_remaining": 4,
            "spell_slots": {},
            "spell_slots_remaining": {},
            "class_levels": {"Fighter": 4},
        }

        fixed = preserve_level_up_live_state(existing, legacy_update)
        self.assertEqual(fixed["hit_dice_remaining"], 2)

    def test_new_spell_slot_capacity_is_added_without_refilling_spent_slots(self):
        remaining = preserve_spell_slot_state(
            {"1": 3},
            {"1": 1},
            {"1": 4, "2": 2},
        )
        self.assertEqual(remaining, {"1": 2, "2": 2})

    def test_spell_slot_remaining_never_exceeds_new_total(self):
        remaining = preserve_spell_slot_state(
            {"1": 4, "2": 2},
            {"1": 99, "2": 99},
            {"1": 4, "2": 3},
        )
        self.assertEqual(remaining, {"1": 4, "2": 3})

    def test_warlock_pact_slot_level_change_preserves_spent_slot_count(self):
        remaining = preserve_spell_slot_state(
            {"1": 2},
            {"1": 1},
            {"2": 2},
            pact_style=True,
        )
        self.assertEqual(remaining, {"2": 1})

    def test_warlock_new_slot_capacity_becomes_available_without_full_refill(self):
        remaining = preserve_spell_slot_state(
            {"5": 2},
            {"5": 0},
            {"5": 3},
            pact_style=True,
        )
        self.assertEqual(remaining, {"5": 1})


if __name__ == "__main__":
    unittest.main()

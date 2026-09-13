"""Regression tests for edition-specific rest eligibility and Hit Die healing."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-recovery-edition-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_recovery import _spend_hit_dice, can_start_rest  # noqa: E402


class TestEditionAwareRecovery(unittest.TestCase):
    def test_2014_character_can_preserve_legacy_zero_hp_rest_behaviour(self):
        self.assertTrue(can_start_rest({
            "rules_edition": "2014",
            "current_hit_points": 0,
            "max_hit_points": 20,
        }))

    def test_2024_character_needs_at_least_one_hp_to_start_rest(self):
        self.assertFalse(can_start_rest({
            "rules_edition": "2024",
            "current_hit_points": 0,
            "max_hit_points": 20,
        }))
        self.assertTrue(can_start_rest({
            "rules_edition": "2024",
            "current_hit_points": 1,
            "max_hit_points": 20,
        }))

    @patch("routes.character_recovery.random.randint", return_value=1)
    def test_2014_hit_die_healing_can_be_zero(self, _roll):
        updates = _spend_hit_dice({
            "character_class": "Wizard",
            "rules_edition": "2014",
            "level": 1,
            "constitution": 5,
            "max_hit_points": 10,
            "current_hit_points": 2,
            "hit_dice_remaining": 1,
        }, 1)

        self.assertEqual(updates["last_rest_hit_points_recovered"], 0)
        self.assertEqual(updates["current_hit_points"], 2)
        self.assertEqual(updates["hit_dice_remaining"], 0)

    @patch("routes.character_recovery.random.randint", return_value=1)
    def test_2024_hit_point_die_healing_has_minimum_one(self, _roll):
        updates = _spend_hit_dice({
            "character_class": "Wizard",
            "rules_edition": "2024",
            "level": 1,
            "constitution": 5,
            "max_hit_points": 10,
            "current_hit_points": 2,
            "hit_dice_remaining": 1,
        }, 1)

        self.assertEqual(updates["last_rest_hit_points_recovered"], 1)
        self.assertEqual(updates["current_hit_points"], 3)
        self.assertEqual(updates["hit_dice_remaining"], 0)


if __name__ == "__main__":
    unittest.main()

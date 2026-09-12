"""Focused tests for edition-aware player character recovery."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-recovery-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_recovery import (  # noqa: E402
    long_rest_hit_dice,
    restore_resource_trackers,
)


class TestCharacterRecoveryHelpers(unittest.TestCase):
    def test_short_rest_restores_only_short_rest_trackers(self):
        resources = {
            "action_surge": {"current": 0, "remaining": 0, "max": 1, "restore": "short-rest"},
            "sorcery_points": {"current": 1, "remaining": 1, "max": 5, "restore": "long-rest"},
            "note": "keep me",
        }

        restored = restore_resource_trackers(resources, "short-rest")
        self.assertEqual(restored["action_surge"]["current"], 1)
        self.assertEqual(restored["action_surge"]["remaining"], 1)
        self.assertEqual(restored["sorcery_points"]["current"], 1)
        self.assertEqual(restored["sorcery_points"]["remaining"], 1)
        self.assertEqual(restored["note"], "keep me")

    def test_long_rest_restores_all_persisted_trackers(self):
        resources = {
            "pact_magic": {"current": 0, "remaining": 0, "max": 2, "restore": "short-rest"},
            "rage": {"current": 1, "remaining": 1, "max": 3, "restore": "long-rest"},
        }

        restored = restore_resource_trackers(resources, "long-rest")
        self.assertEqual(restored["pact_magic"]["remaining"], 2)
        self.assertEqual(restored["rage"]["remaining"], 3)

    def test_2014_long_rest_regains_half_total_hit_dice_minimum_one(self):
        character = {
            "edition": "2014",
            "level": 7,
            "hit_dice_remaining": 1,
        }
        self.assertEqual(long_rest_hit_dice(character), 4)

        level_one = {
            "rules_edition": "2014",
            "level": 1,
            "hit_dice_remaining": 0,
        }
        self.assertEqual(long_rest_hit_dice(level_one), 1)

    def test_2024_long_rest_restores_all_hit_point_dice(self):
        character = {
            "ruleset_id": "dnd5e_2024",
            "level": 9,
            "hit_dice_remaining": 2,
        }
        self.assertEqual(long_rest_hit_dice(character), 9)

    def test_multiclass_total_hit_dice_uses_class_level_sum(self):
        character = {
            "edition": "2014",
            "level": 8,
            "class_levels": {"Fighter": 5, "Wizard": 3},
            "hit_dice_remaining": 1,
        }
        self.assertEqual(long_rest_hit_dice(character), 5)


if __name__ == "__main__":
    unittest.main()

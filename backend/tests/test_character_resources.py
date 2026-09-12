"""Regression tests for persisted core-class resource trackers."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-resources-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from data.character_resources import merge_character_resources  # noqa: E402


class TestCharacterResources(unittest.TestCase):
    def test_spent_ki_stays_spent_but_new_level_adds_new_capacity(self):
        character = {
            "level": 2,
            "edition": "2014",
            "resources": {
                "ki": {
                    "label": "Ki",
                    "current": 0,
                    "remaining": 0,
                    "max": 2,
                    "restore": "short-rest",
                }
            },
        }

        resources = merge_character_resources(character, {"Monk": 3})

        self.assertEqual(resources["ki"]["max"], 3)
        self.assertEqual(resources["ki"]["current"], 1)
        self.assertEqual(resources["ki"]["remaining"], 1)

    def test_newly_unlocked_action_surge_starts_available_without_refilling_second_wind(self):
        character = {
            "level": 1,
            "edition": "2014",
            "resources": {
                "second_wind": {
                    "label": "Second Wind",
                    "current": 0,
                    "remaining": 0,
                    "max": 1,
                    "restore": "short-rest",
                }
            },
        }

        resources = merge_character_resources(character, {"Fighter": 2})

        self.assertEqual(resources["second_wind"]["current"], 0)
        self.assertEqual(resources["second_wind"]["max"], 1)
        self.assertEqual(resources["action_surge"]["current"], 1)
        self.assertEqual(resources["action_surge"]["max"], 1)

    def test_sorcery_points_gain_only_new_capacity(self):
        character = {
            "level": 2,
            "edition": "2014",
            "resources": {
                "sorcery_points": {
                    "current": 1,
                    "remaining": 1,
                    "max": 2,
                }
            },
        }

        resources = merge_character_resources(character, {"Sorcerer": 3})

        self.assertEqual(resources["sorcery_points"]["max"], 3)
        self.assertEqual(resources["sorcery_points"]["current"], 2)

    def test_multiclass_level_can_unlock_resource_for_new_class(self):
        character = {
            "level": 4,
            "edition": "2014",
            "resources": {
                "second_wind": {
                    "current": 0,
                    "remaining": 0,
                    "max": 1,
                }
            },
        }

        resources = merge_character_resources(character, {"Fighter": 3, "Monk": 2})

        self.assertEqual(resources["second_wind"]["current"], 0)
        self.assertEqual(resources["ki"]["max"], 2)
        self.assertEqual(resources["ki"]["current"], 2)

    def test_homebrew_resource_is_preserved_verbatim(self):
        homebrew = {
            "label": "Scarab Charges",
            "current": 3,
            "remaining": 3,
            "max": 8,
            "restore": "long-rest",
            "custom_note": "Akara",
        }
        character = {
            "level": 8,
            "edition": "2014",
            "resources": {"scarab_charges": homebrew},
        }

        resources = merge_character_resources(character, {"Warlock": 8})

        self.assertEqual(resources["scarab_charges"], homebrew)
        self.assertIn("pact_magic", resources)

    def test_missing_resource_can_be_left_uncreated_for_migration_safe_calls(self):
        resources = merge_character_resources(
            {"level": 3, "edition": "2014", "resources": {}},
            {"Fighter": 3},
            initialise_missing=False,
        )

        self.assertEqual(resources, {})


if __name__ == "__main__":
    unittest.main()

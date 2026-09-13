"""Regression tests for Cleric/Paladin Channel Divinity multiclass pools."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "channel-divinity-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from data.character_resources import merge_character_resources  # noqa: E402


class TestChannelDivinityMulticlassResources(unittest.TestCase):
    def test_2014_cleric_paladin_share_one_use_pool(self):
        resources = merge_character_resources(
            {"edition": "2014", "resources": {}},
            {"Cleric": 6, "Paladin": 4},
        )

        self.assertEqual(resources["channel_divinity"]["max"], 2)
        self.assertEqual(resources["channel_divinity"]["current"], 2)
        self.assertEqual(resources["channel_divinity"]["restore"], "short-rest")
        self.assertEqual(resources["channel_divinity"]["className"], "Cleric / Paladin")
        self.assertNotIn("cleric_channel_divinity", resources)
        self.assertNotIn("paladin_channel_divinity", resources)

    def test_2024_cleric_paladin_have_separate_use_pools(self):
        resources = merge_character_resources(
            {"edition": "2024", "resources": {}},
            {"Cleric": 6, "Paladin": 3},
        )

        self.assertNotIn("channel_divinity", resources)
        self.assertEqual(resources["cleric_channel_divinity"]["max"], 3)
        self.assertEqual(resources["cleric_channel_divinity"]["current"], 3)
        self.assertEqual(resources["cleric_channel_divinity"]["short_rest_restore"], 1)
        self.assertEqual(resources["paladin_channel_divinity"]["max"], 2)
        self.assertEqual(resources["paladin_channel_divinity"]["current"], 2)
        self.assertEqual(resources["paladin_channel_divinity"]["short_rest_restore"], 1)

    def test_2024_single_class_keeps_legacy_stable_key(self):
        cleric = merge_character_resources({"edition": "2024", "resources": {}}, {"Cleric": 6})
        paladin = merge_character_resources({"edition": "2024", "resources": {}}, {"Paladin": 3})

        self.assertEqual(cleric["channel_divinity"]["max"], 3)
        self.assertEqual(cleric["channel_divinity"]["className"], "Cleric")
        self.assertEqual(paladin["channel_divinity"]["max"], 2)
        self.assertEqual(paladin["channel_divinity"]["className"], "Paladin")

    def test_2024_dual_class_migrates_spent_legacy_cleric_tracker(self):
        resources = merge_character_resources(
            {
                "edition": "2024",
                "resources": {
                    "channel_divinity": {
                        "label": "Channel Divinity",
                        "className": "Cleric",
                        "max": 3,
                        "current": 1,
                        "remaining": 1,
                        "restore": "long-rest",
                        "short_rest_restore": 1,
                    }
                },
            },
            {"Cleric": 6, "Paladin": 3},
        )

        self.assertNotIn("channel_divinity", resources)
        self.assertEqual(resources["cleric_channel_divinity"]["max"], 3)
        self.assertEqual(resources["cleric_channel_divinity"]["current"], 1)
        self.assertEqual(resources["cleric_channel_divinity"]["remaining"], 1)
        self.assertEqual(resources["cleric_channel_divinity"]["migration_source"], "legacy_channel_divinity")
        self.assertEqual(resources["paladin_channel_divinity"]["max"], 2)
        self.assertEqual(resources["paladin_channel_divinity"]["current"], 2)

    def test_2024_ambiguous_legacy_tracker_uses_old_paladin_overwrite_shape(self):
        resources = merge_character_resources(
            {
                "edition": "2024",
                "resources": {
                    "channel_divinity": {
                        "label": "Channel Divinity",
                        "max": 2,
                        "current": 0,
                        "remaining": 0,
                        "restore": "long-rest",
                    }
                },
            },
            {"Cleric": 2, "Paladin": 3},
        )

        self.assertNotIn("channel_divinity", resources)
        self.assertEqual(resources["paladin_channel_divinity"]["current"], 0)
        self.assertEqual(resources["paladin_channel_divinity"]["migration_source"], "legacy_channel_divinity")
        self.assertEqual(resources["cleric_channel_divinity"]["current"], 2)


if __name__ == "__main__":
    unittest.main()

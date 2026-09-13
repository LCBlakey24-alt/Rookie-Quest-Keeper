"""Regression tests for non-destructive legacy 2024 spell-list migration."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-spell-migration-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_spell_migration import build_spell_list_migration  # noqa: E402


class TestCharacterSpellMigration(unittest.TestCase):
    def test_single_2024_prepared_caster_migrates_known_list_without_deleting_source(self):
        existing = {
            "character_class": "Warlock",
            "level": 3,
            "rules_edition": "2024",
            "class_levels": {"Warlock": 3},
            "spells_known": [
                {"name": "Hex", "level": 1},
                {"name": "Armor of Agathys", "level": 1},
                {"name": "Misty Step", "level": 2},
                {"name": "Hold Person", "level": 2},
            ],
        }

        migration = build_spell_list_migration(existing)

        self.assertTrue(migration["changed"])
        self.assertEqual(migration["migrated_classes"], ["Warlock"])
        self.assertEqual(
            [spell["name"] for spell in migration["updates"]["spells_prepared"]],
            ["Hex", "Armor of Agathys", "Misty Step", "Hold Person"],
        )
        self.assertTrue(all(spell["sourceClass"] == "Warlock" for spell in migration["updates"]["spells_prepared"]))
        self.assertNotIn("spells_known", migration["updates"])
        self.assertTrue(migration["updates"]["spell_list_migration"]["legacy_preserved"])

    def test_2014_character_is_not_migrated(self):
        migration = build_spell_list_migration({
            "character_class": "Warlock",
            "level": 3,
            "rules_edition": "2014",
            "spells_known": [{"name": "Hex"}],
        })
        self.assertFalse(migration["changed"])
        self.assertEqual(migration["updates"], {})

    def test_over_capacity_2024_list_requires_review_instead_of_truncating(self):
        migration = build_spell_list_migration({
            "character_class": "Ranger",
            "level": 1,
            "rules_edition": "2024",
            "class_levels": {"Ranger": 1},
            "spells_known": [
                {"name": "A", "level": 1},
                {"name": "B", "level": 1},
                {"name": "C", "level": 1},
            ],
        })
        self.assertFalse(migration["changed"])
        self.assertEqual(migration["review_required"][0]["reason"], "over_capacity")
        self.assertEqual(migration["review_required"][0]["capacity"], 2)
        self.assertEqual(migration["review_required"][0]["overflow"], 1)

    def test_untagged_multiclass_legacy_spells_are_reported_ambiguous(self):
        migration = build_spell_list_migration({
            "character_class": "Bard",
            "level": 5,
            "rules_edition": "2024",
            "class_levels": {"Bard": 3, "Warlock": 2},
            "spells_known": [{"name": "Legacy Untagged", "level": 1}],
        })
        self.assertFalse(migration["changed"])
        self.assertTrue(migration["ambiguous"])
        self.assertTrue(any(item["reason"] == "ambiguous_multiclass_source" for item in migration["review_required"]))

    def test_source_tagged_multiclass_legacy_spells_migrate_per_class(self):
        migration = build_spell_list_migration({
            "character_class": "Bard",
            "level": 5,
            "rules_edition": "2024",
            "class_levels": {"Bard": 3, "Warlock": 2},
            "spells_known": [
                {"name": "Healing Word", "level": 1, "sourceClass": "Bard"},
                {"name": "Hex", "level": 1, "sourceClass": "Warlock"},
            ],
        })
        self.assertTrue(migration["changed"])
        self.assertEqual(migration["migrated_classes"], ["Bard", "Warlock"])
        self.assertEqual(
            [(spell["sourceClass"], spell["name"]) for spell in migration["updates"]["spells_prepared"]],
            [("Bard", "Healing Word"), ("Warlock", "Hex")],
        )

    def test_existing_canonical_prepared_list_is_not_duplicated(self):
        migration = build_spell_list_migration({
            "character_class": "Bard",
            "level": 3,
            "rules_edition": "2024",
            "class_levels": {"Bard": 3},
            "spells_prepared": [{"name": "Healing Word", "level": 1}],
            "spells_known": [{"name": "Legacy Known", "level": 1}],
        })
        self.assertFalse(migration["changed"])
        self.assertEqual(migration["migrated_classes"], [])


if __name__ == "__main__":
    unittest.main()

"""Focused tests for edition-aware spell-slot math."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "spell-slot-rules-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from data.spell_slot_rules import (  # noqa: E402
    class_has_spellcasting,
    class_spell_slots,
    half_caster_contribution,
    pact_magic_shape,
    shared_caster_level,
    shared_spell_slots,
)


class TestSpellSlotRules(unittest.TestCase):
    def test_half_caster_contribution_is_edition_aware(self):
        self.assertEqual(half_caster_contribution(1, "2014"), 0)
        self.assertEqual(half_caster_contribution(1, "2024"), 1)
        self.assertEqual(half_caster_contribution(3, "2014"), 1)
        self.assertEqual(half_caster_contribution(3, "2024"), 2)

    def test_paladin_and_ranger_spellcasting_unlock_levels_follow_edition(self):
        legacy_paladin = {"rules_edition": "2014", "character_class": "Paladin", "level": 1}
        modern_paladin = {"rules_edition": "2024", "character_class": "Paladin", "level": 1}
        legacy_ranger = {"rules_edition": "2014", "character_class": "Ranger", "level": 1}
        modern_ranger = {"rules_edition": "2024", "character_class": "Ranger", "level": 1}

        self.assertFalse(class_has_spellcasting(legacy_paladin, "Paladin", 1))
        self.assertTrue(class_has_spellcasting(modern_paladin, "Paladin", 1))
        self.assertFalse(class_has_spellcasting(legacy_ranger, "Ranger", 1))
        self.assertTrue(class_has_spellcasting(modern_ranger, "Ranger", 1))

    def test_single_class_half_caster_slot_tables_follow_edition(self):
        self.assertEqual(
            class_spell_slots({"rules_edition": "2014"}, "Paladin", 1),
            {},
        )
        self.assertEqual(
            class_spell_slots({"rules_edition": "2024"}, "Paladin", 1),
            {"1": 2},
        )
        self.assertEqual(
            class_spell_slots({"rules_edition": "2024"}, "Ranger", 3),
            {"1": 3},
        )

    def test_multiclass_2024_half_caster_rounds_up(self):
        character = {
            "rules_edition": "2024",
            "character_class": "Wizard",
            "class_levels": {"Wizard": 1, "Paladin": 1},
        }
        levels = {"Wizard": 1, "Paladin": 1}
        self.assertEqual(shared_caster_level(character, levels), 2)
        self.assertEqual(shared_spell_slots(character, levels), {"1": 3})

    def test_multiclass_2014_half_caster_rounds_down(self):
        character = {
            "rules_edition": "2014",
            "character_class": "Wizard",
            "class_levels": {"Wizard": 1, "Paladin": 1},
        }
        levels = {"Wizard": 1, "Paladin": 1}
        self.assertEqual(shared_caster_level(character, levels), 1)
        self.assertEqual(shared_spell_slots(character, levels), {"1": 2})

    def test_third_caster_only_contributes_when_correct_subclass_is_present(self):
        eldritch_knight = {
            "rules_edition": "2014",
            "character_class": "Fighter",
            "level": 6,
            "subclass": "Eldritch Knight",
            "class_levels": {"Fighter": 6},
        }
        champion = {**eldritch_knight, "subclass": "Champion"}
        self.assertEqual(shared_caster_level(eldritch_knight, {"Fighter": 6}), 2)
        self.assertEqual(shared_spell_slots(eldritch_knight, {"Fighter": 6}), {"1": 3})
        self.assertEqual(shared_caster_level(champion, {"Fighter": 6}), 0)
        self.assertEqual(shared_spell_slots(champion, {"Fighter": 6}), {})

    def test_warlock_pact_magic_stays_separate(self):
        character = {
            "rules_edition": "2024",
            "character_class": "Warlock",
            "class_levels": {"Warlock": 11, "Paladin": 1},
        }
        self.assertEqual(shared_spell_slots(character, character["class_levels"]), {"1": 2})
        self.assertEqual(pact_magic_shape(11), {"5": 3})


if __name__ == "__main__":
    unittest.main()

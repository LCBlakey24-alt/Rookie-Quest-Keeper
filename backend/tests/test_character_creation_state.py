"""Regression tests for canonical character creation state."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-creation-state-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_creation_state import (  # noqa: E402
    clamp_slot_state,
    derive_creation_spell_slots,
    normalise_created_character,
    parse_class_breakdown,
)


class TestCharacterCreationState(unittest.TestCase):
    def test_imported_multiclass_text_becomes_real_class_levels(self):
        primary, levels, explicit = parse_class_breakdown("Fighter 3 / Rogue 2", 5)
        self.assertTrue(explicit)
        self.assertEqual(primary, "Fighter")
        self.assertEqual(levels, {"Fighter": 3, "Rogue": 2})

    def test_single_class_name_uses_total_level_without_destroying_homebrew_name(self):
        primary, levels, explicit = parse_class_breakdown("Scarlet Engineer", 6)
        self.assertFalse(explicit)
        self.assertEqual(primary, "Scarlet Engineer")
        self.assertEqual(levels, {"Scarlet Engineer": 6})

    def test_imported_warlock_gets_pact_slots_and_tracker(self):
        character = normalise_created_character(
            {
                "name": "Javen",
                "race": "Human",
                "character_class": "Warlock 11",
                "level": 11,
                "charisma": 18,
                "creation_mode": "imported",
            },
            "player-one",
        )
        self.assertEqual(character["character_class"], "Warlock")
        self.assertEqual(character["class_levels"], {"Warlock": 11})
        self.assertEqual(character["spell_slots"], {"5": 3})
        self.assertEqual(character["spell_slots_remaining"], {"5": 3})
        self.assertEqual(character["resources"]["pact_magic"]["max"], 3)
        self.assertEqual(character["resources"]["pact_magic"]["slot_level"], 5)
        self.assertEqual(character["spellcasting_ability"], "charisma")
        self.assertEqual(character["spell_save_dc"], 16)
        self.assertEqual(character["spell_attack_bonus"], 8)

    def test_imported_multiclass_caster_gets_shared_slot_table(self):
        character = normalise_created_character(
            {
                "name": "Dual Caster",
                "race": "Human",
                "character_class": "Wizard 3 / Cleric 2",
                "level": 5,
                "intelligence": 16,
                "wisdom": 16,
                "creation_mode": "imported",
            },
            "player-one",
        )
        self.assertEqual(character["character_class"], "Wizard")
        self.assertEqual(character["level"], 5)
        self.assertEqual(character["class_levels"], {"Wizard": 3, "Cleric": 2})
        self.assertEqual(character["spell_slots"], {"1": 4, "2": 3, "3": 2})

    def test_warlock_plus_wizard_keeps_shared_slots_and_pact_resource(self):
        character = normalise_created_character(
            {
                "name": "Split Caster",
                "race": "Human",
                "character_class": "Warlock 3 / Wizard 2",
                "level": 5,
                "charisma": 16,
                "intelligence": 16,
                "creation_mode": "imported",
            },
            "player-one",
        )
        self.assertEqual(character["spell_slots"], {"1": 3})
        self.assertEqual(character["resources"]["pact_magic"]["max"], 2)
        self.assertEqual(character["resources"]["pact_magic"]["slot_level"], 2)

    def test_multiclass_hit_dice_string_tracks_each_class(self):
        character = normalise_created_character(
            {
                "name": "Mixed Dice",
                "race": "Human",
                "character_class": "Fighter 3 / Wizard 2",
                "level": 5,
                "creation_mode": "imported",
            },
            "player-one",
        )
        self.assertIn("3d10", character["hit_dice"])
        self.assertIn("2d6", character["hit_dice"])
        self.assertEqual(character["hit_dice_remaining"], 5)

    def test_slot_remaining_values_are_clamped_to_capacity(self):
        self.assertEqual(
            clamp_slot_state({"1": 4, "2": 2}, {"1": 99, "2": -3, "3": 5}),
            {"1": 4, "2": 0},
        )

    def test_non_caster_has_no_derived_spell_slots(self):
        self.assertEqual(derive_creation_spell_slots("Fighter", "Champion", {"Fighter": 5}), {})

    def test_eldritch_knight_uses_third_caster_slot_progression(self):
        self.assertEqual(
            derive_creation_spell_slots("Fighter", "Eldritch Knight", {"Fighter": 6}),
            {"1": 3},
        )

    def test_arcane_trickster_uses_third_caster_slot_progression(self):
        self.assertEqual(
            derive_creation_spell_slots("Rogue", "Arcane Trickster", {"Rogue": 6}),
            {"1": 3},
        )

    def test_unknown_multiclass_preserves_explicit_homebrew_slot_map(self):
        character = normalise_created_character(
            {
                "name": "Homebrew Hybrid",
                "race": "Human",
                "character_class": "Scarlet Engineer 3 / Void Knight 2",
                "level": 5,
                "spell_slots": {"1": 2, "2": 1},
                "spell_slots_remaining": {"1": 1, "2": 1},
                "creation_mode": "imported",
            },
            "player-one",
        )
        self.assertEqual(character["spell_slots"], {"1": 2, "2": 1})
        self.assertEqual(character["spell_slots_remaining"], {"1": 1, "2": 1})


if __name__ == "__main__":
    unittest.main()

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
    preserve_pact_magic_resource,
    preserve_spell_slot_state,
    progression_spell_slot_totals,
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

    def test_multiclass_full_casters_use_shared_caster_level_table(self):
        existing = {
            "character_class": "Wizard",
            "subclass": "Evocation",
        }
        totals = progression_spell_slot_totals(existing, {"Wizard": 3, "Cleric": 2})
        self.assertEqual(totals, {"1": 4, "2": 3, "3": 2})

    def test_warlock_plus_wizard_keeps_shared_slots_out_of_pact_pool(self):
        existing = {
            "character_class": "Warlock",
            "subclass": "Fiend",
        }
        totals = progression_spell_slot_totals(existing, {"Warlock": 3, "Wizard": 2})
        self.assertEqual(totals, {"1": 3})

    def test_warlock_without_other_caster_keeps_legacy_pact_slot_shape(self):
        totals = progression_spell_slot_totals(
            {"character_class": "Warlock"},
            {"Warlock": 11, "Fighter": 1},
        )
        self.assertEqual(totals, {"5": 3})

    def test_pact_magic_resource_scales_at_levels_11_and_17(self):
        existing = {
            "character_class": "Warlock",
            "level": 10,
            "class_levels": {"Warlock": 10},
            "spell_slots_remaining": {"5": 1},
            "resources": {
                "pact_magic": {
                    "label": "Pact Magic",
                    "current": 1,
                    "remaining": 1,
                    "max": 2,
                    "restore": "short-rest",
                }
            },
        }
        level_11 = preserve_pact_magic_resource(existing, {"class_levels": {"Warlock": 11}})
        self.assertEqual(level_11["pact_magic"]["max"], 3)
        self.assertEqual(level_11["pact_magic"]["current"], 2)
        self.assertEqual(level_11["pact_magic"]["slot_level"], 5)

        existing_16 = {
            **existing,
            "level": 16,
            "class_levels": {"Warlock": 16},
            "resources": {"pact_magic": {"current": 2, "remaining": 2, "max": 3}},
        }
        level_17 = preserve_pact_magic_resource(existing_16, {"class_levels": {"Warlock": 17}})
        self.assertEqual(level_17["pact_magic"]["max"], 4)
        self.assertEqual(level_17["pact_magic"]["current"], 3)

    def test_adding_first_warlock_level_creates_short_rest_pact_tracker(self):
        existing = {
            "character_class": "Fighter",
            "level": 3,
            "class_levels": {"Fighter": 3},
            "resources": {},
        }
        resources = preserve_pact_magic_resource(
            existing,
            {"class_levels": {"Fighter": 3, "Warlock": 1}},
        )
        tracker = resources["pact_magic"]
        self.assertEqual(tracker["max"], 1)
        self.assertEqual(tracker["current"], 1)
        self.assertEqual(tracker["slot_level"], 1)
        self.assertEqual(tracker["restore"], "short-rest")


if __name__ == "__main__":
    unittest.main()

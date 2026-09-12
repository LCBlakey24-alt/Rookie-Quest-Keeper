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

from models import LevelUpRequest  # noqa: E402
from routes.character_progression_state import (  # noqa: E402
    build_state_safe_level_up_update,
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

    def test_spent_monk_resource_does_not_refill_when_levelling(self):
        existing = {
            "character_class": "Monk",
            "level": 2,
            "class_levels": {"Monk": 2},
            "max_hit_points": 16,
            "current_hit_points": 10,
            "hit_dice_remaining": 1,
            "spell_slots": {},
            "spell_slots_remaining": {},
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
        legacy_update = {
            "level": 3,
            "max_hit_points": 23,
            "current_hit_points": 23,
            "hit_dice_remaining": 3,
            "spell_slots": {},
            "spell_slots_remaining": {},
            "class_levels": {"Monk": 3},
        }

        fixed = preserve_level_up_live_state(existing, legacy_update)
        self.assertEqual(fixed["resources"]["ki"]["max"], 3)
        self.assertEqual(fixed["resources"]["ki"]["current"], 1)
        self.assertEqual(fixed["resources"]["ki"]["remaining"], 1)

    def test_newly_unlocked_fighter_resource_is_added_without_refilling_old_one(self):
        existing = {
            "character_class": "Fighter",
            "level": 1,
            "class_levels": {"Fighter": 1},
            "max_hit_points": 12,
            "current_hit_points": 8,
            "hit_dice_remaining": 0,
            "spell_slots": {},
            "spell_slots_remaining": {},
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
        legacy_update = {
            "level": 2,
            "max_hit_points": 20,
            "current_hit_points": 20,
            "hit_dice_remaining": 2,
            "spell_slots": {},
            "spell_slots_remaining": {},
            "class_levels": {"Fighter": 2},
        }

        fixed = preserve_level_up_live_state(existing, legacy_update)
        self.assertEqual(fixed["resources"]["second_wind"]["current"], 0)
        self.assertEqual(fixed["resources"]["action_surge"]["current"], 1)
        self.assertEqual(fixed["resources"]["action_surge"]["max"], 1)

    def test_homebrew_resource_survives_level_up_unchanged(self):
        scarab = {
            "label": "Scarab Charges",
            "current": 2,
            "remaining": 2,
            "max": 8,
            "restore": "long-rest",
            "custom_note": "Akara",
        }
        existing = {
            "character_class": "Warlock",
            "level": 8,
            "class_levels": {"Warlock": 8},
            "max_hit_points": 50,
            "current_hit_points": 41,
            "hit_dice_remaining": 4,
            "spell_slots": {"4": 2},
            "spell_slots_remaining": {"4": 1},
            "resources": {
                "scarab_charges": scarab,
                "pact_magic": {
                    "current": 1,
                    "remaining": 1,
                    "max": 2,
                    "slot_level": 4,
                    "restore": "short-rest",
                },
            },
        }
        legacy_update = {
            "level": 9,
            "max_hit_points": 57,
            "current_hit_points": 57,
            "hit_dice_remaining": 9,
            "spell_slots": {"5": 2},
            "spell_slots_remaining": {"5": 2},
            "class_levels": {"Warlock": 9},
        }

        fixed = preserve_level_up_live_state(existing, legacy_update)
        self.assertEqual(fixed["resources"]["scarab_charges"], scarab)
        self.assertEqual(fixed["resources"]["pact_magic"]["current"], 1)
        self.assertEqual(fixed["resources"]["pact_magic"]["slot_level"], 5)

    def test_existing_secondary_class_can_gain_a_level_without_changing_primary_class(self):
        existing = {
            "character_class": "Fighter",
            "subclass": "Champion",
            "level": 5,
            "class_levels": {"Fighter": 3, "Wizard": 2},
            "multiclass_levels": {"Fighter": 3, "Wizard": 2},
            "classes": [
                {"name": "Fighter", "level": 3, "subclass": "Champion"},
                {"name": "Wizard", "level": 2, "subclass": ""},
            ],
            "constitution": 14,
            "max_hit_points": 38,
            "current_hit_points": 20,
            "hit_dice_remaining": 2,
            "spell_slots": {"1": 3},
            "spell_slots_remaining": {"1": 1},
            "resources": {},
            "feats": [],
            "level_progression": {},
        }
        request = LevelUpRequest(new_level=6, new_class="Wizard", hp_method="average")

        update = build_state_safe_level_up_update(existing, request, "Wizard", "standard")

        self.assertEqual(update["class_levels"], {"Fighter": 3, "Wizard": 3})
        self.assertEqual(update["multiclass_levels"], {"Fighter": 3, "Wizard": 3})
        self.assertEqual(update["classes"][0]["subclass"], "Champion")
        self.assertEqual(update["classes"][1]["level"], 3)
        self.assertEqual(update["hit_dice"], "3d10 + 3d6")
        self.assertEqual(update["spell_slots"], {"1": 4, "2": 2})
        self.assertEqual(update["spell_slots_remaining"], {"1": 2, "2": 2})
        self.assertNotIn("character_class", update)

    def test_secondary_subclass_is_saved_on_that_class_not_primary_top_level_subclass(self):
        existing = {
            "character_class": "Fighter",
            "subclass": "Champion",
            "level": 5,
            "class_levels": {"Fighter": 3, "Wizard": 2},
            "multiclass_levels": {"Fighter": 3, "Wizard": 2},
            "classes": [
                {"name": "Fighter", "level": 3, "subclass": "Champion"},
                {"name": "Wizard", "level": 2, "subclass": ""},
            ],
            "constitution": 12,
            "max_hit_points": 30,
            "current_hit_points": 30,
            "hit_dice_remaining": 5,
            "spell_slots": {"1": 3},
            "spell_slots_remaining": {"1": 3},
            "resources": {},
            "feats": [],
            "level_progression": {},
            "edition": "2014",
        }
        request = LevelUpRequest(
            new_level=6,
            new_class="Wizard",
            subclass="Evocation",
            hp_method="average",
        )

        update = build_state_safe_level_up_update(existing, request, "Wizard", "standard")

        wizard = next(entry for entry in update["classes"] if entry["name"] == "Wizard")
        fighter = next(entry for entry in update["classes"] if entry["name"] == "Fighter")
        self.assertEqual(wizard["subclass"], "Evocation")
        self.assertEqual(fighter["subclass"], "Champion")
        self.assertNotIn("subclass", update)


if __name__ == "__main__":
    unittest.main()

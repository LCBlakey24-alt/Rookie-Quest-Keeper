"""Regression tests for state-safe edits from the creation-shaped full builder."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-edit-state-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_edit_state import (  # noqa: E402
    is_full_builder_edit,
    state_safe_builder_edit,
)


class TestCharacterEditState(unittest.TestCase):
    def test_full_builder_marker_is_explicit(self):
        self.assertTrue(is_full_builder_edit({"creation_mode": "full"}))
        self.assertTrue(is_full_builder_edit({"creation_mode": " FULL "}))
        self.assertFalse(is_full_builder_edit({"creation_mode": "imported"}))
        self.assertFalse(is_full_builder_edit({}))

    def test_higher_level_builder_edit_keeps_profile_and_abilities_only(self):
        existing = {
            "level": 8,
            "character_class": "Warlock",
            "class_levels": {"Warlock": 8},
            "name": "Javen",
            "race": "Human",
            "charisma": 16,
            "max_hit_points": 52,
            "current_hit_points": 19,
            "temporary_hit_points": 5,
            "hit_dice_remaining": 2,
            "spell_slots": {"4": 2},
            "spell_slots_remaining": {"4": 0},
            "resources": {
                "pact_magic": {"current": 0, "remaining": 0, "max": 2, "slot_level": 4},
                "scarab_charges": {"current": 3, "remaining": 3, "max": 8},
            },
            "conditions": ["Poisoned"],
            "inventory": [{"name": "Eye of Vecna"}],
            "gold": 31,
        }
        incoming = {
            "creation_mode": "full",
            "name": "Javen Crow",
            "race": "Human",
            "charisma": 18,
            "backstory": "Updated story",
            "level": 1,
            "character_class": "Fighter",
            "subclass": "Champion",
            "max_hit_points": 12,
            "current_hit_points": 12,
            "temporary_hit_points": 0,
            "hit_dice_remaining": 1,
            "spell_slots": {},
            "spell_slots_remaining": {},
            "resources": {},
            "conditions": [],
            "inventory": [{"name": "Starter sword"}],
            "equipment": [{"name": "Starter sword"}],
            "gold": 0,
            "currency": {"gold": 0},
            "inspiration": False,
        }

        update = state_safe_builder_edit(existing, incoming)

        self.assertEqual(update["name"], "Javen Crow")
        self.assertEqual(update["charisma"], 18)
        self.assertEqual(update["backstory"], "Updated story")
        for dangerous in [
            "level", "character_class", "subclass", "max_hit_points", "current_hit_points",
            "temporary_hit_points", "hit_dice_remaining", "spell_slots", "spell_slots_remaining",
            "resources", "conditions", "inventory", "equipment", "gold", "currency", "inspiration",
        ]:
            self.assertNotIn(dangerous, update)

    def test_multiclass_builder_edit_cannot_collapse_progression(self):
        existing = {
            "level": 6,
            "character_class": "Fighter",
            "class_levels": {"Fighter": 3, "Wizard": 3},
            "classes": [
                {"name": "Fighter", "level": 3, "subclass": "Champion"},
                {"name": "Wizard", "level": 3, "subclass": "Evocation"},
            ],
        }
        update = state_safe_builder_edit(existing, {
            "creation_mode": "full",
            "name": "Multiclass Hero",
            "character_class": "Wizard",
            "subclass": "Evocation",
            "level": 1,
            "class_features": [],
            "feats": [],
            "spells_known": [],
        })

        self.assertEqual(update["name"], "Multiclass Hero")
        self.assertNotIn("character_class", update)
        self.assertNotIn("subclass", update)
        self.assertNotIn("level", update)
        self.assertNotIn("class_features", update)
        self.assertNotIn("feats", update)
        self.assertNotIn("spells_known", update)

    def test_level_one_single_class_can_correct_structural_choices_without_refills(self):
        existing = {
            "level": 1,
            "character_class": "Fighter",
            "class_levels": {"Fighter": 1},
            "current_hit_points": 4,
            "max_hit_points": 12,
            "hit_dice_remaining": 0,
            "conditions": ["Grappled"],
        }
        update = state_safe_builder_edit(existing, {
            "creation_mode": "full",
            "character_class": "Wizard",
            "subclass": "",
            "edition": "2014",
            "rules_edition": "2014",
            "ruleset_id": "dnd5e_2014",
            "spellcasting_ability": "intelligence",
            "spell_slots": {"1": 2},
            "spell_slots_remaining": {"1": 2},
            "spells_known": [{"name": "Magic Missile", "level": 1}],
            "class_features": [{"name": "Arcane Recovery"}],
            "max_hit_points": 8,
            "current_hit_points": 8,
            "hit_dice_remaining": 1,
            "resources": {"arcane_recovery": {"current": 1, "max": 1}},
            "conditions": [],
        })

        self.assertEqual(update["character_class"], "Wizard")
        self.assertEqual(update["spellcasting_ability"], "intelligence")
        self.assertEqual(update["spell_slots"], {"1": 2})
        self.assertEqual(update["spells_known"][0]["name"], "Magic Missile")
        self.assertNotIn("spell_slots_remaining", update)
        self.assertNotIn("max_hit_points", update)
        self.assertNotIn("current_hit_points", update)
        self.assertNotIn("hit_dice_remaining", update)
        self.assertNotIn("resources", update)
        self.assertNotIn("conditions", update)

    def test_level_one_multiclass_shape_does_not_unlock_structural_rewrite(self):
        existing = {
            "level": 1,
            "character_class": "Fighter",
            "class_levels": {"Fighter": 1, "Wizard": 1},
        }
        update = state_safe_builder_edit(existing, {
            "creation_mode": "full",
            "name": "Odd Legacy Save",
            "character_class": "Rogue",
            "spell_slots": {},
        })

        self.assertEqual(update["name"], "Odd Legacy Save")
        self.assertNotIn("character_class", update)
        self.assertNotIn("spell_slots", update)


if __name__ == "__main__":
    unittest.main()

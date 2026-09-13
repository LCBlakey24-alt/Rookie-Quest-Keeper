"""Focused tests for class-aware level-up preflight."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-progression-preflight-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402
from routes.character_progression_preflight import build_level_up_preflight  # noqa: E402


class TestCharacterProgressionPreflight(unittest.TestCase):
    def setUp(self):
        self.character = {
            "id": "multi-one",
            "name": "Mixed Caster",
            "character_class": "Fighter",
            "subclass": "Champion",
            "level": 5,
            "edition": "2014",
            "ruleset_id": "dnd5e_2014",
            "class_levels": {"Fighter": 3, "Wizard": 2},
            "classes": [
                {"name": "Fighter", "level": 3, "subclass": "Champion"},
                {"name": "Wizard", "level": 2, "subclass": ""},
            ],
        }

    def test_secondary_existing_class_uses_its_own_class_level(self):
        result = build_level_up_preflight(self.character, target_class="Wizard")
        self.assertEqual(result["character_class"], "Wizard")
        self.assertEqual(result["current_level"], 5)
        self.assertEqual(result["target_level"], 6)
        self.assertEqual(result["class_level_before"], 2)
        self.assertEqual(result["class_level_after"], 3)
        self.assertEqual(result["hit_die"], 6)
        self.assertTrue(result["can_choose_subclass"])
        self.assertEqual(result["next_class_levels"], {"Fighter": 3, "Wizard": 3})

    def test_total_level_controls_proficiency_while_class_level_controls_asi(self):
        result = build_level_up_preflight(self.character, target_class="Fighter")
        self.assertEqual(result["target_level"], 6)
        self.assertEqual(result["proficiency_bonus"], 3)
        self.assertEqual(result["class_level_after"], 4)
        self.assertTrue(result["is_asi_level"])

    def test_secondary_subclass_prevents_repeat_subclass_prompt(self):
        character = {
            **self.character,
            "classes": [
                {"name": "Fighter", "level": 3, "subclass": "Champion"},
                {"name": "Wizard", "level": 2, "subclass": "Evocation"},
            ],
        }
        result = build_level_up_preflight(character, target_class="Wizard")
        self.assertFalse(result["can_choose_subclass"])

    def test_2014_ranger_still_uses_known_spell_progression(self):
        ranger = {
            "id": "ranger-legacy",
            "name": "Legacy Ranger",
            "character_class": "Ranger",
            "level": 1,
            "rules_edition": "2014",
            "ruleset_id": "dnd5e_2014",
            "class_levels": {"Ranger": 1},
            "classes": [{"name": "Ranger", "level": 1, "subclass": ""}],
        }
        result = build_level_up_preflight(ranger, target_class="Ranger")
        self.assertEqual(result["class_level_after"], 2)
        self.assertEqual(result["spells_to_learn"], 2)
        self.assertEqual(result["prepared_spell_capacity"], 0)
        self.assertEqual(result["progression_reference"]["spells_known_table"][2], 2)

    def test_2024_ranger_does_not_leak_legacy_known_spell_choices(self):
        ranger = {
            "id": "ranger-modern",
            "name": "Modern Ranger",
            "character_class": "Ranger",
            "level": 1,
            "rules_edition": "2024",
            "ruleset_id": "dnd5e_2024",
            "class_levels": {"Ranger": 1},
            "classes": [{"name": "Ranger", "level": 1, "subclass": ""}],
        }
        result = build_level_up_preflight(ranger, target_class="Ranger")
        self.assertEqual(result["class_level_after"], 2)
        self.assertEqual(result["spells_to_learn"], 0)
        self.assertEqual(result["prepared_spell_capacity_before"], 2)
        self.assertEqual(result["prepared_spell_capacity"], 3)
        self.assertEqual(result["prepared_spell_capacity_gain"], 1)
        self.assertEqual(result["progression_reference"]["spells_known_table"], {})
        self.assertEqual(result["progression_reference"]["prepared_spells_table"][1], 2)
        self.assertEqual(result["progression_reference"]["prepared_spells_table"][2], 3)

    def test_2024_paladin_exposes_prepared_capacity_without_known_spell_gain(self):
        paladin = {
            "id": "paladin-modern",
            "name": "Modern Paladin",
            "character_class": "Paladin",
            "level": 4,
            "rules_edition": "2024",
            "ruleset_id": "dnd5e_2024",
            "class_levels": {"Paladin": 4},
            "classes": [{"name": "Paladin", "level": 4, "subclass": "Oath of Devotion"}],
        }
        result = build_level_up_preflight(paladin, target_class="Paladin")
        self.assertEqual(result["class_level_after"], 5)
        self.assertEqual(result["spells_to_learn"], 0)
        self.assertEqual(result["prepared_spell_capacity_before"], 5)
        self.assertEqual(result["prepared_spell_capacity"], 6)
        self.assertEqual(result["prepared_spell_capacity_gain"], 1)

    def test_new_class_is_rejected_from_normal_level_up_preflight(self):
        with self.assertRaises(HTTPException) as raised:
            build_level_up_preflight(self.character, target_class="Cleric")
        self.assertEqual(raised.exception.status_code, 400)
        self.assertIn("Use the multiclass option", raised.exception.detail)

    def test_invalid_total_level_jump_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            build_level_up_preflight(self.character, target_level=8, target_class="Wizard")
        self.assertEqual(raised.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()

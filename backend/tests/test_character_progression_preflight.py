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

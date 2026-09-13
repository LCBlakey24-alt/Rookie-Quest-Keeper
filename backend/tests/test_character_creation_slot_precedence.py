"""Regression coverage for stale builder spell-slot payloads."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-creation-slot-precedence-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_creation_state import normalise_created_character  # noqa: E402


class TestCharacterCreationSlotPrecedence(unittest.TestCase):
    def test_2024_paladin_ignores_legacy_floor_slot_payload(self):
        character = normalise_created_character(
            {
                "name": "Modern Paladin",
                "race": "Human",
                "character_class": "Paladin",
                "level": 3,
                "rules_edition": "2024",
                "charisma": 16,
                # Old frontend helper used floor(level / 2), producing 2 slots.
                "spell_slots": {"1": 2},
                "spell_slots_remaining": {"1": 2},
            },
            "player-one",
        )
        self.assertEqual(character["spell_slots"], {"1": 3})
        self.assertEqual(character["spell_slots_remaining"], {"1": 2})

    def test_warlock_ignores_malformed_legacy_pact_shape(self):
        character = normalise_created_character(
            {
                "name": "Pact Caster",
                "race": "Human",
                "character_class": "Warlock",
                "level": 5,
                "rules_edition": "2024",
                "charisma": 16,
                # Legacy builder accidentally sent the Pact Magic metadata object
                # as if it were the ordinary spell-slot map.
                "spell_slots": {"slots": 2, "level": 3},
                "spell_slots_remaining": {"slots": 2, "level": 3},
            },
            "player-one",
        )
        self.assertEqual(character["spell_slots"], {"3": 2})
        self.assertEqual(character["spell_slots_remaining"], {"3": 2})
        self.assertNotIn("slots", character["spell_slots"])
        self.assertNotIn("level", character["spell_slots"])

    def test_unknown_homebrew_class_still_preserves_explicit_slots(self):
        character = normalise_created_character(
            {
                "name": "Void Adept",
                "race": "Human",
                "character_class": "Void Adept",
                "level": 4,
                "spell_slots": {"1": 3, "2": 2},
                "spell_slots_remaining": {"1": 1, "2": 0},
            },
            "player-one",
        )
        self.assertEqual(character["spell_slots"], {"1": 3, "2": 2})
        self.assertEqual(character["spell_slots_remaining"], {"1": 1, "2": 0})


if __name__ == "__main__":
    unittest.main()

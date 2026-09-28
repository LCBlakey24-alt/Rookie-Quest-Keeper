"""Unit coverage for player initiative modifier fallback."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "combat-initiative-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.combat_initiative_submissions import initiative_bonus_for  # noqa: E402


class TestCombatInitiativeModifier(unittest.TestCase):
    def test_explicit_bonus_wins_even_when_zero_or_negative(self):
        self.assertEqual(initiative_bonus_for({"initiative_bonus": 0, "dexterity": 18}), 0)
        self.assertEqual(initiative_bonus_for({"initiative_bonus": -2, "dexterity": 18}), -2)
        self.assertEqual(initiative_bonus_for({"initiative_bonus": "5", "dexterity": 8}), 5)

    def test_missing_bonus_falls_back_to_dexterity_modifier(self):
        self.assertEqual(initiative_bonus_for({"dexterity": 16}), 3)
        self.assertEqual(initiative_bonus_for({"dexterity": 9}), -1)
        self.assertEqual(initiative_bonus_for({}), 0)

    def test_invalid_explicit_bonus_falls_back_safely(self):
        self.assertEqual(initiative_bonus_for({"initiative_bonus": "bad", "dexterity": 14}), 2)


if __name__ == "__main__":
    unittest.main()

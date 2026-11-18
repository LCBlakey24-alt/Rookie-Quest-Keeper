"""Review finding 13: taking "Ability Score Improvement" as a feat changed
no scores. With its two increases it is now the ordinary ASI; without
them it is refused instead of being saved as a feat that does nothing."""

import os
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
for key, value in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "rookie_quest_keeper_test",
    "JWT_SECRET_KEY": "asi-feat-test-secret",
    "APP_URL": "http://localhost:3000",
    "CORS_ORIGINS": "http://localhost:3000",
}.items():
    os.environ.setdefault(key, value)

from fastapi import HTTPException  # noqa: E402
from models import LevelUpRequest  # noqa: E402
from routes.characters import build_level_up_update  # noqa: E402


def fighter(strength=15, constitution=13, max_hp=28):
    return {
        "id": "char-asi-feat", "character_class": "Fighter", "level": 3,
        "strength": strength, "dexterity": 12, "constitution": constitution,
        "intelligence": 10, "wisdom": 10, "charisma": 10,
        "max_hit_points": max_hp, "edition": "2024",
    }


def asi_feat(**choices):
    return LevelUpRequest(
        new_level=4, choice_type="feat",
        feat_choice={"name": "Ability Score Improvement", "description": "Increase one score by 2 or two by 1."},
        asi_choices=choices or None,
    )


class AsiFeatTests(unittest.TestCase):
    def test_the_feat_with_its_increases_raises_the_scores(self):
        update = build_level_up_update(fighter(), asi_feat(ability1="strength", ability2="strength"), "Fighter", "standard")
        self.assertEqual(update["strength"], 17)
        # Recorded as the ASI it is, not as an empty feat.
        self.assertFalse(any(f.get("name") == "Ability Score Improvement" for f in update.get("feats", [])))

    def test_scores_stay_capped_at_20(self):
        update = build_level_up_update(fighter(strength=19), asi_feat(ability1="strength", ability2="strength"), "Fighter", "standard")
        self.assertEqual(update["strength"], 20)

    def test_constitution_through_the_feat_adds_retroactive_hit_points(self):
        update = build_level_up_update(fighter(), asi_feat(ability1="constitution", ability2="constitution"), "Fighter", "standard")
        self.assertEqual(update["constitution"], 15)
        self.assertEqual(update["max_hit_points"], 28 + 6 + 2 + 3)

    def test_the_feat_without_increases_is_refused(self):
        with self.assertRaises(HTTPException) as refused:
            build_level_up_update(fighter(), asi_feat(), "Fighter", "standard")
        self.assertEqual(refused.exception.status_code, 400)

    def test_other_feats_are_still_recorded_as_feats(self):
        request = LevelUpRequest(new_level=4, choice_type="feat", feat_choice={"name": "Alert", "description": ""})
        update = build_level_up_update(fighter(), request, "Fighter", "standard")
        self.assertTrue(any(f.get("name") == "Alert" for f in update.get("feats", [])))
        self.assertEqual(update.get("strength", 15), 15)


if __name__ == "__main__":
    unittest.main()

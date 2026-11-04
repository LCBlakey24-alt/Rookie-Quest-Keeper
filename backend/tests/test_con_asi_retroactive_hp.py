"""Regression: a Constitution increase must raise hit points properly.

Two faults in build_level_up_update:

1. con_mod was read from the character *before* the ASI was applied, so a
   Constitution increase taken at this level did not count towards this
   level's own hit point gain.
2. The 5e rule that raising your Constitution modifier raises your hit point
   maximum by 1 for every level you already have was not implemented at all.

Together, a Fighter reaching level 4 and putting both ASI points into
Constitution (13 -> 15, modifier +1 -> +2) gained 6 hit points
(average 6 + old modifier 1, floored) where the rules give 11: average 6 plus
the new modifier 2, plus 1 for each of the 3 levels already held.
"""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# config.py deliberately fails fast without runtime configuration. These tests
# call a pure helper, so safe local values are sufficient here.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "con-asi-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from models import LevelUpRequest  # noqa: E402
from routes.characters import build_level_up_update  # noqa: E402


def fighter(level=3, constitution=13, max_hp=28):
    """A d10-hit-die single-class character at the given level."""
    return {
        "id": "char-1",
        "character_class": "Fighter",
        "level": level,
        "constitution": constitution,
        "strength": 16,
        "dexterity": 12,
        "intelligence": 10,
        "wisdom": 10,
        "charisma": 10,
        "max_hit_points": max_hp,
        "edition": "2014",
    }


def level_up_to(level, **kwargs):
    return LevelUpRequest(new_level=level, **kwargs)


class ConstitutionAsiHitPointTests(unittest.TestCase):
    def test_a_constitution_asi_counts_towards_this_levels_hit_points(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(
            4, choice_type="asi", asi_choices={"ability1": "constitution", "ability2": "constitution"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        # Constitution 13 -> 15, so the modifier goes +1 -> +2.
        self.assertEqual(update["constitution"], 15)
        # Average d10 is 6, plus the NEW modifier of 2, plus 1 retroactive
        # point for each of the 3 levels already held.
        self.assertEqual(update["max_hit_points"], 28 + 6 + 2 + 3)

    def test_the_retroactive_points_are_one_per_existing_level(self):
        character = fighter(level=7, constitution=13, max_hp=60)
        request = level_up_to(
            8, choice_type="asi", asi_choices={"ability1": "constitution", "ability2": "constitution"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["max_hit_points"], 60 + 6 + 2 + 7)

    def test_a_single_point_that_crosses_a_modifier_boundary_counts(self):
        """One point is enough when it crosses a boundary: 13 -> 14 is +1 -> +2."""
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(4, choice_type="asi", asi_choices={"ability1": "constitution"})

        update = build_level_up_update(character, request, "Fighter", "standard")

        # 13 -> 14 moves the modifier +1 -> +2, so one retroactive point per
        # existing level applies.
        self.assertEqual(update["constitution"], 14)
        self.assertEqual(update["max_hit_points"], 28 + 6 + 2 + 3)

    def test_an_asi_within_the_same_modifier_band_adds_nothing_retroactive(self):
        character = fighter(level=3, constitution=14, max_hp=30)
        request = level_up_to(4, choice_type="asi", asi_choices={"ability1": "constitution"})

        update = build_level_up_update(character, request, "Fighter", "standard")

        # 14 -> 15 keeps the modifier at +2, so only this level's gain applies.
        self.assertEqual(update["constitution"], 15)
        self.assertEqual(update["max_hit_points"], 30 + 6 + 2)

    def test_a_non_constitution_asi_does_not_change_hit_points(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(
            4, choice_type="asi", asi_choices={"ability1": "strength", "ability2": "dexterity"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["strength"], 17)
        self.assertEqual(update["dexterity"], 13)
        self.assertEqual(update["max_hit_points"], 28 + 6 + 1)

    def test_a_rolled_hit_die_also_uses_the_new_modifier(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(
            4,
            choice_type="asi",
            asi_choices={"ability1": "constitution", "ability2": "constitution"},
            hp_roll=9,
            hp_method="roll",
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["max_hit_points"], 28 + 9 + 2 + 3)

    def test_a_level_up_with_no_asi_is_unchanged(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(4, choice_type="standard")

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["max_hit_points"], 28 + 6 + 1)
        self.assertEqual(update["constitution"], 13)

    def test_a_score_already_at_20_is_not_pushed_past_the_cap(self):
        character = fighter(level=3, constitution=20, max_hp=40)
        request = level_up_to(
            4, choice_type="asi", asi_choices={"ability1": "constitution", "ability2": "constitution"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["constitution"], 20)
        # Modifier unchanged at +5, so no retroactive points.
        self.assertEqual(update["max_hit_points"], 40 + 6 + 5)

    def test_the_progression_entry_records_the_full_gain(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(
            4, choice_type="asi", asi_choices={"ability1": "constitution", "ability2": "constitution"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")
        entry = update["level_progression"]["4"]

        self.assertEqual(entry["hp_gained"], 6 + 2 + 3)
        self.assertEqual(entry["retroactive_hp"], 3)

    def test_a_negative_constitution_modifier_still_floors_at_one_point(self):
        character = fighter(level=3, constitution=6, max_hp=18)
        request = level_up_to(4, choice_type="standard")

        update = build_level_up_update(character, request, "Fighter", "standard")

        # Average 6 with a -2 modifier is 4, which is above the floor.
        self.assertEqual(update["max_hit_points"], 18 + 4)

    def test_current_hit_points_match_the_new_maximum(self):
        character = fighter(level=3, constitution=13, max_hp=28)
        request = level_up_to(
            4, choice_type="asi", asi_choices={"ability1": "constitution", "ability2": "constitution"}
        )

        update = build_level_up_update(character, request, "Fighter", "standard")

        self.assertEqual(update["current_hit_points"], update["max_hit_points"])


if __name__ == "__main__":
    unittest.main()

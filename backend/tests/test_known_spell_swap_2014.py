"""2014 known casters may swap one spell when they gain a level.

The 2014 PHB grants this to Bard, Ranger, Sorcerer and Warlock in their
Spellcasting / Pact Magic entries: "you can choose one of the spells you know
and replace it with another spell". The app offered no way to do it -- the
level-up route refused any replacement marker on a known-spell list outright:

    detail=f"{canonical_class} uses a known-spell list under {edition} rules;
            replacement markers are not accepted here."

so a 2014 Warlock could never trade away a spell they had outgrown.

2024 is unaffected: those classes keep a prepared list and go through
_apply_prepared_spell_changes, which already supported the swap.
"""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "known-spell-swap-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402

from data.class_progression import known_spell_change_rule  # noqa: E402
from models import LevelUpRequest  # noqa: E402
from routes.character_progression_state import route_level_up_spell_choices  # noqa: E402


def spell(name, level=1):
    return {"name": name, "level": level}


def warlock(edition="2014", known=None, level=3):
    return {
        "id": "char-1",
        "character_class": "Warlock",
        "level": level,
        "edition": edition,
        "constitution": 12,
        "spells_known": known if known is not None else [spell("Hex"), spell("Armor of Agathys")],
    }


def apply_spells(character, new_spells, new_level=4):
    request = LevelUpRequest(new_level=new_level, new_spells=new_spells)
    update = {"level_progression": {str(new_level): {"type": "standard"}}}
    return route_level_up_spell_choices(character, update, request, character["character_class"])


def names(spells):
    return [s.get("name") for s in spells]


class KnownSpellChangeRuleTests(unittest.TestCase):
    def test_the_four_2014_known_casters_may_swap_one_spell(self):
        for class_name in ("Bard", "Ranger", "Sorcerer", "Warlock"):
            with self.subTest(class_name=class_name):
                rule = known_spell_change_rule(class_name, "2014")
                self.assertEqual(rule["cadence"], "level-up")
                self.assertEqual(rule["max_replacements"], 1)

    def test_classes_without_a_known_list_get_no_allowance(self):
        for class_name in ("Wizard", "Cleric", "Druid", "Paladin", "Fighter"):
            with self.subTest(class_name=class_name):
                self.assertEqual(known_spell_change_rule(class_name, "2014")["max_replacements"], 0)

    def test_2024_is_handled_by_the_prepared_rule_instead(self):
        """The two rules must never both apply to one class and edition."""
        for class_name in ("Bard", "Ranger", "Sorcerer", "Warlock"):
            with self.subTest(class_name=class_name):
                self.assertEqual(known_spell_change_rule(class_name, "2024")["max_replacements"], 0)


class KnownSpellSwapTests(unittest.TestCase):
    def test_a_2014_warlock_can_swap_a_known_spell(self):
        character = warlock()
        update = apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        self.assertEqual(names(update["spells_known"]), ["Hunger of Hadar", "Armor of Agathys"])

    def test_the_swap_replaces_in_place_rather_than_appending(self):
        """The old behaviour appended, leaving the character over capacity."""
        character = warlock()
        update = apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        self.assertEqual(len(update["spells_known"]), 2)
        self.assertNotIn("Hex", names(update["spells_known"]))

    def test_the_replacement_marker_is_not_persisted_on_the_saved_spell(self):
        character = warlock()
        update = apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        for saved in update["spells_known"]:
            self.assertNotIn("replaces", saved)

    def test_the_swap_is_recorded_in_the_level_progression(self):
        character = warlock()
        update = apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        entry = update["level_progression"]["4"]
        self.assertEqual(entry["known_replacements"], [{"from": "Hex", "to": "Hunger of Hadar"}])
        self.assertEqual(entry["spell_selection_mode"], "known")

    def test_growth_and_a_swap_can_happen_in_the_same_level_up(self):
        character = warlock()
        update = apply_spells(
            character,
            [
                {"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"},
                {"name": "Misty Step", "level": 2},
            ],
        )

        self.assertEqual(names(update["spells_known"]), ["Hunger of Hadar", "Armor of Agathys", "Misty Step"])

    def test_plain_growth_with_no_swap_still_appends(self):
        character = warlock()
        update = apply_spells(character, [{"name": "Misty Step", "level": 2}])

        self.assertEqual(names(update["spells_known"]), ["Hex", "Armor of Agathys", "Misty Step"])

    def test_replacing_a_spell_the_character_does_not_know_is_refused(self):
        character = warlock()
        with self.assertRaises(HTTPException) as caught:
            apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Fireball"}])

        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("not on the current known spell list", caught.exception.detail)

    def test_swapping_into_a_spell_already_known_is_refused(self):
        character = warlock()
        with self.assertRaises(HTTPException) as caught:
            apply_spells(character, [{"name": "Armor of Agathys", "level": 1, "replaces": "Hex"}])

        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("already known", caught.exception.detail)

    def test_more_than_one_swap_is_refused(self):
        character = warlock(known=[spell("Hex"), spell("Armor of Agathys"), spell("Blight")])
        with self.assertRaises(HTTPException) as caught:
            apply_spells(
                character,
                [
                    {"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"},
                    {"name": "Counterspell", "level": 3, "replaces": "Blight"},
                ],
            )

        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("at most 1 known spell", caught.exception.detail)

    def test_a_class_with_no_allowance_is_still_refused(self):
        character = {
            "id": "char-2",
            "character_class": "Fighter",
            "level": 3,
            "edition": "2014",
            "spells_known": [spell("Hex")],
        }
        with self.assertRaises(HTTPException) as caught:
            apply_spells(character, [{"name": "Misty Step", "level": 2, "replaces": "Hex"}])

        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("cannot replace known spells", caught.exception.detail)

    def test_a_2024_warlock_still_uses_the_prepared_path(self):
        """Regression guard: 2024 must not fall through to the known branch."""
        character = warlock(edition="2024", known=[spell("Hex")])
        update = apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        self.assertIn("spells_prepared", update)
        self.assertNotIn("spells_known", update)
        self.assertEqual(update["level_progression"]["4"]["spell_selection_mode"], "prepared")

    def test_an_empty_known_list_rejects_a_swap_rather_than_inventing_one(self):
        character = warlock(known=[])
        with self.assertRaises(HTTPException) as caught:
            apply_spells(character, [{"name": "Hunger of Hadar", "level": 3, "replaces": "Hex"}])

        self.assertEqual(caught.exception.status_code, 400)

    def test_no_new_spells_leaves_the_payload_untouched(self):
        character = warlock()
        request = LevelUpRequest(new_level=4)
        update = route_level_up_spell_choices(character, {"level": 4}, request, "Warlock")

        self.assertEqual(update, {"level": 4})


if __name__ == "__main__":
    unittest.main()

"""Core player-journey regression coverage for Fighter and Wizard progression.

These tests are deliberately pure: no live database, network, or reusable account.
They run in normal CI and protect the rules paths exercised by the browser smoke test.
"""

import os
import sys
import types
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import only the progression modules under test. The normal routes package
# initializer registers the entire API surface and therefore imports optional
# AI/email integrations that are unrelated to these pure regression tests.
if "routes" not in sys.modules:
    routes_package = types.ModuleType("routes")
    routes_package.__path__ = [str(BACKEND_DIR / "routes")]
    sys.modules["routes"] = routes_package

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-journey-regression-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from models import LevelUpRequest  # noqa: E402
from routes.character_progression_state import build_state_safe_level_up_update  # noqa: E402


def apply_update(existing, update):
    return {**existing, **update}


def base_character(class_name, hit_die, **overrides):
    base = {
        "name": f"Regression {class_name}",
        "race": "Human",
        "character_class": class_name,
        "subclass": "",
        "level": 1,
        "edition": "2014",
        "rules_edition": "2014",
        "ruleset_id": "dnd5e_2014",
        "class_levels": {class_name: 1},
        "classes": [{"name": class_name, "level": 1, "subclass": ""}],
        "strength": 15,
        "dexterity": 14,
        "constitution": 14,
        "intelligence": 12,
        "wisdom": 10,
        "charisma": 8,
        "max_hit_points": hit_die + 2,
        "current_hit_points": hit_die + 2,
        "hit_dice": f"1d{hit_die}",
        "hit_dice_remaining": 1,
        "proficiency_bonus": 2,
        "spell_slots": {},
        "spell_slots_remaining": {},
        "resources": {},
        "feats": [],
        "level_progression": {},
    }
    base.update(overrides)
    return base


class TestCharacterJourneyRegression(unittest.TestCase):
    def test_fighter_can_progress_cleanly_from_level_1_through_level_5(self):
        fighter = base_character("Fighter", 10, strength=16, constitution=14)

        fighter = apply_update(
            fighter,
            build_state_safe_level_up_update(
                fighter,
                LevelUpRequest(new_level=2, new_class="Fighter", hp_method="average"),
                "Fighter",
                "standard",
            ),
        )
        self.assertEqual(fighter["level"], 2)
        self.assertEqual(fighter["class_levels"], {"Fighter": 2})
        self.assertEqual(fighter["resources"]["action_surge"]["max"], 1)

        fighter = apply_update(
            fighter,
            build_state_safe_level_up_update(
                fighter,
                LevelUpRequest(
                    new_level=3,
                    new_class="Fighter",
                    hp_method="average",
                    subclass="Champion",
                ),
                "Fighter",
                "standard",
            ),
        )
        self.assertEqual(fighter["level"], 3)
        self.assertEqual(fighter["subclass"], "Champion")

        fighter = apply_update(
            fighter,
            build_state_safe_level_up_update(
                fighter,
                LevelUpRequest(
                    new_level=4,
                    new_class="Fighter",
                    hp_method="average",
                    choice_type="asi",
                    asi_choices={"ability1": "strength", "ability2": "constitution"},
                ),
                "Fighter",
                "asi",
            ),
        )
        self.assertEqual(fighter["level"], 4)
        self.assertEqual(fighter["strength"], 17)
        self.assertEqual(fighter["constitution"], 15)

        fighter = apply_update(
            fighter,
            build_state_safe_level_up_update(
                fighter,
                LevelUpRequest(new_level=5, new_class="Fighter", hp_method="average"),
                "Fighter",
                "standard",
            ),
        )
        self.assertEqual(fighter["level"], 5)
        self.assertEqual(fighter["proficiency_bonus"], 3)
        self.assertEqual(fighter["hit_dice"], "5d10")
        self.assertEqual(fighter["class_levels"], {"Fighter": 5})
        self.assertEqual(set(fighter["level_progression"]), {"2", "3", "4", "5"})

    def test_wizard_early_progression_keeps_spellbook_and_spent_slot_state(self):
        wizard = base_character(
            "Wizard",
            6,
            intelligence=16,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 1},
            spellbook=[
                {"name": "Spell One", "level": 1},
                {"name": "Spell Two", "level": 1},
                {"name": "Spell Three", "level": 1},
                {"name": "Spell Four", "level": 1},
                {"name": "Spell Five", "level": 1},
                {"name": "Spell Six", "level": 1},
            ],
            spells_known=[],
            spells_prepared=[
                {"name": "Spell One", "level": 1},
                {"name": "Spell Two", "level": 1},
                {"name": "Spell Three", "level": 1},
                {"name": "Spell Four", "level": 1},
            ],
            cantrips_known=[
                {"name": "Cantrip One", "level": 0},
                {"name": "Cantrip Two", "level": 0},
                {"name": "Cantrip Three", "level": 0},
            ],
        )

        wizard = apply_update(
            wizard,
            build_state_safe_level_up_update(
                wizard,
                LevelUpRequest(
                    new_level=2,
                    new_class="Wizard",
                    hp_method="average",
                    subclass="School of Evocation",
                    new_spells=[
                        {"name": "Spell Seven", "level": 1},
                        {"name": "Spell Eight", "level": 1},
                    ],
                ),
                "Wizard",
                "standard",
            ),
        )
        self.assertEqual(wizard["level"], 2)
        self.assertEqual(wizard["subclass"], "School of Evocation")
        self.assertEqual(wizard["spell_slots"], {"1": 3})
        self.assertEqual(wizard["spell_slots_remaining"], {"1": 2})
        self.assertEqual(len(wizard["spellbook"]), 8)

        wizard = apply_update(
            wizard,
            build_state_safe_level_up_update(
                wizard,
                LevelUpRequest(
                    new_level=3,
                    new_class="Wizard",
                    hp_method="average",
                    new_spells=[
                        {"name": "Spell Nine", "level": 2},
                        {"name": "Spell Ten", "level": 2},
                    ],
                ),
                "Wizard",
                "standard",
            ),
        )
        self.assertEqual(wizard["level"], 3)
        self.assertEqual(wizard["spell_slots"], {"1": 4, "2": 2})
        self.assertEqual(wizard["spell_slots_remaining"], {"1": 3, "2": 2})
        self.assertEqual(len(wizard["spellbook"]), 10)
        self.assertEqual(wizard["level_progression"]["3"]["spell_selection_mode"], "spellbook")
        self.assertEqual(wizard["level_progression"]["3"]["spell_destination"], "spellbook")


if __name__ == "__main__":
    unittest.main()

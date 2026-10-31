"""Regression tests: a half/third caster's OWN slot table uses ceil, not floor.

floor() is the multiclass *contribution* rule ("add half your levels in paladin
and ranger classes, rounded down"). Using it for a class's own table understated
slots at every odd class level -- a 2014 Paladin 5 returned {"1": 3} instead of
{"1": 4, "2": 2}. Even levels coincide, which is why it went unnoticed.
"""
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from data.spell_slot_rules import (
    class_spell_slots,
    half_caster_contribution,
    shared_caster_level,
)
from routes.characters import calculate_spell_slots

# RAW 2014 Paladin / Ranger own slot table, levels 1-20.
HALF_CASTER_TABLE = {
    1: {},
    2: {"1": 2},
    3: {"1": 3},
    4: {"1": 3},
    5: {"1": 4, "2": 2},
    6: {"1": 4, "2": 2},
    7: {"1": 4, "2": 3},
    8: {"1": 4, "2": 3},
    9: {"1": 4, "2": 3, "3": 2},
    10: {"1": 4, "2": 3, "3": 2},
    11: {"1": 4, "2": 3, "3": 3},
    12: {"1": 4, "2": 3, "3": 3},
    13: {"1": 4, "2": 3, "3": 3, "4": 1},
    14: {"1": 4, "2": 3, "3": 3, "4": 1},
    15: {"1": 4, "2": 3, "3": 3, "4": 2},
    16: {"1": 4, "2": 3, "3": 3, "4": 2},
    17: {"1": 4, "2": 3, "3": 3, "4": 3, "5": 1},
    18: {"1": 4, "2": 3, "3": 3, "4": 3, "5": 1},
    19: {"1": 4, "2": 3, "3": 3, "4": 3, "5": 2},
    20: {"1": 4, "2": 3, "3": 3, "4": 3, "5": 2},
}

CHAR_2014 = {"edition": "2014"}


class TestCalculateSpellSlots:
    """routes.characters.calculate_spell_slots -- hardcoded 2014."""

    @pytest.mark.parametrize("level,expected", sorted(HALF_CASTER_TABLE.items()))
    def test_paladin_matches_raw_table(self, level, expected):
        assert calculate_spell_slots("Paladin", level) == expected

    def test_the_specific_regression(self):
        assert calculate_spell_slots("Paladin", 5) == {"1": 4, "2": 2}

    def test_odd_levels_no_longer_understated(self):
        for level in (3, 5, 7, 9, 11, 13, 15, 17, 19):
            assert calculate_spell_slots("Ranger", level) == HALF_CASTER_TABLE[level]

    def test_level_one_still_has_no_slots(self):
        # The 2014 Spellcasting start level; ceiling must not leak a slot here.
        assert calculate_spell_slots("Paladin", 1) == {}

    def test_full_caster_unaffected(self):
        assert calculate_spell_slots("Wizard", 5) == {"1": 4, "2": 3, "3": 2}

    def test_warlock_keeps_pact_table(self):
        assert calculate_spell_slots("Warlock", 5) != {"1": 4, "2": 3, "3": 2}


class TestClassSpellSlots:
    """data.spell_slot_rules.class_spell_slots -- edition aware."""

    @pytest.mark.parametrize("level,expected", sorted(HALF_CASTER_TABLE.items()))
    def test_paladin_2014_matches_raw_table(self, level, expected):
        assert class_spell_slots(CHAR_2014, "Paladin", level) == expected

    def test_the_specific_regression(self):
        assert class_spell_slots(CHAR_2014, "Paladin", 5) == {"1": 4, "2": 2}

    def test_2024_paladin_gains_slots_at_level_one(self):
        assert class_spell_slots({"edition": "2024"}, "Paladin", 1) == {"1": 2}

    def test_2014_paladin_has_none_at_level_one(self):
        assert class_spell_slots(CHAR_2014, "Paladin", 1) == {}

    @pytest.mark.parametrize(
        "level,expected",
        [(2, {}), (3, {"1": 2}), (4, {"1": 3}), (6, {"1": 3}), (7, {"1": 4, "2": 2})],
    )
    def test_eldritch_knight_own_table(self, level, expected):
        character = {
            "edition": "2014",
            "character_class": "Fighter",
            "subclass": "Eldritch Knight",
        }
        assert class_spell_slots(character, "Fighter", level) == expected


class TestMulticlassRuleIsUnchanged:
    """The multiclass contribution must keep its own (different) rounding."""

    def test_half_caster_contribution_still_rounds_down_in_2014(self):
        assert half_caster_contribution(5, "2014") == 2

    def test_half_caster_contribution_rounds_up_in_2024(self):
        # A genuine 2024 rules change, not a bug.
        assert half_caster_contribution(5, "2024") == 3

    def test_shared_caster_level_uses_the_contribution_rule(self):
        # Wizard 3 + Paladin 5 under 2014: 3 + floor(5/2) = 5, NOT 3 + 3.
        assert shared_caster_level(CHAR_2014, {"Wizard": 3, "Paladin": 5}) == 5

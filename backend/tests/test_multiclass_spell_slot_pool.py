"""Regression tests: the level-up path must build a real multiclass slot pool.

spell_slots_for_class_levels previously returned only the PRIMARY class's
single-class table and returned on the first spellcaster it found, so a
Wizard 5 multiclassing into Cleric 1 kept Wizard-5 slots instead of the
combined caster level 6, and a Warlock paired with another caster had one of
the two pools silently dropped.

compute_multiclass_spell_slots did hold correct combined logic but was dead --
nothing outside a single test referenced it -- which is exactly why the bug
survived in the live path.
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

from data.spell_slot_rules import FULL_CASTER_SLOTS, spell_slots_for_class_mix
from routes import characters as characters_route

C2014 = {"edition": "2014"}
C2024 = {"edition": "2024"}


def _row(level):
    return {str(k): int(v) for k, v in FULL_CASTER_SLOTS.get(level, {}).items()}


class TestSingleSpellcastingClassUsesItsOwnTable:
    """One caster class -> own table, NOT the multiclass contribution."""

    def test_single_class_paladin_is_not_understated(self):
        # The trap: shared_caster_level would floor this to 2 -> {"1": 3}.
        assert spell_slots_for_class_mix(C2014, {"Paladin": 5}) == {"1": 4, "2": 2}

    def test_single_class_full_caster(self):
        assert spell_slots_for_class_mix(C2014, {"Wizard": 5}) == _row(5)

    def test_caster_alongside_a_non_caster_still_uses_its_own_table(self):
        # Fighter contributes nothing, so Paladin remains a single caster class.
        assert spell_slots_for_class_mix(C2014, {"Fighter": 6, "Paladin": 5}) == {"1": 4, "2": 2}

    def test_non_casters_only(self):
        assert spell_slots_for_class_mix(C2014, {"Fighter": 5, "Barbarian": 3}) == {}


class TestMoreThanOneCasterUsesTheCombinedTable:
    def test_the_specific_regression_wizard_five_into_cleric_one(self):
        # Combined caster level 6, not Wizard 5.
        assert spell_slots_for_class_mix(C2014, {"Wizard": 5, "Cleric": 1}) == _row(6)
        assert spell_slots_for_class_mix(C2014, {"Wizard": 5, "Cleric": 1}) != _row(5)

    def test_half_caster_contributes_floored_in_2014(self):
        # Wizard 3 + Paladin 5 -> 3 + floor(5/2) = 5.
        assert spell_slots_for_class_mix(C2014, {"Wizard": 3, "Paladin": 5}) == _row(5)

    def test_half_caster_contributes_rounded_up_in_2024(self):
        # 2024 rounds half-caster levels up: 3 + ceil(5/2) = 6.
        assert spell_slots_for_class_mix(C2024, {"Wizard": 3, "Paladin": 5}) == _row(6)

    def test_combined_level_is_capped_at_the_level_20_row(self):
        assert spell_slots_for_class_mix(C2014, {"Wizard": 20, "Cleric": 5}) == _row(20)


class TestPactMagicStaysSeparate:
    def test_warlock_only_returns_pact_slots(self):
        slots = spell_slots_for_class_mix(C2014, {"Warlock": 3})
        assert slots == {"2": 2}

    def test_warlock_levels_do_not_inflate_the_shared_pool(self):
        # Pact Magic must not contribute to the shared caster level, so a
        # Wizard 3 / Warlock 1 shared pool is still caster level 3.
        assert spell_slots_for_class_mix(C2014, {"Wizard": 3, "Warlock": 1}) == _row(3)

    def test_warlock_plus_caster_keeps_the_shared_pool(self):
        # Documents the current single-field limitation: the shared pool wins
        # and the pact pool is not separately represented. Matches
        # progression_spell_slot_totals. Representing both needs a schema
        # change, tracked separately.
        assert spell_slots_for_class_mix(C2014, {"Wizard": 5, "Warlock": 2}) == _row(5)


class TestLevelUpWrapper:
    def test_wrapper_delegates_and_is_edition_aware(self):
        slots = characters_route.spell_slots_for_class_levels(
            C2014, "Wizard", 6, {"Wizard": 5, "Cleric": 1}
        )
        assert slots == _row(6)

    def test_wrapper_falls_back_to_primary_class_when_no_class_levels(self):
        slots = characters_route.spell_slots_for_class_levels(C2014, "Wizard", 5, {})
        assert slots == _row(5)

    def test_dead_helper_is_gone(self):
        # It looked like the multiclass fix was wired up when it was not.
        assert not hasattr(characters_route, 'compute_multiclass_spell_slots')

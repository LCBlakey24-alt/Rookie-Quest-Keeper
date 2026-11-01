"""Regression tests: the level-up wizard must offer a subclass per edition.

routes/progression.py hardcoded 2014 unlock levels (cleric/sorcerer/warlock at
1, druid/wizard at 2) and read no edition at all. Under 2024 rules every class
unlocks at 3, so:

* a 2024 Cleric, Sorcerer or Warlock was NEVER offered a subclass -- the check
  was `target_level == 1` and target_level is always at least 2;
* a 2024 Druid or Wizard was offered two levels early.

It also used exact equality, so a character already past the unlock level
without a subclass (an import, a repaired record) was never prompted again.

get_subclass_unlock_level keys off CAPITALISED class names while the route
lowercases, so these tests also pin the casing: passing the lowercase name
would silently fall through to HOMEBREW_SUBCLASS_UNLOCK_LEVEL (1) and
reintroduce the bug in a new disguise.
"""
import ast
import inspect
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

import routes.progression as progression
from config import (
    HOMEBREW_SUBCLASS_UNLOCK_LEVEL,
    SUBCLASS_LEVELS_2014,
    SUBCLASS_LEVELS_2024,
    get_subclass_unlock_level,
)
from data.spell_slot_rules import edition_for

CLASSES = [
    'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
    'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
]


def would_prompt(char_class, target_level, edition, has_subclass=False):
    """Replicate the route's decision using the same helper it now calls."""
    unlock = get_subclass_unlock_level(char_class.title(), edition)
    return target_level >= unlock and not has_subclass


class TestEditionAwareUnlockLevels:
    @pytest.mark.parametrize('char_class', CLASSES)
    def test_2024_unlocks_at_three_for_every_class(self, char_class):
        assert get_subclass_unlock_level(char_class.title(), '2024') == 3

    @pytest.mark.parametrize('char_class,expected', [
        ('cleric', 1), ('sorcerer', 1), ('warlock', 1),
        ('druid', 2), ('wizard', 2),
        ('fighter', 3), ('rogue', 3), ('barbarian', 3),
    ])
    def test_2014_levels_are_unchanged(self, char_class, expected):
        # The previously hardcoded table, preserved exactly.
        assert get_subclass_unlock_level(char_class.title(), '2014') == expected

    @pytest.mark.parametrize('char_class', CLASSES)
    def test_no_class_falls_through_to_the_homebrew_default(self, char_class):
        # A casing mismatch would silently return HOMEBREW_SUBCLASS_UNLOCK_LEVEL.
        assert char_class.title() in SUBCLASS_LEVELS_2014
        assert char_class.title() in SUBCLASS_LEVELS_2024

    def test_lowercase_names_would_fall_through(self):
        # Documents why the route must title-case: this is the trap.
        assert get_subclass_unlock_level('cleric', '2024') == HOMEBREW_SUBCLASS_UNLOCK_LEVEL
        assert get_subclass_unlock_level('Cleric', '2024') == 3


class TestTheRegression:
    @pytest.mark.parametrize('char_class', ['cleric', 'sorcerer', 'warlock'])
    def test_2024_classes_that_were_never_prompted_now_are(self, char_class):
        # Previously unreachable: the check was target_level == 1.
        assert would_prompt(char_class, 3, '2024') is True

    @pytest.mark.parametrize('char_class', ['druid', 'wizard'])
    def test_2024_classes_are_no_longer_prompted_early(self, char_class):
        assert would_prompt(char_class, 2, '2024') is False
        assert would_prompt(char_class, 3, '2024') is True

    @pytest.mark.parametrize('char_class', ['cleric', 'sorcerer', 'warlock'])
    def test_2014_still_prompts_at_level_one_unlock(self, char_class):
        assert would_prompt(char_class, 2, '2014') is True

    def test_a_character_past_the_unlock_level_is_still_prompted(self):
        # The exact-equality bug: a level-7 2024 Cleric with no subclass.
        assert would_prompt('cleric', 7, '2024') is True

    def test_a_character_that_already_chose_is_not_re_prompted(self):
        assert would_prompt('cleric', 7, '2024', has_subclass=True) is False

    def test_below_the_unlock_level_is_not_prompted(self):
        assert would_prompt('cleric', 2, '2024') is False


class TestEditionDetection:
    @pytest.mark.parametrize('character,expected', [
        ({'edition': '2024'}, '2024'),
        ({'rules_edition': '2024'}, '2024'),
        ({'ruleset_id': 'dnd5e_2024'}, '2024'),
        ({'edition': '2014'}, '2014'),
        ({}, '2014'),
    ])
    def test_edition_is_read_from_any_of_the_stored_fields(self, character, expected):
        assert edition_for(character) == expected


class TestTheRouteActuallyUsesIt:
    """Guard the fix itself, since the helper was imported-but-unused before."""

    def test_hardcoded_table_is_gone(self):
        source = inspect.getsource(progression)
        assert "'cleric': 1" not in source
        assert "'sorcerer': 1" not in source

    def test_route_calls_the_edition_aware_helper(self):
        source = inspect.getsource(progression)
        assert 'get_subclass_unlock_level(' in source
        assert 'edition_for(character)' in source

    def test_route_uses_a_greater_or_equal_comparison(self):
        tree = ast.parse(inspect.getsource(progression))
        compares = [
            node for node in ast.walk(tree)
            if isinstance(node, ast.Compare)
            and 'subclass_level' in ast.unparse(node)
        ]
        assert compares, 'no comparison against subclass_level found'
        assert any(isinstance(op, ast.GtE) for node in compares for op in node.ops)

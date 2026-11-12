"""Combat and the party roster use the same initiative modifier as the sheet."""
from routes.combat_initiative_submissions import initiative_bonus_for
from utils.initiative import initiative_modifier
from utils.live_party import _character_row


def test_a_saved_default_zero_uses_the_dex_modifier():
    hero = {'dexterity': 16, 'initiative_bonus': 0}
    assert initiative_modifier(hero) == 3
    assert initiative_bonus_for(hero) == 3
    assert _character_row(hero, {})['initiativeMod'] == 3


def test_a_nonzero_bonus_or_a_marked_manual_zero_is_kept():
    assert initiative_modifier({'dexterity': 16, 'initiative_bonus': 5}) == 5
    assert initiative_modifier({'dexterity': 16, 'initiative_bonus': 0, 'initiative_bonus_override': True}) == 0


def test_an_explicit_current_modifier_wins():
    assert initiative_modifier({'dexterity': 16, 'initiative_bonus': 5, 'initiative_mod': 7}) == 7


def test_missing_scores_fall_back_to_ten():
    assert initiative_modifier({}) == 0
    assert initiative_modifier(None) == 0
    assert initiative_modifier({'stats': {'dexterity': 8}}) == -1

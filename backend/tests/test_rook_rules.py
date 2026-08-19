from utils.rook_rules import monster_design_fragment, review_creature_draft


def test_monster_design_fragment_covers_action_economy_and_cr_uncertainty():
    text = monster_design_fragment().lower()
    assert "challenge rating" in text
    assert "action economy" in text
    assert "estimate" in text
    assert "multiattack" in text


def test_creature_review_flags_incomplete_combat_block():
    warnings = review_creature_draft({
        "name": "Root Horror",
        "cr": "3",
        "hp": 50,
        "ac": 14,
        "abilities": "It lashes out at nearby creatures.",
    })
    combined = " ".join(warnings).lower()
    assert "damage dice" in combined
    assert "estimate" in combined


def test_creature_review_flags_suspicious_low_cr_defence():
    warnings = review_creature_draft({
        "name": "Tiny Fortress",
        "cr": "1",
        "hp": 140,
        "ac": 22,
        "abilities": "Slam: +5 to hit, 1d8+3 bludgeoning damage.",
    })
    combined = " ".join(warnings).lower()
    assert "durability" in combined
    assert "ac" in combined


def test_creature_review_prompts_action_economy_for_mid_cr_single_action():
    warnings = review_creature_draft({
        "name": "Slow Brute",
        "cr": "7",
        "hp": 115,
        "ac": 16,
        "abilities": "Hammer: +7 to hit, 2d10+4 bludgeoning damage.",
    })
    assert any("action economy" in warning.lower() for warning in warnings)

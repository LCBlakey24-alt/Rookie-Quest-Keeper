from utils.rook_brain import (
    rook_brain_fragment,
    rook_chat_fragment,
    rook_form_fill_fragment,
    rook_generate_fragment,
)


def test_rook_brain_fragment_includes_core_behaviour_and_original_bank():
    fragment = rook_brain_fragment()

    assert "You are ROOK" in fragment
    assert "ROOK BEHAVIOUR RULES" in fragment
    assert "ORIGINAL ROOK QUICK BANK" in fragment
    assert "Elf names:" in fragment
    assert "Taverns:" in fragment
    assert "Quick hooks:" in fragment


def test_rook_form_fill_fragment_is_json_and_field_focused():
    fragment = rook_form_fill_fragment()

    assert "JSON OUTPUT RULES" in fragment
    assert "form fields" in fragment or "field" in fragment.lower()
    assert "valid JSON only" in fragment


def test_rook_generate_fragment_is_json_generation_focused():
    fragment = rook_generate_fragment()

    assert "Generate original campaign content" in fragment
    assert "JSON OUTPUT RULES" in fragment
    assert "Rookie Quest Keeper" in fragment


def test_rook_chat_fragment_can_be_player_safe():
    fragment = rook_chat_fragment(player_facing=True)

    assert "PLAYER-FACING SAFETY" in fragment
    assert "Do not reveal GM-only secrets" in fragment
    assert "spoiler-safe" in fragment


def test_rook_live_play_fragment_prioritises_table_speed():
    fragment = rook_chat_fragment(live_play=True)

    assert "Prioritise speed" in fragment
    assert "table momentum" in fragment

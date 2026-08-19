from routes.live_state import contains_name, phrase_near_name, JOIN_PHRASES, LEAVE_PHRASES


def test_named_npc_join_phrase_is_detected():
    note = "Jordan Crow agrees to help the party and then joins the party at the Broken Wall."
    assert contains_name(note, "Jordan Crow") is True
    assert phrase_near_name(note, "Jordan Crow", JOIN_PHRASES) is True


def test_named_npc_travel_phrase_is_detected():
    note = "Godfrey Barfoot comes with us to investigate the old road."
    assert phrase_near_name(note, "Godfrey Barfoot", JOIN_PHRASES) is True


def test_named_npc_leave_phrase_is_detected():
    note = "After the argument, Jordan Crow leaves the party and returns to Baldering."
    assert phrase_near_name(note, "Jordan Crow", LEAVE_PHRASES) is True


def test_phrase_for_someone_else_does_not_change_named_npc():
    note = "Jordan Crow stays in Baldering. Much later, Mira Barfoot joins the party."
    assert contains_name(note, "Jordan Crow") is True
    assert phrase_near_name(note, "Jordan Crow", JOIN_PHRASES) is False
    assert phrase_near_name(note, "Mira Barfoot", JOIN_PHRASES) is True


def test_mention_without_companion_language_is_not_a_suggestion():
    note = "The party speaks to Jordan Crow about the damaged wall."
    assert contains_name(note, "Jordan Crow") is True
    assert phrase_near_name(note, "Jordan Crow", JOIN_PHRASES) is False
    assert phrase_near_name(note, "Jordan Crow", LEAVE_PHRASES) is False

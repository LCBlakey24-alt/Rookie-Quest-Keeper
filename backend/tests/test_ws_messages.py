from utils.ws_messages import ALLOWED_CLIENT_MESSAGE_TYPES, is_allowed_client_message_type


def test_known_campaign_message_types_are_allowed():
    expected = {
        "ping",
        "cursor_move",
        "map_update",
        "initiative_update",
        "chat_message",
        "dice_roll",
        "get_users",
    }
    assert ALLOWED_CLIENT_MESSAGE_TYPES == expected
    assert all(is_allowed_client_message_type(value) for value in expected)


def test_unknown_or_malformed_message_types_are_rejected():
    for value in ("", "arbitrary_event", "player_display_update", None, 42, {}):
        assert is_allowed_client_message_type(value) is False

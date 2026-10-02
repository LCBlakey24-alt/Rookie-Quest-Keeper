"""Validation helpers for client-originated campaign WebSocket messages."""

ALLOWED_CLIENT_MESSAGE_TYPES = frozenset({
    "ping",
    "cursor_move",
    "map_update",
    "initiative_update",
    "chat_message",
    "dice_roll",
    "get_users",
})


def is_allowed_client_message_type(message_type: object) -> bool:
    return isinstance(message_type, str) and message_type in ALLOWED_CLIENT_MESSAGE_TYPES

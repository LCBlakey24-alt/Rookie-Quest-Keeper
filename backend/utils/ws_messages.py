"""Validation helpers for client-originated campaign WebSocket messages."""
import json

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

# Messages that change state everyone at the table sees. Players may send chat,
# dice and cursor updates; only the campaign's GM may push these.
GM_ONLY_MESSAGE_TYPES = frozenset({"map_update", "initiative_update"})

# Comfortably above any real map/initiative payload, far below the 16 MB the
# server would otherwise accept and relay to every player.
MAX_CLIENT_MESSAGE_CHARS = 64 * 1024


def parse_client_message(raw: object):
    """Return the message as a dict, or None if it is too large or not a JSON object."""
    if not isinstance(raw, str) or len(raw) > MAX_CLIENT_MESSAGE_CHARS:
        return None
    try:
        data = json.loads(raw)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None

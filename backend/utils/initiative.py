"""One initiative modifier for the sheet, the party roster and combat.

Mirrors getInitiativeModifier in frontend/src/data/initiativeRules.js.
Older character models save ``initiative_bonus: 0`` by default even when the
character has a nonzero DEX modifier, so a saved zero only counts when it was
marked as a manual choice; otherwise the DEX modifier is used.
"""
from typing import Any, Dict, Optional


def _as_int(value: Any) -> Optional[int]:
    if value is None or value == '' or isinstance(value, bool):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _dexterity(character: Dict[str, Any]) -> int:
    stats = character.get('stats') if isinstance(character.get('stats'), dict) else {}
    for value in (character.get('dexterity'), character.get('dex'), stats.get('dexterity'), stats.get('dex')):
        score = _as_int(value)
        if score is not None:
            return score
    return 10


def initiative_modifier(character: Optional[Dict[str, Any]]) -> int:
    character = character if isinstance(character, dict) else {}
    explicit = _as_int(character.get('initiativeMod', character.get('initiative_mod')))
    if explicit is not None:
        return explicit
    saved = _as_int(character.get('initiative_bonus'))
    marked_manual = character.get('initiative_bonus_override') is True or character.get('initiative_is_manual') is True
    if saved is not None and (saved != 0 or marked_manual):
        return saved
    return (_dexterity(character) - 10) // 2


# Fields a projection must read for initiative_modifier to see what the sheet sees.
INITIATIVE_SOURCE_FIELDS = (
    'initiativeMod', 'initiative_mod', 'initiative_bonus', 'initiative_bonus_override',
    'initiative_is_manual', 'dexterity', 'dex', 'stats',
)

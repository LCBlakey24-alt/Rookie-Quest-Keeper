"""One-way, player-safe field contract for GM-authored second-screen states.

Campaign display snapshots are readable by campaign *members*, not just GMs.
Never store/broadcast/return an entire arbitrary GM payload to that audience.
This is an output allowlist, not an HTML/content moderation mechanism: text
intentionally entered as a public title/caption/description will be displayed.
"""
from typing import Any, Dict

DISPLAY_MODES = frozenset({
    'blank', 'title', 'image', 'npc-grid', 'combat', 'battle-start',
    'group-check', 'table-result', 'end-session-stats',
})

COMMON = frozenset({'display_target', 'title', 'subtitle', 'eyebrow', 'caption', 'banner'})
MODE_FIELDS = {
    'blank': set(),
    'title': {'party'},
    'image': {'image_url', 'party'},
    'npc-grid': {'npcs', 'party'},
    'combat': {
        'party', 'tokens', 'map_url', 'round', 'round_number',
        'active_id', 'activeCombatantId', 'turn_id', 'current_turn_id',
        'battle_started_at',
    },
    'battle-start': {'party'},
    'group-check': {'party', 'results', 'dc', 'check_name', 'notation', 'ability'},
    'table-result': {'die', 'roll', 'result', 'party'},
    'end-session-stats': {'campaignName', 'generated_at', 'session', 'allTime'},
}

# Compatibility aliases here are limited to known player-display readers.
PARTY = frozenset({
    'id', 'character_id', 'characterId', 'player_id', 'playerId',
    'name', 'character_name', 'characterName', 'display_name', 'displayName',
    'playerName', 'player_name', 'className', 'class_name', 'character_class',
    'class', 'race', 'level', 'imageUrl', 'image_url', 'avatar_url',
    'portrait_url', 'character_image', 'hp', 'currentHp', 'maxHp',
    'hpPercent', 'hpStatus', 'initiative', 'initiativeLabel',
    'speed', 'passivePerception', 'ac',
})
NPC = frozenset({'id', 'name', 'subtitle', 'description', 'image_url'})
TOKEN = frozenset({
    'id', 'type', 'name', 'subtitle', 'image_url', 'x', 'y',
    'initiative', 'initiativeLabel', 'position', 'token_x', 'token_y',
    'kind', 'role', 'creature_type',
})
BANNER = frozenset({'id', 'eyebrow', 'title', 'text', 'subtitle', 'tone'})
RESULT = frozenset({
    'id', 'character_id', 'characterId', 'player_id', 'playerId',
    'name', 'character_name', 'characterName', 'display_name', 'displayName',
    'playerName', 'player_name', 'actor', 'actor_name',
    'total', 'roll_total', 'value', 'natural', 'natural_roll',
    'created_at', 'updated_at', 'rolled_at', 'timestamp', 'visibleRolls', 'rolls',
})
DIE = frozenset({'sides', 'result', 'dropped'})
AWARD = frozenset({'title', 'name', 'value'})
ACTOR = frozenset({'name', 'rolls', 'nat20s', 'nat1s'})
SESSION = frozenset({
    'nat20s', 'nat1s', 'awards', 'actors', 'playerRolls',
    'totalRolls', 'totalDice', 'gmRolls',
})
ALL_TIME = frozenset({'totalRolls', 'totalDice', 'nat20s', 'nat1s'})


def _scalar_fields(value: Any, allowed: frozenset) -> Dict[str, Any]:
    """Copy explicitly approved primitive fields; never pass nested GM objects."""
    if not isinstance(value, dict):
        return {}
    return {
        key: entry for key, entry in value.items()
        if key in allowed and (entry is None or isinstance(entry, (str, int, float, bool)))
    }


def _safe_list(value: Any, fields: frozenset) -> list:
    if not isinstance(value, list):
        return []
    return [_scalar_fields(item, fields) for item in value if isinstance(item, dict)][:200]


def _visible_token(token: dict) -> bool:
    for field in ('hidden', 'is_hidden', 'gm_only', 'secret'):
        if token.get(field) is True or token.get(field) == 'true':
            return False
    for field in ('visible', 'is_visible', 'player_visible', 'show_to_players'):
        if token.get(field) is False or token.get(field) == 'false':
            return False
    return str(token.get('visibility', '')).strip().lower() not in {
        'hidden', 'secret', 'private', 'gm', 'gm-only', 'gm_only',
    }


def sanitize_player_display_payload(mode: str, payload: Any) -> Dict[str, Any]:
    """Sanitize both new writes and older saved display reads."""
    if not isinstance(payload, dict):
        return {}
    out = _scalar_fields(payload, COMMON | MODE_FIELDS.get(mode, set()))
    if out.get('display_target') not in (None, 'standing-tv', 'virtual-table'):
        out.pop('display_target', None)
    if isinstance(payload.get('banner'), dict):
        out['banner'] = _scalar_fields(payload['banner'], BANNER)
    if 'party' in MODE_FIELDS.get(mode, set()) and isinstance(payload.get('party'), list):
        out['party'] = _safe_list(payload['party'], PARTY)
    if mode == 'npc-grid' and isinstance(payload.get('npcs'), list):
        out['npcs'] = _safe_list(payload['npcs'], NPC)
    if mode == 'combat' and isinstance(payload.get('tokens'), list):
        out['tokens'] = [
            _token_payload(item) for item in payload['tokens']
            if isinstance(item, dict) and _visible_token(item)
        ][:200]
    if mode == 'group-check' and isinstance(payload.get('results'), list):
        results = []
        for item in payload['results'][:200]:
            if not isinstance(item, dict):
                continue
            result = _scalar_fields(item, RESULT)
            for field in ('visibleRolls', 'rolls'):
                if isinstance(item.get(field), list):
                    result[field] = _safe_list(item[field], DIE)
            results.append(result)
        out['results'] = results
    if mode == 'end-session-stats':
        session = payload.get('session')
        if isinstance(session, dict):
            out['session'] = _scalar_fields(session, SESSION)
            if isinstance(session.get('awards'), list):
                out['session']['awards'] = _safe_list(session['awards'], AWARD)
            if isinstance(session.get('actors'), list):
                out['session']['actors'] = _safe_list(session['actors'], ACTOR)
        if isinstance(payload.get('allTime'), dict):
            out['allTime'] = _scalar_fields(payload['allTime'], ALL_TIME)
    return out


def _token_payload(value: dict) -> dict:
    item = _scalar_fields(value, TOKEN)
    if isinstance(value.get('position'), dict):
        item['position'] = _scalar_fields(value['position'], frozenset({'x', 'y'}))
    return item

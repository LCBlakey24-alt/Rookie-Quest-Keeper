"""Rest eligibility for conscious, unconscious, stable-at-zero and dead
characters, in both editions (review finding 5). A Long Rest never revives a
character at 0 HP or a dead one."""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routes import character_recovery  # noqa: E402
from routes.character_recovery import can_start_rest  # noqa: E402


def hero(edition, hp, failures=0, successes=0):
    return {'id': 'c1', 'user_id': 'pat', 'character_class': 'Fighter', 'level': 3, 'rules_edition': edition,
            'max_hit_points': 30, 'current_hit_points': hp, 'death_saves_failures': failures,
            'death_saves_successes': successes, 'hit_dice': '3d10', 'hit_dice_remaining': 0}


@pytest.mark.parametrize('edition', ['2014', '2024'])
@pytest.mark.parametrize('state, character, short_ok, long_ok', [
    ('conscious', lambda e: hero(e, 12), True, True),
    ('dead', lambda e: hero(e, 0, failures=3), False, False),
])
def test_conscious_and_dead(edition, state, character, short_ok, long_ok):
    assert can_start_rest(character(edition), 'short') is short_ok
    assert can_start_rest(character(edition), 'long') is long_ok


@pytest.mark.parametrize('state, character', [
    ('unconscious', hero('2014', 0, failures=1)),
    ('stable at zero', hero('2014', 0, successes=3)),
])
def test_2014_at_zero_hp_can_short_rest_but_gains_no_long_rest(state, character):
    assert can_start_rest(character, 'short') is True
    assert can_start_rest(character, 'long') is False


def test_2024_at_zero_hp_can_take_neither():
    assert can_start_rest(hero('2024', 0, successes=3), 'short') is False
    assert can_start_rest(hero('2024', 0, successes=3), 'long') is False


def _long_rest(character):
    save = AsyncMock(return_value={})
    with patch.object(character_recovery, '_owned_character', AsyncMock(return_value=character)), \
         patch.object(character_recovery, '_save', save):
        asyncio.run(character_recovery.long_rest_character('c1', username='pat'))
    return save


def test_the_long_rest_route_no_longer_revives_a_dead_2014_fighter():
    with pytest.raises(HTTPException) as refused:
        _long_rest(hero('2014', 0, failures=3))
    assert refused.value.status_code == 400
    assert 'dead' in refused.value.detail


def test_the_long_rest_route_still_rests_a_conscious_fighter():
    save = _long_rest(hero('2014', 5))
    updates = save.call_args[0][2]
    assert updates['current_hit_points'] == 30

"""Hit Dice pools match the frontend for the same saves (review finding 10)."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.hit_dice_pools import hit_dice_pools, long_rest_hit_dice, spend_hit_die  # noqa: E402

FIXTURE = json.loads((Path(__file__).resolve().parents[2] / "frontend/src/data/__fixtures__/hitDicePoolCases.json").read_text())


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=[c["name"] for c in FIXTURE["cases"]])
def test_pools_and_spending(case):
    pools = [[p["sides"], p["total"], p["remaining"]] for p in hit_dice_pools(case["character"])]
    assert pools == case["pools"]
    assert spend_hit_die(case["character"], case["spend"])["updates"]["hit_dice_remaining_by_die"] == case["after_spend"]


@pytest.mark.parametrize("case", FIXTURE["long_rest"], ids=[c["name"] for c in FIXTURE["long_rest"]])
def test_long_rest(case):
    assert long_rest_hit_dice(case["character"], case["edition"])["hit_dice_remaining_by_die"] == case["after"]


def test_the_larger_die_cannot_be_spent_twice():
    character = {"class_levels": {"Fighter": 1, "Wizard": 1}, "hit_dice_remaining": 2}
    first = spend_hit_die(character)
    assert first["sides"] == 10
    assert spend_hit_die({**character, **first["updates"]}, 10) is None


def test_short_rest_rolls_each_die_at_its_own_size(monkeypatch):
    import os
    for key, value in {"MONGO_URL": "mongodb://localhost:27017", "DB_NAME": "rqk_test", "JWT_SECRET_KEY": "hd-test",
                       "APP_URL": "http://localhost:3000", "CORS_ORIGINS": "http://localhost:3000"}.items():
        os.environ.setdefault(key, value)
    from routes import character_recovery

    rolled = []
    monkeypatch.setattr(character_recovery.random, "randint", lambda low, high: rolled.append(high) or high)
    character = {"class_levels": {"Fighter": 1, "Wizard": 1}, "hit_dice": "1d10 + 1d6", "hit_dice_remaining": 2,
                 "max_hit_points": 30, "current_hit_points": 5, "constitution": 10}
    update = character_recovery._spend_hit_dice(character, 3)
    assert rolled == [10, 6]  # never the d10 twice, and only two dice exist
    assert update["hit_dice_remaining"] == 0
    assert update["hit_dice_remaining_by_die"] == {"10": 0, "6": 0}
    assert update["current_hit_points"] == 5 + 10 + 6


def test_short_rest_can_choose_the_small_die():
    from routes import character_recovery
    character = {"class_levels": {"Fighter": 1, "Wizard": 1}, "hit_dice_remaining": 2,
                 "max_hit_points": 30, "current_hit_points": 5, "constitution": 10}
    update = character_recovery._spend_hit_dice(character, 1, 6)
    assert update["hit_dice_remaining_by_die"] == {"10": 1, "6": 0}

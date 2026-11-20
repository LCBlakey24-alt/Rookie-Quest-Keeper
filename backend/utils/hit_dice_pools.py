"""Hit Dice by die size (review finding 10).

Mirror of frontend/src/data/hitDicePools.js; both are held to
frontend/src/data/__fixtures__/hitDicePoolCases.json.

A multiclass character has one pool per die size. What is left is saved as
``hit_dice_remaining_by_die`` ({"10": 1, "6": 0}) beside the old
``hit_dice_remaining`` total. When the per-size counts do not add up to the
total (a legacy save, or a writer that only changed the total), the total is
spread over the pools smallest die first, which can only under-count large
dice, never create extra ones.
"""
import math
import re
from typing import Any, Dict, List, Optional

HIT_DIE_BY_CLASS = {
    "barbarian": 12, "fighter": 10, "paladin": 10, "ranger": 10,
    "bard": 8, "cleric": 8, "druid": 8, "monk": 8, "rogue": 8, "warlock": 8,
    "sorcerer": 6, "wizard": 6, "artificer": 8,
}


def _whole(value: Any, fallback: int = 0) -> int:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    if math.isnan(number) or math.isinf(number):
        return fallback
    return math.floor(number)


def _class_key(name: Any) -> str:
    return re.sub(r"[^a-z]", "", str(name or "").lower())


def _class_levels(character: Dict[str, Any]) -> Dict[str, int]:
    stored = character.get("class_levels") or character.get("multiclass_levels") or {}
    if isinstance(stored, dict):
        found = {name: _whole(level) for name, level in stored.items() if _whole(level) > 0}
        if found:
            return found
    entries = {}
    for entry in character.get("classes") or []:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("class_name") or entry.get("character_class") or entry.get("class")
        level = _whole(entry.get("level") or entry.get("class_level"))
        if name and level > 0:
            entries[name] = level
    if entries:
        return entries
    primary = character.get("character_class") or character.get("class_name")
    return {primary: max(1, _whole(character.get("level"), 1))} if primary else {}


def _sides_for_class(name: Any, character: Dict[str, Any]) -> int:
    known = HIT_DIE_BY_CLASS.get(_class_key(name))
    if known:
        return known
    match = re.search(r"d(\d+)", str(character.get("hit_dice") or ""), re.IGNORECASE)
    return _whole(match.group(1), 8) if match else 8


def hit_dice_totals(character: Dict[str, Any]) -> Dict[int, int]:
    totals: Dict[int, int] = {}
    for name, level in _class_levels(character).items():
        sides = _sides_for_class(name, character)
        totals[sides] = totals.get(sides, 0) + max(0, level)
    if not totals:
        # No class saved: read the hit_dice text itself ("5d10", "1d10 + 1d6").
        for count, sides in re.findall(r"(\d+)\s*d\s*(\d+)", str(character.get("hit_dice") or ""), re.IGNORECASE):
            totals[_whole(sides, 8)] = totals.get(_whole(sides, 8), 0) + _whole(count)
        if not totals:
            totals[8] = max(1, _whole(character.get("level"), 1))
    return totals


def hit_dice_pools(character: Dict[str, Any]) -> List[Dict[str, int]]:
    """Pools, largest die first: [{"sides", "total", "remaining"}]."""
    totals = hit_dice_totals(character)
    total = sum(totals.values())
    raw_remaining = character.get("hit_dice_remaining")
    remaining_total = max(0, min(total, _whole(total if raw_remaining is None else raw_remaining, total)))
    sizes = list(totals.keys())

    saved = character.get("hit_dice_remaining_by_die")
    clamped = None
    if isinstance(saved, dict):
        clamped = {
            sides: max(0, min(totals[sides], _whole(saved.get(str(sides), saved.get(sides, 0)))))
            for sides in sizes
        }

    if clamped is not None and sum(clamped.values()) == remaining_total:
        remaining = clamped
    else:
        remaining = {}
        left = remaining_total
        for sides in sorted(sizes):
            take = min(totals[sides], left)
            remaining[sides] = take
            left -= take

    return [
        {"sides": sides, "total": totals[sides], "remaining": remaining.get(sides, 0)}
        for sides in sorted(sizes, reverse=True)
    ]


def _to_save(pools: List[Dict[str, int]]) -> Dict[str, Any]:
    return {
        "hit_dice_remaining": sum(pool["remaining"] for pool in pools),
        "hit_dice_remaining_by_die": {str(pool["sides"]): pool["remaining"] for pool in pools},
    }


def spend_hit_die(character: Dict[str, Any], sides: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Spend one die from the chosen pool (or the largest left).

    Returns {"sides", "updates"} or None when nothing can be spent.
    """
    pools = hit_dice_pools(character)
    wanted = _whole(sides) if sides else None
    pool = next((p for p in pools if p["remaining"] > 0 and (wanted is None or p["sides"] == wanted)), None)
    if not pool:
        return None
    after = [{**p, "remaining": p["remaining"] - 1} if p is pool else p for p in pools]
    return {"sides": pool["sides"], "updates": _to_save(after)}


def long_rest_hit_dice(character: Dict[str, Any], edition: str = "2014") -> Dict[str, Any]:
    """2024: every die back. 2014: half the total (at least one), largest first."""
    pools = hit_dice_pools(character)
    if edition == "2024":
        return _to_save([{**pool, "remaining": pool["total"]} for pool in pools])
    regain = max(1, sum(pool["total"] for pool in pools) // 2)
    after = []
    for pool in pools:
        back = min(pool["total"] - pool["remaining"], regain)
        regain -= back
        after.append({**pool, "remaining": pool["remaining"] + back})
    return _to_save(after)

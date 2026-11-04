"""How far a token may move, and whether a requested move is legal.

The server decides this, not the client. A player's device can show a
movement range and refuse to let them drag beyond it, but that is a
convenience: anything the client enforces can be bypassed by not using the
client. If the budget is to mean anything it has to be checked here.

Coordinates and distance
------------------------
Display tokens are positioned as percentages of the map, 0 to 100 on each
axis, because the map is an image of unknown pixel size. Distance in feet
therefore needs two things the combat payload now carries: how many grid
squares the map is across and down, and how much ground one square covers.

Diagonals cost one square, which is the 2014 default and the campaign
baseline. The 5-10-5 variant and difficult terrain are both a cost per
square rather than a different shape of rule, so they would slot into
`squares_between` without changing anything else here.
"""

from typing import Any, Dict, Optional, Tuple

DEFAULT_FEET_PER_SQUARE = 5
DEFAULT_GRID_COLS = 30
DEFAULT_GRID_ROWS = 20

# Percentages are floats and a client may send 33.333333. Rounding to the
# nearest square before measuring keeps a move that lands on a square from
# costing a fraction more than it should.
EPSILON = 1e-9


def _number(value: Any, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    if number != number or number in (float('inf'), float('-inf')):
        return fallback
    return number


def _positive_int(value: Any, fallback: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return number if number > 0 else fallback


def grid_from_payload(payload: Optional[Dict[str, Any]]) -> Tuple[int, int, int]:
    """The map's grid and scale, with 5e defaults when the GM has not set them."""
    data = payload if isinstance(payload, dict) else {}
    return (
        _positive_int(data.get('grid_cols'), DEFAULT_GRID_COLS),
        _positive_int(data.get('grid_rows'), DEFAULT_GRID_ROWS),
        _positive_int(data.get('feet_per_square'), DEFAULT_FEET_PER_SQUARE),
    )


def clamp_percent(value: Any) -> float:
    """Keep a coordinate on the map. 0 and 100 are real edge positions."""
    return max(0.0, min(100.0, _number(value, 50.0)))


def to_square(x_percent: Any, y_percent: Any, grid_cols: int, grid_rows: int) -> Tuple[int, int]:
    """Which grid square a percentage position sits in."""
    column = int(clamp_percent(x_percent) / 100 * grid_cols + EPSILON)
    row = int(clamp_percent(y_percent) / 100 * grid_rows + EPSILON)
    # A coordinate of exactly 100 would otherwise fall one square off the map.
    return min(column, grid_cols - 1), min(row, grid_rows - 1)


def squares_between(start: Tuple[int, int], end: Tuple[int, int]) -> int:
    """Squares travelled, counting a diagonal as one.

    This is Chebyshev distance, which is the 2014 default: moving one square
    diagonally costs the same as moving one square straight.
    """
    return max(abs(end[0] - start[0]), abs(end[1] - start[1]))


def feet_between(
    from_x: Any, from_y: Any, to_x: Any, to_y: Any,
    grid_cols: int = DEFAULT_GRID_COLS,
    grid_rows: int = DEFAULT_GRID_ROWS,
    feet_per_square: int = DEFAULT_FEET_PER_SQUARE,
) -> int:
    """How much ground a move covers, in feet."""
    start = to_square(from_x, from_y, grid_cols, grid_rows)
    end = to_square(to_x, to_y, grid_cols, grid_rows)
    return squares_between(start, end) * feet_per_square


def remaining_feet(speed: Any, spent: Any) -> int:
    """What is left of a character's movement this turn."""
    total = max(0, int(_number(speed, 30)))
    used = max(0, int(_number(spent, 0)))
    return max(0, total - used)


class MoveRefused(Exception):
    """A requested move the server will not make, with a reason to show."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def validate_move(
    *,
    token: Dict[str, Any],
    to_x: Any,
    to_y: Any,
    speed: Any,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Check a move and report its cost, or refuse it with a reason.

    Returns the cost and the movement left afterwards so the caller can
    store the new total without recomputing it.
    """
    if not isinstance(token, dict):
        raise MoveRefused('That token is not on the map.')

    grid_cols, grid_rows, feet_per_square = grid_from_payload(payload)

    from_x = token.get('x', token.get('position', {}).get('x') if isinstance(token.get('position'), dict) else None)
    from_y = token.get('y', token.get('position', {}).get('y') if isinstance(token.get('position'), dict) else None)
    if from_x is None or from_y is None:
        raise MoveRefused('That token has no position on the map yet.')

    cost = feet_between(from_x, from_y, to_x, to_y, grid_cols, grid_rows, feet_per_square)
    left = remaining_feet(speed, token.get('movement_spent'))

    if cost == 0:
        # Not an error: a player nudging a token within its own square has
        # not moved, and should not be told off for it.
        return {'cost_feet': 0, 'remaining_feet': left, 'moved': False}

    if cost > left:
        raise MoveRefused(
            f'That is {cost} ft and only {left} ft of movement is left this turn.'
        )

    return {'cost_feet': cost, 'remaining_feet': left - cost, 'moved': True}

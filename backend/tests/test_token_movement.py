"""The server decides how far a token may move.

A player's device can draw a movement range and refuse to drag past it,
but that is a convenience. Anything only the client enforces can be
bypassed by not using the client, so the budget is checked here.
"""

import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from utils.token_movement import (  # noqa: E402
    MoveRefused,
    feet_between,
    grid_from_payload,
    remaining_feet,
    squares_between,
    to_square,
    validate_move,
)

# A 30x20 map with 5 ft squares: one square is 3.333% across, 5% down.
GRID = {'grid_cols': 30, 'grid_rows': 20, 'feet_per_square': 5}


class TestReadingTheMap:
    def test_uses_the_gm_scale_when_given(self):
        assert grid_from_payload({'grid_cols': 40, 'grid_rows': 25, 'feet_per_square': 10}) == (40, 25, 10)

    def test_falls_back_to_the_5e_defaults(self):
        """A map with no scale set is still playable."""
        assert grid_from_payload({}) == (30, 20, 5)
        assert grid_from_payload(None) == (30, 20, 5)

    def test_ignores_nonsense_rather_than_crashing(self):
        assert grid_from_payload({'grid_cols': 0, 'grid_rows': -4, 'feet_per_square': 'five'}) == (30, 20, 5)


class TestPercentagesToSquares:
    def test_the_origin_is_the_first_square(self):
        assert to_square(0, 0, 30, 20) == (0, 0)

    def test_the_far_edge_stays_on_the_map(self):
        """100% must not fall one square off the board."""
        assert to_square(100, 100, 30, 20) == (29, 19)

    def test_a_coordinate_lands_in_the_square_it_is_in(self):
        # 10% of 30 columns is column 3; 25% of 20 rows is row 5.
        assert to_square(10, 25, 30, 20) == (3, 5)

    def test_off_map_values_are_brought_back(self):
        assert to_square(-50, 400, 30, 20) == (0, 19)


class TestDistance:
    def test_a_diagonal_costs_one_square(self):
        """The 2014 default, and this campaign's baseline."""
        assert squares_between((0, 0), (1, 1)) == 1
        assert squares_between((0, 0), (3, 3)) == 3

    def test_an_L_shaped_move_costs_the_longer_leg(self):
        assert squares_between((0, 0), (4, 2)) == 4

    def test_feet_follow_the_square_size(self):
        # Six squares across a 30-column map is 20%.
        assert feet_between(0, 0, 20, 0, **GRID) == 30
        assert feet_between(0, 0, 20, 0, grid_cols=30, grid_rows=20, feet_per_square=10) == 60

    def test_standing_still_costs_nothing(self):
        assert feet_between(50, 50, 50, 50, **GRID) == 0


class TestRemaining:
    def test_counts_down_from_speed(self):
        assert remaining_feet(30, 0) == 30
        assert remaining_feet(30, 10) == 20
        assert remaining_feet(30, 30) == 0

    def test_never_goes_negative(self):
        assert remaining_feet(30, 45) == 0

    def test_survives_missing_or_broken_values(self):
        assert remaining_feet(None, None) == 30
        assert remaining_feet('fast', 'lots') == 30


class TestValidatingAMove:
    def _token(self, **overrides):
        return {'id': 't1', 'x': 0, 'y': 0, 'character_id': 'c1', **overrides}

    def test_a_move_inside_the_budget_is_allowed(self):
        # 20% across a 30-column map is 6 squares, 30 ft.
        result = validate_move(token=self._token(), to_x=20, to_y=0, speed=30, payload=GRID)
        assert result == {'cost_feet': 30, 'remaining_feet': 0, 'moved': True}

    def test_a_move_beyond_the_budget_is_refused_with_the_numbers(self):
        with pytest.raises(MoveRefused) as caught:
            validate_move(token=self._token(), to_x=40, to_y=0, speed=30, payload=GRID)
        # The player should be told what went wrong, not just "no".
        assert '60 ft' in caught.value.reason
        assert '30 ft' in caught.value.reason

    def test_movement_already_spent_this_turn_counts(self):
        token = self._token(movement_spent=20)
        result = validate_move(token=token, to_x=3.4, to_y=0, speed=30, payload=GRID)
        assert result['cost_feet'] == 5
        assert result['remaining_feet'] == 5

        with pytest.raises(MoveRefused):
            validate_move(token=self._token(movement_spent=25), to_x=20, to_y=0, speed=30, payload=GRID)

    def test_a_nudge_within_the_same_square_is_not_an_error(self):
        """A player adjusting a token where it stands has not moved."""
        result = validate_move(token=self._token(x=1, y=1), to_x=1.5, to_y=1.2, speed=30, payload=GRID)
        assert result['moved'] is False
        assert result['cost_feet'] == 0

    def test_a_token_with_no_position_is_refused(self):
        with pytest.raises(MoveRefused) as caught:
            validate_move(token={'id': 't1', 'character_id': 'c1'}, to_x=10, to_y=10, speed=30, payload=GRID)
        assert 'no position' in caught.value.reason

    def test_a_position_given_as_a_nested_object_still_works(self):
        token = {'id': 't1', 'character_id': 'c1', 'position': {'x': 0, 'y': 0}}
        assert validate_move(token=token, to_x=3.4, to_y=0, speed=30, payload=GRID)['cost_feet'] == 5

    def test_a_missing_scale_uses_the_defaults_rather_than_refusing(self):
        """A GM who has not set a scale can still run the table."""
        result = validate_move(token=self._token(), to_x=10, to_y=0, speed=30, payload=None)
        assert result['cost_feet'] == 15

    def test_a_slower_character_is_held_to_their_own_speed(self):
        # A 25 ft dwarf cannot make the 30 ft move a human can.
        with pytest.raises(MoveRefused):
            validate_move(token=self._token(), to_x=20, to_y=0, speed=25, payload=GRID)

    def test_diagonal_movement_is_not_cheaper_than_the_client_thinks(self):
        """The client draws a Chebyshev range; the server must agree.

        If the server used straight-line distance a diagonal move would
        cost about 1.4 times as much and legal-looking moves would be
        refused.
        """
        # Six squares diagonally is six squares, 30 ft, not 42.
        result = validate_move(token=self._token(), to_x=20, to_y=30, speed=30, payload=GRID)
        assert result['cost_feet'] == 30

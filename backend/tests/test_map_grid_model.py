import os
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import LocalMap, LocalMapCreate, LocalMapUpdate, MapGrid, WorldMap, WorldMapCreate, WorldMapUpdate  # noqa: E402


def test_maps_without_a_grid_stay_gridless():
    assert WorldMap(campaign_id='c', name='Realm').grid is None
    assert LocalMap(campaign_id='c', location_id='l', name='Balderin').grid is None


def test_grid_round_trips_on_create_and_update():
    grid = {'type': 'hex_flat', 'size': 3.5, 'offset_x': 20, 'offset_y': 40, 'colour': 'dark', 'opacity': 0.6}
    created = WorldMapCreate(name='Realm', grid=grid)
    assert created.grid.model_dump() == grid
    update = {k: v for k, v in WorldMapUpdate(grid=grid).model_dump().items() if v is not None}
    assert update == {'grid': grid}
    assert LocalMapCreate(location_id='l', name='Balderin', grid={'type': 'square'}).grid.size == 5.0
    assert LocalMapUpdate(grid={'type': 'none'}).grid.type == 'none'


@pytest.mark.parametrize('bad', [
    {'type': 'triangle'},
    {'type': 'square', 'size': 0},
    {'type': 'square', 'size': 80},
    {'type': 'square', 'offset_x': 120},
    {'type': 'square', 'colour': 'pink'},
    {'type': 'square', 'opacity': 0},
])
def test_grid_rejects_out_of_range_settings(bad):
    with pytest.raises(ValidationError):
        MapGrid(**bad)

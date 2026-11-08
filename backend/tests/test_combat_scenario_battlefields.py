"""Regression contract: encounter map choices survive create/read/edit models."""
import pytest
from pydantic import ValidationError
from models import CombatScenario, CombatScenarioCreate, CombatScenarioUpdate


def test_create_and_read_saved_encounter_preserves_battlefield():
    payload = {
        'name': 'Manor Battle',
        'combatants': [{'id': 'scarab-1', 'name': 'Scarab', 'hp': 12}],
        'map_id': 'map-hollowmere',
        'map_url': None,
        'battlefield_mode': 'saved',
        'terrain_type': 'stone',
        'grid_size': 50,
        'grid_cols': 40,
        'grid_rows': 25,
        'feet_per_square': 10,
        'show_grid': False,
        'tokens': [{'id': 'scarab-1', 'x': 2, 'y': 4}],
    }
    created = CombatScenarioCreate.model_validate(payload)
    saved = CombatScenario(campaign_id='campaign-1', **created.model_dump())
    loaded = CombatScenario.model_validate(saved.model_dump())
    assert loaded.map_id == 'map-hollowmere'
    assert loaded.battlefield_mode == 'saved'
    assert loaded.tokens == [{'id': 'scarab-1', 'x': 2, 'y': 4}]
    assert loaded.grid_size == 50
    assert loaded.grid_cols == 40
    assert loaded.grid_rows == 25
    assert loaded.feet_per_square == 10
    assert loaded.show_grid is False
    assert loaded.combatants[0]['id'] == 'scarab-1'


def test_create_can_select_any_of_the_ten_generic_floors():
    for terrain in ('stone', 'cobblestone', 'grass', 'dirt', 'sand',
                    'wood', 'water', 'snow', 'mud', 'lava'):
        created = CombatScenarioCreate(name='Test', battlefield_mode='generic', terrain_type=terrain)
        saved = CombatScenario(campaign_id='campaign-1', **created.model_dump())
        assert saved.terrain_type == terrain
        assert saved.map_id == ''
        assert saved.battlefield_mode == 'generic'


def test_legacy_records_default_to_stone_and_accept_old_map_id_alias():
    legacy = CombatScenario.model_validate({
        'campaign_id': 'campaign-1', 'name': 'Old Encounter', 'mapId': 'old-map-7',
    })
    assert legacy.map_id == 'old-map-7'
    assert legacy.terrain_type == 'stone'
    assert legacy.battlefield_mode is None
    assert legacy.show_grid is True


def test_partial_update_does_not_reset_combatants_and_allows_clearing_image():
    update = CombatScenarioUpdate.model_validate({
        'map_id': '',
        'map_url': None,
        'battlefield_mode': 'generic',
        'terrain_type': 'grass',
    })
    changes = update.model_dump(exclude_unset=True)
    assert set(changes) == {'map_id', 'map_url', 'battlefield_mode', 'terrain_type'}
    assert changes['map_url'] is None
    assert 'combatants' not in changes


def test_invalid_terrain_or_mode_is_rejected():
    with pytest.raises(ValidationError):
        CombatScenarioCreate(name='Invalid', terrain_type='external-url')
    with pytest.raises(ValidationError):
        CombatScenarioCreate(name='Invalid', battlefield_mode='script')

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BattlefieldPicker, { battlefieldModeFor } from './BattlefieldPicker';

describe('shared encounter battlefield selection', () => {
  test('old encounters with a mapId or image map still select the saved-map mode', () => {
    expect(battlefieldModeFor({ mapId: 'old-1' })).toBe('saved');
    expect(battlefieldModeFor({ map_url: 'https://example.test/map.png' })).toBe('saved');
    expect(battlefieldModeFor({})).toBe('none');
    expect(battlefieldModeFor({ battlefield_mode: 'generic', map_id: 'old-map' })).toBe('generic');
  });

  test('displays visual choices for all ten generic terrains', () => {
    const onModeChange = jest.fn();
    const onTerrainChange = jest.fn();
    render(<BattlefieldPicker mode="generic" terrainType="stone"
      onModeChange={onModeChange} onTerrainChange={onTerrainChange} />);
    expect(screen.getByTestId('battlefield-texture-preview')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^terrain-choice-/)).toHaveLength(10);
    fireEvent.click(screen.getByTestId('terrain-choice-cobblestone'));
    expect(onTerrainChange).toHaveBeenCalledWith('cobblestone');
    fireEvent.click(screen.getByRole('button', { name: 'Saved battle map' }));
    expect(onModeChange).toHaveBeenCalledWith('saved');
  });

  test('selects an existing campaign map without altering it', () => {
    const onMapIdChange = jest.fn();
    const maps = [{ id: 'map-1', name: 'The Marsh', background_url: 'https://example.test/marsh.png' }];
    render(<BattlefieldPicker mode="saved" mapId="" maps={maps} onMapIdChange={onMapIdChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Saved battlefield map' }), { target: { value: 'map-1' } });
    expect(onMapIdChange).toHaveBeenCalledWith('map-1');
    expect(maps[0].id).toBe('map-1');
  });

  test('no selection offers stone rather than an empty preview', () => {
    render(<BattlefieldPicker mode="none" terrainType="lava" />);
    expect(screen.getByTestId('battlefield-texture-preview')).toHaveAttribute('aria-label', 'Battlefield preview: stone');
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import DiceRollerStylePicker from './DiceRollerStylePicker';
import { loadTowerThumbnails, resetTowerThumbnails } from './loadTowerThumbnails';
import { captureTowerThumbnails } from './towerThumbnails';
import { TOWER_SKIN_CATALOG } from './towerSkinCatalog';

jest.mock('./loadTowerThumbnails', () => ({
  ...jest.requireActual('./loadTowerThumbnails'),
  loadTowerThumbnails: jest.fn(),
}));

beforeEach(() => { window.localStorage.clear(); jest.clearAllMocks(); });

describe('tower pictures in the picker', () => {
  test('each design shows its picture once drawn, and stays selectable', async () => {
    loadTowerThumbnails.mockResolvedValue({ 'ember-forge': 'data:image/png;base64,AAAA' });
    render(<DiceRollerStylePicker />);
    expect(loadTowerThumbnails).not.toHaveBeenCalled(); // only once the tower is chosen
    fireEvent.click(screen.getByRole('radio', { name: '3D dice tower' }));
    expect(await screen.findByTestId('tower-thumb-ember-forge')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    // A design with no picture keeps its swatch and its name.
    expect(screen.queryByTestId('tower-thumb-peg-drop')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Ember Forge' }));
    expect(screen.getByRole('radio', { name: 'Ember Forge' })).toBeChecked();
  });

  test('without pictures the picker still lists every design', async () => {
    loadTowerThumbnails.mockResolvedValue({});
    render(<DiceRollerStylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: '3D dice tower' }));
    await Promise.resolve();
    TOWER_SKIN_CATALOG.forEach((skin) => expect(screen.getByRole('radio', { name: skin.name })).toBeInTheDocument());
    expect(document.querySelector('.rq-roller-style__thumb')).toBeNull();
  });
});

describe('drawing the pictures', () => {
  test('returns no pictures, without throwing, where WebGL is unavailable', () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(captureTowerThumbnails(TOWER_SKIN_CATALOG.map((skin) => skin.id))).toEqual({});
    expect(captureTowerThumbnails([])).toEqual({});
    quiet.mockRestore();
  });

  test('the loader resolves to no pictures rather than failing', async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { loadTowerThumbnails: realLoad } = jest.requireActual('./loadTowerThumbnails');
    resetTowerThumbnails();
    await expect(realLoad(['midnight-spire'])).resolves.toEqual({});
    resetTowerThumbnails();
    quiet.mockRestore();
  });
});

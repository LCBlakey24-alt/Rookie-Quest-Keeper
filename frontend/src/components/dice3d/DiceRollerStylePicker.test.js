import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DiceRollerStylePicker from './DiceRollerStylePicker';
import { RANDOM_TOWER_SKIN_ID, loadDiceStyle, loadTowerCamera, loadTowerSkinId, resolveTowerSkinId, towerIntroMsFor } from '@/lib/diceStylePreference';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import { TOWER_SKIN_CATALOG } from './towerSkinCatalog';

beforeEach(() => window.localStorage.clear());

test('chooses the dice animation and shows tower designs only for the tower', () => {
  render(<DiceRollerStylePicker />);
  expect(screen.getByRole('radio', { name: '3D dice tray' })).toBeChecked();
  expect(screen.queryByRole('radiogroup', { name: 'Tower design' })).toBeNull();

  fireEvent.click(screen.getByRole('radio', { name: '3D dice tower' }));
  expect(loadDiceStyle()).toBe('tower');
  fireEvent.click(screen.getByRole('radio', { name: 'Ember Forge' }));
  expect(loadTowerSkinId()).toBe('ember-forge');

  fireEvent.click(screen.getByRole('radio', { name: '3D dice tray' }));
  expect(loadDiceStyle()).toBe('tray');
  expect(screen.queryByRole('radiogroup', { name: 'Tower design' })).toBeNull();
});

test('offers Surprise me, a tower camera and a dice colour, and a test roll', () => {
  const onTestRoll = jest.fn();
  render(<DiceRollerStylePicker onTestRoll={onTestRoll} />);
  expect(screen.queryByRole('radiogroup', { name: 'Tower camera' })).toBeNull();

  fireEvent.click(screen.getByRole('radio', { name: '3D dice tower' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Surprise me' }));
  expect(loadTowerSkinId()).toBe(RANDOM_TOWER_SKIN_ID);

  expect(screen.getByRole('radio', { name: 'Showcase' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Quick drop' }));
  expect(loadTowerCamera()).toBe('quick');

  fireEvent.click(screen.getByRole('radio', { name: 'Crimson' }));
  expect(loadDiceDyeId()).toBe('garnet');

  fireEvent.click(screen.getByRole('button', { name: 'Roll a test d20' }));
  expect(onTestRoll).toHaveBeenCalledTimes(1);
});

test('Surprise me resolves to a real design, never the same twice running', () => {
  const ids = TOWER_SKIN_CATALOG.map((skin) => skin.id);
  let previous = '';
  for (let i = 0; i < 40; i += 1) {
    const picked = resolveTowerSkinId(RANDOM_TOWER_SKIN_ID, previous);
    expect(ids).toContain(picked);
    expect(picked).not.toBe(previous);
    previous = picked;
  }
  expect(resolveTowerSkinId('ember-forge')).toBe('ember-forge');
  expect(resolveTowerSkinId('not-a-design')).toBe(ids[0]);
  expect(towerIntroMsFor('quick')).toBeLessThan(towerIntroMsFor('showcase'));
  expect(towerIntroMsFor('nonsense')).toBe(towerIntroMsFor('showcase'));
});

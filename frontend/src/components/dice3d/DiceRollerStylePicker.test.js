import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DiceRollerStylePicker from './DiceRollerStylePicker';
import { loadDiceStyle, loadTowerSkinId } from '@/lib/diceStylePreference';

beforeEach(() => window.localStorage.clear());

test('chooses how dice roll and shows tower designs only for the tower', () => {
  render(<DiceRollerStylePicker />);
  expect(screen.getByRole('radio', { name: '3D tray' })).toBeChecked();
  expect(screen.queryByRole('radiogroup', { name: 'Tower design' })).toBeNull();

  fireEvent.click(screen.getByRole('radio', { name: '3D tower' }));
  expect(loadDiceStyle()).toBe('tower');
  fireEvent.click(screen.getByRole('radio', { name: 'Ember Forge' }));
  expect(loadTowerSkinId()).toBe('ember-forge');

  fireEvent.click(screen.getByRole('radio', { name: 'Basic' }));
  expect(loadDiceStyle()).toBe('basic');
  expect(screen.queryByRole('radiogroup', { name: 'Tower design' })).toBeNull();
});

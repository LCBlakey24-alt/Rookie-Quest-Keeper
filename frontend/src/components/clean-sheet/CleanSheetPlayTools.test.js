import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import CleanSheetPlayTools from './CleanSheetPlayTools';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

const baseProps = {
  activeConditions: [],
  concentratingName: '',
  concentrationInput: '',
  currentHp: 7,
  deathSaveFailures: 0,
  deathSaveSuccesses: 0,
  exhaustionLevel: 0,
  hitDice: '3d8',
  hitDiceRemaining: 2,
  maxHp: 21,
  passiveScores: [['Perception', 12]],
  rollBonus: 0,
  rollHistory: [],
  rollMode: 'normal',
  savingQuickState: false,
  showConditionPicker: false,
  showConcentrationInput: false,
  showDeathSaves: false,
  showRollHistory: false,
};

beforeEach(() => jest.clearAllMocks());

test('spend Hit Die delegates to parent persistence instead of sending its own PATCH', () => {
  const onSpendHitDie = jest.fn();
  render(<CleanSheetPlayTools {...baseProps} onSpendHitDie={onSpendHitDie} />);

  fireEvent.click(screen.getByTestId('spend-hit-die-btn'));

  expect(onSpendHitDie).toHaveBeenCalledTimes(1);
  expect(apiClient.patch).not.toHaveBeenCalled();
  expect(apiClient.get).not.toHaveBeenCalled();
});

test('prevents duplicate spending while shared character save is pending', () => {
  const onSpendHitDie = jest.fn();
  render(<CleanSheetPlayTools {...baseProps} onSpendHitDie={onSpendHitDie} savingQuickState />);

  const button = screen.getByTestId('spend-hit-die-btn');
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onSpendHitDie).not.toHaveBeenCalled();
});

test.each([
  ['out of Hit Dice', { hitDiceRemaining: 0 }],
  ['at maximum HP', { currentHp: 21 }],
  ['without a saving handler', { onSpendHitDie: undefined }],
])('disables spending when %s', (_, overrides) => {
  const onSpendHitDie = jest.fn();
  render(<CleanSheetPlayTools {...baseProps} onSpendHitDie={onSpendHitDie} {...overrides} />);
  expect(screen.getByTestId('spend-hit-die-btn')).toBeDisabled();
  expect(onSpendHitDie).not.toHaveBeenCalled();
});

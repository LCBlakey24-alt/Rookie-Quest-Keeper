import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';
import { toast } from 'sonner';
import CleanSheetPlayTools from './CleanSheetPlayTools';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock('@/lib/sessionRollStats', () => ({ recordRemoteRoll: jest.fn() }));
jest.mock('@/lib/characterRoute', () => ({ currentCharacterId: () => 'char-1' }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() } }));

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

test.each([
  [{ syncFailed: true }, 'error'],
  [{ queued: true }, 'info'],
  [{ id: 'server-roll' }, 'success'],
])('reports the physical roll delivery status for %j', async (result, method) => {
  apiClient.get.mockResolvedValue({ data: { id: 'char-1', name: 'Aria', campaign_id: 'campaign-1' } });
  recordRemoteRoll.mockResolvedValue(result);
  render(<CleanSheetPlayTools {...baseProps} />);
  fireEvent.change(screen.getByLabelText('d20'), { target: { value: '14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log' }));
  await waitFor(() => expect(toast[method]).toHaveBeenCalled());
  for (const other of ['success', 'info', 'error'].filter(name => name !== method)) {
    expect(toast[other]).not.toHaveBeenCalled();
  }
});

test('keeps a failed physical roll for retry and reuses its event ID', async () => {
  apiClient.get.mockResolvedValue({ data: { id: 'char-1', name: 'Aria', campaign_id: 'campaign-1' } });
  recordRemoteRoll.mockResolvedValueOnce({ id: 'roll-original', syncFailed: true })
    .mockResolvedValueOnce({ id: 'roll-original' });
  render(<CleanSheetPlayTools {...baseProps} />);
  fireEvent.change(screen.getByLabelText('d20'), { target: { value: '14' } });
  fireEvent.change(screen.getByLabelText('Total'), { target: { value: '18' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByLabelText('d20')).toHaveValue(14);
  expect(screen.getByLabelText('Total')).toHaveValue(18);

  await waitFor(() => expect(screen.getByRole('button', { name: 'Log' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Log' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(recordRemoteRoll.mock.calls[1][1].client_event_id).toBe('roll-original');
  expect(screen.getByLabelText('d20')).toHaveValue(null);
});

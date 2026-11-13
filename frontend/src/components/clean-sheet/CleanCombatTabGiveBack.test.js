import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import CleanCombatTab from './CleanCombatTab';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const monk = {
  id: 'monk-1', name: 'Punch', character_class: 'Monk', level: 5,
  strength: 10, dexterity: 18, constitution: 14, wisdom: 16,
  current_hit_points: 30, max_hit_points: 30,
  resources: { ki: { current: 2, max: 5, restore: 'short-rest' } },
  inventory: [], equipment: [],
};

const wizard = {
  id: 'wiz-1', name: 'Quill', character_class: 'Wizard', level: 3,
  intelligence: 16, dexterity: 12, constitution: 12,
  current_hit_points: 14, max_hit_points: 14,
  spell_slots: { 1: 4, 2: 2 }, spell_slots_remaining: { 1: 1, 2: 0 },
  inventory: [], equipment: [], spells: [],
};

beforeEach(() => jest.clearAllMocks());

function renderTab(character, onCharacterUpdate = jest.fn().mockResolvedValue(true), section = 'other') {
  render(<CleanCombatTab character={character} proficiencyBonus={3} onRoll={jest.fn()} onCharacterUpdate={onCharacterUpdate} section={section} />);
  return onCharacterUpdate;
}

test('the hexagon sheet shows what is left to spend, and + gives a Ki point back', async () => {
  const save = renderTab(monk);
  const kiRow = screen.getAllByTestId(/^uses-left-resource-/).find((row) => /ki/i.test(row.textContent));
  expect(kiRow).toHaveTextContent('2/5');
  fireEvent.click(kiRow.querySelector('[data-testid^="uses-left-restore-"]'));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const kiKey = Object.keys(save.mock.calls[0][0].resources).find((key) => /ki/i.test(key));
  expect(save.mock.calls[0][0].resources[kiKey]).toMatchObject({ current: 3, max: 5 });
});

test('a spent spell slot can be given back from its level', async () => {
  const save = renderTab(wizard);
  expect(screen.getByTestId('uses-left-slot-spell-2')).toHaveTextContent('0/2');
  expect(screen.getByRole('button', { name: 'Spend one: 2nd-level slots' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Give one back: 2nd-level slots' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ spell_slots_remaining: { 1: 1, 2: 1 } }, expect.anything()));
  expect(screen.getByRole('button', { name: 'Give one back: 1st-level slots' })).not.toBeDisabled();
});

test('spending a use offers Undo, which gives it back', async () => {
  const save = renderTab(monk);
  const kiRow = screen.getAllByTestId(/^uses-left-resource-/).find((row) => /ki/i.test(row.textContent));
  fireEvent.click(kiRow.querySelector('[data-testid^="uses-left-spend-"]'));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  const [, options] = toast.success.mock.calls[0];
  expect(options.action.label).toBe('Undo');
  await act(async () => { await options.action.onClick(); });
  const kiKey = Object.keys(save.mock.calls[0][0].resources).find((key) => /ki/i.test(key));
  expect(save.mock.calls[0][0].resources[kiKey].current).toBe(1);
  expect(save.mock.calls[1][0].resources[kiKey].current).toBe(2);
});

test('the classic sheet, which shows every group, has no extra panel', () => {
  render(<CleanCombatTab character={monk} proficiencyBonus={3} onRoll={jest.fn()} onCharacterUpdate={jest.fn()} />);
  expect(screen.queryByTestId('uses-left')).not.toBeInTheDocument();
});

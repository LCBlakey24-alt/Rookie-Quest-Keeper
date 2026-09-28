import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import CleanCombatTab from './CleanCombatTab';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const baseCharacter = {
  id: 'hero-1',
  name: 'Hero',
  character_class: 'Fighter',
  level: 2,
  strength: 16,
  dexterity: 12,
  constitution: 14,
  current_hit_points: 5,
  max_hit_points: 20,
  resources: {
    second_wind: { current: 1, max: 1 },
    action_surge: { current: 1, max: 1 },
  },
  inventory: [],
  equipment: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('does not announce a potion heal when persistence fails', async () => {
  const onCharacterUpdate = jest.fn().mockResolvedValue(false);
  const character = {
    ...baseCharacter,
    inventory: [{ id: 'potion-1', name: 'Potion of Healing', type: 'potion', quantity: 1 }],
  };

  render(
    <CleanCombatTab
      character={character}
      proficiencyBonus={2}
      onRoll={jest.fn()}
      onCharacterUpdate={onCharacterUpdate}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /Potion of Healing/i }));

  await waitFor(() => expect(onCharacterUpdate).toHaveBeenCalledTimes(1));
  expect(toast.success).not.toHaveBeenCalledWith(expect.stringMatching(/Potion of Healing heals/i));
});

test('announces a potion heal only after persistence confirms', async () => {
  let resolveSave;
  const onCharacterUpdate = jest.fn(() => new Promise(resolve => { resolveSave = resolve; }));
  const character = {
    ...baseCharacter,
    inventory: [{ id: 'potion-1', name: 'Potion of Healing', type: 'potion', quantity: 1 }],
  };

  render(
    <CleanCombatTab
      character={character}
      proficiencyBonus={2}
      onRoll={jest.fn()}
      onCharacterUpdate={onCharacterUpdate}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /Potion of Healing/i }));
  await waitFor(() => expect(onCharacterUpdate).toHaveBeenCalledTimes(1));
  expect(toast.success).not.toHaveBeenCalledWith(expect.stringMatching(/Potion of Healing heals/i));

  resolveSave(true);

  await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Potion of Healing heals \d+ HP/i)));
});

test('rolls back the visible class resource draft when persistence fails', async () => {
  const onCharacterUpdate = jest.fn().mockResolvedValue(false);

  render(
    <CleanCombatTab
      character={baseCharacter}
      proficiencyBonus={2}
      onRoll={jest.fn()}
      onCharacterUpdate={onCharacterUpdate}
    />,
  );

  const actionSurge = screen.getByRole('button', { name: /Action Surge/i });
  expect(actionSurge).toHaveTextContent('Action Surge 1/1');

  fireEvent.click(actionSurge);

  await waitFor(() => expect(onCharacterUpdate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: /Action Surge/i })).toHaveTextContent('Action Surge 1/1'));
  expect(screen.getByRole('button', { name: /Action Surge/i })).not.toBeDisabled();
  expect(toast.success).not.toHaveBeenCalledWith(expect.stringMatching(/Action Surge:/i));
});


test('carries a natural 20 into doubled weapon damage dice', () => {
  const onRoll = jest.fn().mockReturnValue({ d20: 20, total: 25 });
  const onDiceResult = jest.fn();
  const character = {
    ...baseCharacter,
    equipment: [{ id: 'longsword-1', name: 'Longsword', equipped: true }],
  };

  render(
    <CleanCombatTab
      character={character}
      proficiencyBonus={2}
      onRoll={onRoll}
      onCharacterUpdate={jest.fn()}
      onDiceResult={onDiceResult}
    />,
  );

  const longswordCard = screen.getByText('Longsword').closest('.clean-sheet-action-card');
  expect(longswordCard).toBeTruthy();

  fireEvent.click(within(longswordCard).getByRole('button', { name: /To Hit/i }));
  expect(toast.success).toHaveBeenCalledWith('Critical hit — damage dice will be doubled.');

  fireEvent.click(within(longswordCard).getByRole('button', { name: /Damage/i }));

  expect(onDiceResult).toHaveBeenCalledTimes(1);
  const result = onDiceResult.mock.calls[0][0];
  expect(result.critical).toBe(true);
  expect(result.rolls).toHaveLength(2);
  expect(result.label).toMatch(/Critical .*Damage/i);
});

test('natural 1 does not arm pending damage', () => {
  const onRoll = jest.fn().mockReturnValue({ d20: 1, total: 6 });
  const character = {
    ...baseCharacter,
    equipment: [{ id: 'longsword-1', name: 'Longsword', equipped: true }],
  };

  render(
    <CleanCombatTab
      character={character}
      proficiencyBonus={2}
      onRoll={onRoll}
      onCharacterUpdate={jest.fn()}
    />,
  );

  const longswordCard = screen.getByText('Longsword').closest('.clean-sheet-action-card');
  fireEvent.click(within(longswordCard).getByRole('button', { name: /To Hit/i }));

  expect(toast.error).toHaveBeenCalledWith('Natural 1 — the attack misses.');
  expect(screen.queryByText('Attack rolled. If it hits, use the damage box on this card.')).not.toBeInTheDocument();
  expect(screen.queryByText('Critical hit. Damage dice will be doubled.')).not.toBeInTheDocument();
});

test('Champion expanded critical range carries a 19 into doubled damage', () => {
  const onRoll = jest.fn().mockReturnValue({ d20: 19, total: 24 });
  const onDiceResult = jest.fn();
  const character = {
    ...baseCharacter,
    level: 3,
    subclass: 'Champion',
    equipment: [{ id: 'longsword-1', name: 'Longsword', equipped: true }],
  };

  render(
    <CleanCombatTab
      character={character}
      proficiencyBonus={2}
      onRoll={onRoll}
      onCharacterUpdate={jest.fn()}
      onDiceResult={onDiceResult}
    />,
  );

  const longswordCard = screen.getByText('Longsword').closest('.clean-sheet-action-card');
  fireEvent.click(within(longswordCard).getByRole('button', { name: /To Hit/i }));
  fireEvent.click(within(longswordCard).getByRole('button', { name: /Damage/i }));

  const result = onDiceResult.mock.calls[0][0];
  expect(result.critical).toBe(true);
  expect(result.rolls).toHaveLength(2);
});

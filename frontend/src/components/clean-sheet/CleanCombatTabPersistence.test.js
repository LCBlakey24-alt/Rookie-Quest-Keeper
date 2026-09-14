import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

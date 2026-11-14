import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NpcCompactStatBlock from './NpcCompactStatBlock';

jest.mock('@/components/DiceRollFlicker', () => ({
  __esModule: true,
  default: ({ rollId, rolls, modifier, total, label, theme, onClose }) => (
    <div data-testid="npc-dice-overlay">
      <output data-testid="npc-dice-values">{JSON.stringify({ rollId, rolls, modifier, total, label, theme })}</output>
      <button type="button" onClick={onClose}>Close dice</button>
    </div>
  ),
}));

const npc = {
  name: 'Wolf', combat_ready: true,
  attacks: [{ name: 'Bite', bonus: '+4', damage: '2d4+2 piercing' }],
};

function overlayValues() {
  return JSON.parse(screen.getByTestId('npc-dice-values').textContent);
}

test('NPC attack and damage animate the same dice and total shown in the stat block', () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    render(<NpcCompactStatBlock npc={npc} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll Bite to hit' }));
    const attack = overlayValues();
    expect(attack).toMatchObject({ label: 'Bite attack', theme: 'gm', modifier: 4, total: 5 });
    expect(attack.rolls).toEqual([expect.objectContaining({ sides: 20, result: 1 })]);
    expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Bite attack: 1d20+4 [1] + 4 = 5');

    fireEvent.click(screen.getByRole('button', { name: 'Roll Bite damage' }));
    const damage = overlayValues();
    expect(damage).toMatchObject({ label: 'Bite damage', theme: 'gm', modifier: 2, total: 4 });
    expect(damage.rolls).toEqual([
      expect.objectContaining({ sides: 4, result: 1 }),
      expect.objectContaining({ sides: 4, result: 1 }),
    ]);
    expect(damage.rollId).not.toBe(attack.rollId);
    expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Bite damage: 2d4+2 [1, 1] + 2 = 4');

    fireEvent.click(screen.getByRole('button', { name: 'Roll Bite damage' }));
    expect(overlayValues().rollId).not.toBe(damage.rollId);
    fireEvent.click(screen.getByRole('button', { name: 'Close dice' }));
    expect(screen.queryByTestId('npc-dice-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Bite damage');
  } finally {
    random.mockRestore();
  }
});

test('unverified combat statistics cannot launch a dice overlay', () => {
  render(<NpcCompactStatBlock npc={{ ...npc, combat_ready: false }} />);
  expect(screen.queryByRole('button', { name: /Roll Bite/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId('npc-dice-overlay')).not.toBeInTheDocument();
});

test('a mixed damage roll retains each die and its negative modifier', () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    render(<NpcCompactStatBlock npc={{
      name: 'Scout', attacks: [{ name: 'Venom blade', bonus: '-1', damage: '1d6-2 slashing + 1d4 poison' }],
    }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll Venom blade damage' }));
    const result = overlayValues();
    expect(result.modifier).toBe(-2);
    expect(result.total).toBe(0);
    expect(result.rolls).toEqual([
      expect.objectContaining({ sides: 6, result: 1 }),
      expect.objectContaining({ sides: 4, result: 1 }),
    ]);
    expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Venom blade damage: 1d6-2+1d4 [1, 1] - 2 = 0');
  } finally {
    random.mockRestore();
  }
});

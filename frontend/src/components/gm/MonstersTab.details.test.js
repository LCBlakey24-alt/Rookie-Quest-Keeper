import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CreatureCard } from './MonstersTab';

describe('Bestiary stat-block expansion', () => {
  const creature = {
    id: 'dragon-1',
    name: 'Cavern Dragon',
    cr: 12,
    size: 'Huge',
    type: 'dragon',
    ac: 19,
    hp: 220,
    speed: '40 ft., fly 80 ft.',
    proficiency_bonus: 4,
    description: 'A'.repeat(180) + ' THE HIDDEN END OF THE DESCRIPTION',
    abilities: 'Magic Resistance. The dragon has advantage on saves against spells.',
    stats: { strength: 23, dexterity: 12 },
    skills: ['perception', 'stealth'],
    actions: [
      { name: 'Claw', bonus: '+9', damage: '2d6+6 slashing' },
      { name: 'Tail', bonus: '+9', damage: '2d8+6 bludgeoning', notes: 'Reach 15 ft.' },
    ],
    bonus_actions: [{ name: 'Wing Shift', notes: 'Move 20 ft.' }],
    reactions: [{ name: 'Counterstrike', notes: 'Retaliate against a nearby attacker.' }],
  };

  test('shows all original monster text on demand without clipping or discarding later attacks', () => {
    render(<CreatureCard creature={creature} count={0} onAdjust={jest.fn()} />);
    expect(screen.queryByText(/THE HIDDEN END OF THE DESCRIPTION/)).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show full details' });
    fireEvent.click(toggle);
    const detail = screen.getByTestId('bestiary-full-details');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // One formatted D&D block, not the old prose dump plus a second card.
    expect(within(detail).getByRole('region', { name: 'Cavern Dragon combat reference' })).toBeInTheDocument();
    expect(within(detail).getByText('STR')).toBeInTheDocument();
    expect(within(detail).getByText('23')).toBeInTheDocument();
    expect(within(detail).getByText('Tail')).toBeInTheDocument();
    expect(within(detail).getByText('2d8+6 bludgeoning')).toBeInTheDocument();
    expect(within(detail).getByText('Counterstrike')).toBeInTheDocument();
    expect(within(detail).getByText(/Magic Resistance/)).toBeInTheDocument();
    expect(within(detail).getByText(/THE HIDDEN END OF THE DESCRIPTION/)).toBeInTheDocument();
    expect(within(detail).getAllByText('Tail')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Hide full details' }));
    expect(screen.queryByTestId('bestiary-full-details')).not.toBeInTheDocument();
  });

  test('encounter quantity buttons keep working on expanded cards', () => {
    const onAdjust = jest.fn();
    render(<CreatureCard creature={creature} count={2} onAdjust={onAdjust} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show full details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add one Cavern Dragon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Cavern Dragon' }));
    expect(onAdjust.mock.calls).toEqual([[1], [-1]]);
  });

  test('expanded Bestiary cards offer real dice controls without changing encounter quantity', () => {
    const onAdjust = jest.fn();
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      render(<CreatureCard creature={creature} count={0} onAdjust={onAdjust} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show full details' }));
      fireEvent.click(screen.getByRole('button', { name: 'Roll Claw to hit' }));
      expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Claw attack: 1d20+9 [11] + 9 = 20');
      fireEvent.click(screen.getByRole('button', { name: 'Roll Tail damage' }));
      expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Tail damage: 2d8+6 [5, 5] + 6 = 16');
      expect(onAdjust).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

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
    senses: { darkvision: '120 ft.', passive_perception: 17 },
    resistances: ['cold', 'fire'],
  };

  test('shows all original monster text on demand without clipping or discarding later attacks', () => {
    render(<CreatureCard creature={creature} count={0} onAdjust={jest.fn()} />);
    expect(screen.queryByText(/THE HIDDEN END OF THE DESCRIPTION/)).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show full details' });
    fireEvent.click(toggle);
    const detail = screen.getByTestId('bestiary-full-details');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(detail).getByText(/THE HIDDEN END OF THE DESCRIPTION/)).toBeInTheDocument();
    expect(within(detail).getByText(/Magic Resistance/)).toBeInTheDocument();
    expect(within(detail).getByText(/Tail · \+9 · 2d8\+6 bludgeoning · Reach 15 ft/)).toBeInTheDocument();
    expect(within(detail).getByText(/Counterstrike/)).toBeInTheDocument();
    expect(within(detail).getByText(/darkvision: 120 ft/)).toBeInTheDocument();
    expect(within(detail).getByText(/cold/)).toBeInTheDocument();
    const scores = within(detail).getByRole('region', { name: 'Ability scores' });
    expect(within(scores).getByText('STR')).toBeInTheDocument();
    expect(within(scores).getByText('+6')).toBeInTheDocument();
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
});

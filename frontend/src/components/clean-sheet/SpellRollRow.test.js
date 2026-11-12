import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import SpellRollRow, { SpellRollContext, criticalNotation, spellDiceEntry } from './SpellRollRow';

function renderRow(spell, overrides = {}) {
  const onRollAttack = jest.fn(() => ({ d20: 11 }));
  const onRollDice = jest.fn();
  const value = {
    characterLevel: 5,
    maxSlotLevel: 5,
    casterFor: () => ({ attackBonus: 6, saveDc: 14, mod: 3 }),
    onRollAttack,
    onRollDice,
    ...overrides,
  };
  render(<SpellRollContext.Provider value={value}><SpellRollRow spell={spell} /></SpellRollContext.Provider>);
  return { onRollAttack, onRollDice: value.onRollDice };
}

test('Fire Bolt: a spell attack at the caster bonus, and cantrip damage that has grown at level 5', () => {
  const { onRollAttack, onRollDice } = renderRow({ name: 'Fire Bolt', level: 0 });
  fireEvent.click(screen.getByRole('button', { name: /spell attack for Fire Bolt, \+6/ }));
  expect(onRollAttack).toHaveBeenCalledWith('Fire Bolt attack', 6);
  fireEvent.click(screen.getByRole('button', { name: /Damage for Fire Bolt: 2d10 fire/ }));
  expect(onRollDice).toHaveBeenCalledWith({ label: 'Fire Bolt', notation: '2d10', kind: 'attack' });
});

test('a natural 20 on the attack doubles the next damage roll', () => {
  const { onRollDice } = renderRow({ name: 'Guiding Bolt', level: 1 }, { onRollAttack: jest.fn(() => ({ d20: 20 })) });
  fireEvent.click(screen.getByRole('button', { name: /spell attack for Guiding Bolt/ }));
  fireEvent.click(screen.getByRole('button', { name: /Damage for Guiding Bolt: 8d6/ }));
  expect(onRollDice).toHaveBeenCalledWith({ label: 'Critical Guiding Bolt', notation: '8d6', kind: 'attack' });
});

test('Fireball shows its save DC and grows with the slot chosen', () => {
  const { onRollDice } = renderRow({ name: 'Fireball', level: 3 });
  expect(screen.getByText('DC 14 DEX')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Slot level for Fireball' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: /Damage for Fireball: 10d6 fire/ }));
  expect(onRollDice).toHaveBeenCalledWith({ label: 'Fireball', notation: '10d6', kind: 'save' });
});

test('Cure Wounds heals with the casting modifier', () => {
  const { onRollDice } = renderRow({ name: 'Cure Wounds', level: 1 });
  fireEvent.click(screen.getByRole('button', { name: /Heal for Cure Wounds: 1d8\+3/ }));
  expect(onRollDice).toHaveBeenCalledWith({ label: 'Cure Wounds healing', notation: '1d8+3', kind: 'heal' });
});

test('spells with nothing to roll, and sheets that do not roll, show nothing', () => {
  renderRow({ name: 'Light', level: 0 });
  expect(screen.queryByTestId('spell-rolls-Light')).toBeNull();
  render(<SpellRollRow spell={{ name: 'Fire Bolt', level: 0 }} />);
  expect(screen.queryByTestId('spell-rolls-Fire Bolt')).toBeNull();
});

test('helpers: crits double every die; a dice entry keeps each die size', () => {
  expect(criticalNotation('2d8+4d6+3')).toBe('4d8+8d6+3');
  const entry = spellDiceEntry({ label: 'Ice Storm', notation: '2d8+4d6', kind: 'save' });
  expect(entry.rolls.filter((die) => die.sides === 8)).toHaveLength(2);
  expect(entry.rolls.filter((die) => die.sides === 6)).toHaveLength(4);
  expect(entry.total).toBe(entry.rolls.reduce((sum, die) => sum + die.result, 0));
  expect(spellDiceEntry({ label: 'x', notation: 'nonsense' })).toBeNull();
});

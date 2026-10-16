import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuickBestiaryCombatPicker from './QuickBestiaryCombatPicker';

test('searches the bundled monster database and quick-adds a private combatant', () => {
  const onAdd = jest.fn();
  render(<QuickBestiaryCombatPicker onAdd={onAdd} />);
  fireEvent.change(screen.getByPlaceholderText(/Search goblin/i), { target: { value: 'Goblin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Goblin to combat' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Goblin',
    type: 'enemy',
    source: 'Built-in Bestiary',
    hp: expect.any(Number),
    maxHp: expect.any(Number),
    ac: expect.any(Number),
  }));
  expect(onAdd.mock.calls[0][0].hp).toBeGreaterThan(0);
});

test('does not show every creature before searching', () => {
  render(<QuickBestiaryCombatPicker onAdd={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /Add Goblin to combat/ })).not.toBeInTheDocument();
});

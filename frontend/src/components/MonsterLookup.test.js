import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MonsterLookup from './MonsterLookup';

test('monster lookup opens the same structured stat sheet as the main Bestiary', () => {
  render(<MonsterLookup />);
  fireEvent.change(screen.getByTestId('monster-search-input'), { target: { value: 'Wolf' } });
  fireEvent.click(screen.getByText('Wolf'));
  expect(screen.getByRole('region', { name: 'Wolf combat reference' })).toBeInTheDocument();
  expect(screen.getByLabelText('Ability scores')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Wolf' })).toBeInTheDocument();
  expect(screen.getByText('Bite')).toBeInTheDocument();
  expect(screen.getByText('Pack Tactics')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.queryByRole('region', { name: 'Wolf combat reference' })).not.toBeInTheDocument();
});

test('monster lookup keeps add-to-combat behaviour for selected creatures', () => {
  const onAddToCombat = jest.fn();
  render(<MonsterLookup onAddToCombat={onAddToCombat} />);
  fireEvent.change(screen.getByTestId('monster-search-input'), { target: { value: 'Goblin' } });
  fireEvent.click(screen.getByText('Goblin'));
  fireEvent.click(screen.getByTestId('add-monster-to-combat-btn'));
  expect(onAddToCombat).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Goblin', hp: 7, ac: 15,
    actions: expect.arrayContaining([expect.objectContaining({ name: 'Scimitar' })]),
  }));
});

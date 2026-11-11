import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SimpleActionCard } from './CleanCombatTabCards';

test('combat rules references are labelled and cannot be mistaken for working buttons', () => {
  render(<SimpleActionCard title="Dash" description="Gain extra movement equal to your speed." />);
  expect(screen.getByText('Dash')).toBeInTheDocument();
  expect(screen.getByText('Action · Rules reference')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Dash/i })).not.toBeInTheDocument();
  const card = screen.getByText('Dash').closest('article');
  expect(card).toHaveClass('clean-sheet-action-card--reference');
});

test('real character actions stay usable and call their handlers exactly once', () => {
  const onClick = jest.fn();
  render(<SimpleActionCard title="Concentration Save" description="Roll Constitution save" onClick={onClick} />);
  const button = screen.getByRole('button', { name: /Concentration Save/i });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Rules reference/)).not.toBeInTheDocument();
});

test('unavailable real actions remain disabled without becoming reference cards', () => {
  const onClick = jest.fn();
  render(<SimpleActionCard title="Spend last potion" description="None remaining" disabled onClick={onClick} />);
  const button = screen.getByRole('button', { name: /Spend last potion/i });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

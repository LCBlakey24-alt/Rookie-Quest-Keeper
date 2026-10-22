import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SimpleActionCard } from './CleanCombatTabCards';

describe('SimpleActionCard semantics', () => {
  test('renders an actionable combat card as a real button', () => {
    const onClick = jest.fn();

    render(
      <SimpleActionCard
        title="Second Wind"
        description="Regain hit points."
        type="Bonus"
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', { name: /Second Wind/i });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveClass('clean-sheet-action-card');
  });

  test('renders a reminder-only combat feature without fake button semantics', () => {
    render(
      <SimpleActionCard
        title="Sneak Attack"
        description="Apply when its trigger is met."
        type="Triggered feature"
      />
    );

    expect(screen.queryByRole('button', { name: /Sneak Attack/i })).not.toBeInTheDocument();
    const article = screen.getByText('Sneak Attack').closest('article');
    expect(article).toHaveClass('clean-sheet-action-card', 'clean-sheet-action-card--informational');
  });

  test('an informational card cannot accidentally expose a disabled button', () => {
    render(
      <SimpleActionCard
        title="Arcane Recovery"
        description="Resolve after a Short Rest."
        type="Rest feature"
        disabled
      />
    );

    expect(screen.queryByRole('button', { name: /Arcane Recovery/i })).not.toBeInTheDocument();
    expect(screen.getByText('Arcane Recovery').closest('article')).toBeInTheDocument();
  });
});

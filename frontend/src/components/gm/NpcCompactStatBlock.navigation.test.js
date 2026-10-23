import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NpcCompactStatBlock from './NpcCompactStatBlock';

describe('GM stat block quick navigation', () => {
  const npc = {
    name: 'Mabel Barleybrook',
    combat_ready: true,
    hp: 102, ac: 15,
    stats: { strength: 18, wisdom: 19 },
    attacks: [{ name: 'Thorn Lash', bonus: '+7', damage: '2d6+4 piercing' }],
    bonus_actions: [{ name: 'Root Step', description: 'Move on roots.' }],
    reactions: [{ name: 'Barkskin Ward', description: 'Temporarily raise AC.' }],
    notes: 'Hidden council story information.',
  };

  test('shows only relevant jump buttons and scrolls to the correct section', () => {
    render(<NpcCompactStatBlock npc={npc} />);
    const nav = screen.getByRole('navigation', { name: 'Stat block sections' });
    expect(nav).toHaveTextContent('Abilities');
    expect(nav).toHaveTextContent('Actions');
    expect(nav).toHaveTextContent('Bonus Actions');
    expect(nav).toHaveTextContent('Reactions');
    expect(nav).toHaveTextContent('GM Lore');
    expect(screen.queryByRole('button', { name: 'Jump to Spells' })).not.toBeInTheDocument();

    const target = screen.getByLabelText('Bonus Actions');
    target.scrollIntoView = jest.fn();
    fireEvent.click(screen.getByRole('button', { name: 'Jump to Bonus Actions' }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest', behavior: 'auto',
    });
    expect(screen.getByText('Root Step')).toBeInTheDocument();
    expect(screen.getByText('Barkskin Ward')).toBeInTheDocument();
  });

  test('keeps lore accessible and does not change campaign combat values', () => {
    render(<NpcCompactStatBlock npc={npc} />);
    const notes = screen.getByText('GM notes & story details').closest('details');
    expect(notes).toHaveAttribute('open');
    expect(screen.getByText('Hidden council story information.')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('2d6+4 piercing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Thorn Lash to hit' })).toBeInTheDocument();
  });

  test('incomplete draft records never produce invented actions or empty navigation links', () => {
    render(<NpcCompactStatBlock npc={{ name: 'Unstatted Ally', combat_ready: false }} />);
    expect(screen.getByRole('button', { name: 'Jump to Abilities' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to Actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to GM Lore' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Roll .* to hit/ })).not.toBeInTheDocument();
    expect(screen.getByText(/No combat actions recorded yet/)).toBeInTheDocument();
  });
});

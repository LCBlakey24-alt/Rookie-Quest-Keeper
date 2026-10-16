import React from 'react';
import { render, screen } from '@testing-library/react';
import NpcCompactStatBlock, { npcModifier } from './NpcCompactStatBlock';

describe('NPC GM combat card', () => {
  test('prints quick stats, modifiers and attacks before optional lore', () => {
    render(<NpcCompactStatBlock npc={{
      name: 'Edwin Hollowmere', role: 'Master of Revels', image_url: '/edwin.jpg',
      hp: 18, max_hp: 18, ac: 12, speed: '30 ft.',
      stats: { strength: 10, dexterity: 12, constitution: 10, intelligence: 16, wisdom: 12, charisma: 16 },
      attacks: [{ name: 'Fire Bolt', bonus: '+5', damage: '1d10 fire' }],
      notes: 'Private GM-only detail',
    }} />);
    expect(screen.getByRole('region', { name: 'Edwin Hollowmere combat reference' })).toBeInTheDocument();
    expect(screen.getByText('Fire Bolt')).toBeInTheDocument();
    expect(screen.getByText('1d10 fire')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('AC')).toBeInTheDocument();
    expect(screen.getByText('GM notes & story details')).toBeInTheDocument();
    expect(screen.getByAltText('Edwin Hollowmere')).toHaveAttribute('src', '/edwin.jpg');
  });

  test('unknown scores show placeholders and never invent combat actions', () => {
    render(<NpcCompactStatBlock npc={{ name: 'Unstatted NPC' }} />);
    expect(screen.getByText(/No combat actions recorded yet/)).toBeInTheDocument();
    expect(npcModifier(18)).toBe(4);
    expect(npcModifier('')).toBe(0);
    expect(npcModifier(null)).toBe(0);
  });
});

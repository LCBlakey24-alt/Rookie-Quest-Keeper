import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NpcCompactStatBlock, { actionAttackNotation, actionDamageNotation, npcModifier } from './NpcCompactStatBlock';

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
    expect(npcModifier('')).toBe(null);
    expect(npcModifier(null)).toBe(null);
  });

  test('rolls the verified SRD wolf Bite attack and damage with the existing dice engine', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      render(<NpcCompactStatBlock npc={{
        name: 'Wolf', type: 'beast', size: 'Medium', cr: '1/4', hp: 11, ac: 13,
        stats: { strength: 12, dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6 },
        actions: [{ name: 'Bite', bonus: '+4', damage: '2d4+2 Piercing', notes: 'DC 11 Strength save or prone.' }],
        special_abilities: [{ name: 'Pack Tactics', notes: 'Advantage when fighting beside an ally.' }],
      }} />);
      fireEvent.click(screen.getByRole('button', { name: 'Roll Bite to hit' }));
      expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Bite attack: 1d20+4 [1] + 4 = 5 (natural 1)');
      fireEvent.click(screen.getByRole('button', { name: 'Roll Bite damage' }));
      expect(screen.getByTestId('stat-block-roll-result')).toHaveTextContent('Bite damage: 2d4+2 [1, 1] + 2 = 4');
      expect(screen.getByText('Pack Tactics')).toBeInTheDocument();
    } finally {
      random.mockRestore();
    }
  });

  test('does not invent attack rolls for save DCs or incomplete combat stats', () => {
    expect(actionAttackNotation({ bonus: 'DC 13' })).toBe(null);
    expect(actionDamageNotation({ damage: '1d8 or 2d8 fire' })).toBe(null);
    expect(actionDamageNotation({ damage: '2d4+2 Piercing' })).toBe('2d4+2');
    expect(actionDamageNotation({ damage: '2d6+5 Bludgeoning + 1d12 Acid' })).toBe('2d6+5+1d12');
    const { rerender } = render(<NpcCompactStatBlock npc={{
      name: 'Unverified NPC', combat_ready: false, hp: 12,
      attacks: [{ name: 'Sword', bonus: '+4', damage: '1d8+2 slashing' }],
    }} />);
    expect(screen.queryByRole('button', { name: /Roll Sword/ })).not.toBeInTheDocument();
    rerender(<NpcCompactStatBlock npc={{ name: 'Acolyte', attacks: [{ name: 'Sacred Flame', bonus: 'DC 13', damage: '1d8 radiant' }] }} />);
    expect(screen.queryByRole('button', { name: 'Roll Sacred Flame to hit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Sacred Flame damage' })).toBeInTheDocument();
    rerender(<NpcCompactStatBlock npc={{ name: 'Legacy Wolf', source: 'legacy-reference', hp: 11, ac: 13, actions: [{ name: 'Inferred Bite', bonus: '+4', damage: '2d4+2 piercing' }] }} />);
    expect(screen.getByText(/some statistics and attacks may be estimates/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Roll Inferred Bite/ })).not.toBeInTheDocument();
  });
});

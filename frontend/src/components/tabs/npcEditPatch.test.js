import { changedNpcFields, normaliseNpcPatch } from './npcEditPatch';

describe('NPC stat block safe editing', () => {
  const original = {
    id: 'sw-npc-jordan-crow',
    campaign_id: 'wednesday',
    name: 'Jordan Crow',
    hp: 168,
    max_hp: 168,
    ac: 19,
    stats: { strength: 20, dexterity: 12, constitution: 18, intelligence: 10, wisdom: 14, charisma: 14 },
    actions: [{ name: 'Great Weapon', bonus: '+9', damage: '2d6+5 slashing', recharge: '5-6' }],
    bonus_actions: [{ name: 'Shield-Line Order', description: 'Move 10 feet' }],
    backstory: 'Raised by two halfling parents; founder of the Shield.',
    notes: 'GM-only Friday and Wednesday timelines differ.',
    legendary_actions: [],
  };

  test('lore-only edit never sends HP, actions, spells or backstory by accident', () => {
    expect(changedNpcFields(original, { ...original, notes: 'New private lore' }))
      .toEqual({ notes: 'New private lore' });
  });

  test('sends distinct bonus action and stat changes without rewriting other fields', () => {
    const next = { ...original,
      stats: { ...original.stats, strength: 21 },
      bonus_actions: [{ ...original.bonus_actions[0], description: 'Move 15 feet' }],
    };
    expect(changedNpcFields(original, next)).toEqual({
      stats: next.stats,
      bonus_actions: next.bonus_actions,
    });
  });

  test('does not accidentally change or expose campaign identity, data provenance, or created_at', () => {
    const next = { ...original, id: 'wrong', campaign_id: 'friday', _id: 'internal', created_at: 'now' };
    expect(changedNpcFields(original, next)).toEqual({});
  });

  test('zero is not silently changed to 10', () => {
    expect(normaliseNpcPatch({ hp: '0', ac: '0' })).toEqual({ hp: 0, ac: 0 });
    expect(normaliseNpcPatch({ hp: '18', ac: '15' })).toEqual({ hp: 18, ac: 15 });
  });

  test('clearing challenge rating can remove an unsupported draft CR', () => {
    expect(changedNpcFields({ ...original, cr: '4' }, { ...original, cr: '' }))
      .toEqual({ cr: '' });
  });
});

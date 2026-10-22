import { createNpcDraft, prepareNpcSavePayload } from './npcEditorDraft';

const detailed = {
  id: 'sw-npc-jordan-crow', name: 'Jordan Crow', hp: 168, max_hp: 168, ac: 19,
  cr: null, armor: '', combat_ready: true, dm_only: true,
  backstory: 'Founder of the Shield', notes: 'Keep the Wednesday outcomes separate',
  stats: { strength: 20, dexterity: 12, constitution: 18, intelligence: 10, wisdom: 14, charisma: 14 },
  skills: ['Athletics +9', 'Intimidation +6'],
  attacks: [{ name: 'Great Weapon', bonus: '+9', damage: '2d6+5', notes: 'Reach 5 ft.', recharge: '5-6' }],
  actions: [{ name: 'Multiattack', description: 'Two Great Weapon attacks' }],
  bonus_actions: [{ name: 'Shield-Line Order', description: 'Move an ally 10 feet' }],
  reactions: [{ name: 'Intercept', description: 'Reduce damage' }],
  special_abilities: [{ name: "Corova's Stand", description: 'Protect an ally' }],
  mechanics_status: 'DM DRAFT',
};

describe('lossless GM NPC editing', () => {
  test('does not replace sourced stats and action economy with defaults', () => {
    const draft = createNpcDraft(detailed);
    const payload = prepareNpcSavePayload(draft);
    expect(payload.hp).toBe(168);
    expect(payload.ac).toBe(19);
    expect(payload.stats.strength).toBe(20);
    expect(payload.backstory).toBe('Founder of the Shield');
    expect(payload.actions).toEqual(detailed.actions);
    expect(payload.attacks[0].recharge).toBe('5-6');
    expect(payload.bonus_actions).toEqual(detailed.bonus_actions);
    expect(payload.reactions).toEqual(detailed.reactions);
    expect(payload.special_abilities).toEqual(detailed.special_abilities);
    expect(payload.cr).toBe('');
    expect(payload.mechanics_status).toBe('DM DRAFT');
  });

  test('editing a draft does not mutate the saved database record', () => {
    const draft = createNpcDraft(detailed);
    draft.stats.strength = 21;
    draft.attacks[0].damage = '3d6+5';
    draft.skills.push('Survival +6');
    expect(detailed.stats.strength).toBe(20);
    expect(detailed.attacks[0].damage).toBe('2d6+5');
    expect(detailed.skills).toHaveLength(2);
  });

  test('accepts actual zero HP instead of inventing ten', () => {
    const payload = prepareNpcSavePayload(createNpcDraft({ name: 'Injured', hp: 0, max_hp: 7, ac: 12 }));
    expect(payload.hp).toBe(0);
    expect(payload.max_hp).toBe(7);
    expect(payload.ac).toBe(12);
  });

  test('does not fabricate six ability scores from incomplete lore', () => {
    const draft = createNpcDraft({ name: 'Unconfirmed' });
    expect(draft.stats).toBeNull();
    expect(prepareNpcSavePayload(draft).stats).toBeUndefined();
    draft.stats = { strength: '18' };
    expect(() => prepareNpcSavePayload(draft)).toThrow('Finish all six ability scores');
  });

  test('preserves spellbook fields and trims list entries', () => {
    const draft = createNpcDraft({ ...detailed, spells: { slots_by_level: { '1': 4, '2': 2 }, note: 'source verified' } });
    draft.skills = ['Perception +8', '', 'Nature +5 '];
    const payload = prepareNpcSavePayload(draft);
    expect(payload.skills).toEqual(['Perception +8', 'Nature +5']);
    expect(payload.spells.slots_by_level['2']).toBe(2);
  });
});

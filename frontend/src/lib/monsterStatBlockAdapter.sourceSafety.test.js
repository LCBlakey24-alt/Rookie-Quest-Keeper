import { MONSTER_DATABASE } from '@/data/monsterDatabase';
import { hasRatedMonsterCr, normaliseMonsterStatBlock, monsterToCombatant } from './monsterStatBlockAdapter';

describe('source-grounded Bestiary stat blocks', () => {
  test('treats missing, unknown and unrated CR as unknown, not zero', () => {
    expect(hasRatedMonsterCr('1/4')).toBe(true);
    expect(hasRatedMonsterCr(0)).toBe(true);
    expect(hasRatedMonsterCr('Unrated')).toBe(false);
    expect(hasRatedMonsterCr('')).toBe(false);
    expect(hasRatedMonsterCr(undefined)).toBe(false);
  });

  test('never invents missing health, armour, CR, attacks or abilities for custom beasts', () => {
    const unverified = normaliseMonsterStatBlock({
      id: 'unfinished', name: 'Mystery Beast', source: 'custom',
      hp: 0, ac: 0, cr: 'Unrated', abilities: 'Unknown motives.',
      description: 'Awaiting GM stat block.'
    });
    expect(unverified).toMatchObject({
      hp: null, hit_points: null, ac: null, armor_class: null,
      cr: 'Unrated', combat_ready: false, proficiency_bonus: null,
      initiativeMod: null, speed: '', stats: {}, skills: [], actions: [],
    });
    const combatant = monsterToCombatant(unverified);
    expect(combatant.hp).toBeNull();
    expect(combatant.ac).toBeNull();
  });

  test('does not infer attacks from a legacy creature with only story prose', () => {
    const legacy = normaliseMonsterStatBlock({
      name: 'Ancient Lake Beast', source: 'legacy-reference',
      type: 'beast', abilities: 'Its breath carries the scent of storms.'
    });
    expect(legacy.cr).toBe('Unrated');
    expect(legacy.actions).toEqual([]);
    expect(legacy.stats).toEqual({});
    expect(legacy.combat_ready).toBe(false);
  });

  test('preserves actual sourced Wednesday centipede actions and scores', () => {
    const centipede = normaliseMonsterStatBlock({
      id: 'sw-centipede', name: 'Hollowmere Giant Centipede', source: 'custom',
      hp: 8, ac: 13, cr: 'Unrated', speed: '30 ft., climb 30 ft.',
      stats: { dexterity: 14, constitution: 12 },
      actions: [{ name: 'Bite', bonus: '+4', damage: '1d4+2 piercing' }],
      bonus_actions: [{ name: 'Wall Skitter', description: 'Move 10 ft.' }],
      reactions: [{ name: 'Skitter Away', description: 'Move after a miss.' }],
    });
    expect(centipede).toMatchObject({
      hp: 8, ac: 13, cr: 'Unrated', combat_ready: true,
      stats: { dexterity: 14, constitution: 12 },
      actions: [{ name: 'Bite', bonus: '+4', damage: '1d4+2 piercing' }],
    });
    expect(centipede.bonus_actions).toHaveLength(1);
    expect(centipede.reactions).toHaveLength(1);
  });

  test('does not alter validated SRD monsters', () => {
    const wolf = MONSTER_DATABASE.find(creature => creature.source === 'srd-5.1' && creature.name === 'Wolf');
    const normalised = normaliseMonsterStatBlock(wolf);
    expect(normalised.hp).toBe(wolf.hp);
    expect(normalised.ac).toBe(wolf.ac);
    expect(normalised.cr).toBe(wolf.cr);
    expect(normalised.actions).toEqual(wolf.actions);
    expect(normalised.combat_ready).toBe(true);
  });
});

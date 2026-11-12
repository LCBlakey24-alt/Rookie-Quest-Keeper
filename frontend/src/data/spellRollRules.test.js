import { SPELL_DATABASE } from './spellDatabase';
import { SPELL_ROLLS, cantripTier, spellRoll, spellRollRule } from './spellRollRules';

const allSpells = Object.entries(SPELL_DATABASE).flatMap(([section, list]) =>
  (Array.isArray(list) ? list : []).map((spell) => ({ ...spell, level: section === 'cantrips' ? 0 : Number(section) })));

describe('coverage', () => {
  test('every spell in the database with damage or healing dice has a roll rule', () => {
    const missing = allSpells
      .filter((spell) => (spell.damage || spell.healing) && spell.name !== 'Goodberry') // berries heal 1 each: nothing to roll
      .filter((spell) => !spellRollRule(spell))
      .map((spell) => spell.name);
    expect(missing).toEqual([]);
  });

  test('no rule exists for a spell the database does not contain', () => {
    const names = new Set(allSpells.map((spell) => spell.name));
    expect(Object.keys(SPELL_ROLLS).filter((name) => !names.has(name))).toEqual([]);
  });
});

describe('cantrips grow at character levels 5, 11 and 17', () => {
  test.each([[1, 1], [4, 1], [5, 2], [10, 2], [11, 3], [17, 4], [20, 4]])('level %i is tier %i', (level, tier) => {
    expect(cantripTier(level)).toBe(tier);
  });
  test('Fire Bolt: a ranged spell attack, 1d10 then 2d10 at level 5', () => {
    expect(spellRoll({ name: 'Fire Bolt', level: 0 }, { characterLevel: 3 })).toMatchObject({ kind: 'attack', attack: 'ranged', notation: '1d10', type: 'fire' });
    expect(spellRoll({ name: 'Fire Bolt', level: 0 }, { characterLevel: 5 }).notation).toBe('2d10');
  });
  test('Eldritch Blast gains beams instead of dice', () => {
    const blast = spellRoll({ name: 'Eldritch Blast', level: 0 }, { characterLevel: 11 });
    expect(blast).toMatchObject({ notation: '1d10', count: 3, label: '3 beams' });
  });
  test('Toll the Dead offers the larger die for a hurt target, scaled too', () => {
    const toll = spellRoll({ name: 'Toll the Dead', level: 0 }, { characterLevel: 5 });
    expect(toll).toMatchObject({ kind: 'save', save: 'WIS', notation: '2d8' });
    expect(toll.alt).toEqual({ notation: '2d12', label: 'if hurt' });
  });
});

describe('higher slots add dice', () => {
  test('Fireball: DEX save, 8d6 at 3rd, 10d6 at 5th', () => {
    expect(spellRoll({ name: 'Fireball', level: 3 })).toMatchObject({ kind: 'save', save: 'DEX', notation: '8d6', slotLevel: 3 });
    expect(spellRoll({ name: 'Fireball', level: 3 }, { slotLevel: 5 }).notation).toBe('10d6');
  });
  test('a slot below the spell\'s level counts as its own level', () => {
    expect(spellRoll({ name: 'Fireball', level: 3 }, { slotLevel: 1 }).notation).toBe('8d6');
  });
  test('Magic Missile: one more dart per slot, each 1d4 + 1', () => {
    expect(spellRoll({ name: 'Magic Missile', level: 1 })).toMatchObject({ kind: 'auto', notation: '3d4+3', label: '3 darts' });
    expect(spellRoll({ name: 'Magic Missile', level: 1 }, { slotLevel: 3 }).notation).toBe('5d4+5');
  });
  test('Scorching Ray: one more ray per slot, each 2d6', () => {
    expect(spellRoll({ name: 'Scorching Ray', level: 2 }, { slotLevel: 4 })).toMatchObject({ notation: '2d6', count: 5, label: '5 rays' });
  });
  test('Spiritual Weapon: 1d8 + modifier, another 1d8 per two slot levels', () => {
    expect(spellRoll({ name: 'Spiritual Weapon', level: 2 }, { castingMod: 3 }).notation).toBe('1d8+3');
    expect(spellRoll({ name: 'Spiritual Weapon', level: 2 }, { castingMod: 3, slotLevel: 3 }).notation).toBe('1d8+3');
    expect(spellRoll({ name: 'Spiritual Weapon', level: 2 }, { castingMod: 3, slotLevel: 4 }).notation).toBe('2d8+3');
  });
  test('Ice Storm adds its d8 to the bludgeoning dice, not a new term', () => {
    expect(spellRoll({ name: 'Ice Storm', level: 4 }, { slotLevel: 6 }).notation).toBe('4d8+4d6');
  });
  test('Elemental Weapon goes by slot: 1d4, then 2d4 at 5th, 3d4 at 7th', () => {
    expect(spellRoll({ name: 'Elemental Weapon', level: 3 }).notation).toBe('1d4');
    expect(spellRoll({ name: 'Elemental Weapon', level: 3 }, { slotLevel: 6 }).notation).toBe('2d4');
    expect(spellRoll({ name: 'Elemental Weapon', level: 3 }, { slotLevel: 7 }).notation).toBe('3d4');
  });
  test('Ice Knife: an attack, plus a DEX-save cold burst that grows with the slot', () => {
    const knife = spellRoll({ name: 'Ice Knife', level: 1 }, { slotLevel: 2 });
    expect(knife).toMatchObject({ kind: 'attack', notation: '1d10' });
    expect(knife.burst).toEqual({ save: 'DEX', type: 'cold', notation: '3d6' });
  });
});

describe('healing, riders and fixed damage', () => {
  test('Cure Wounds heals 1d8 + modifier, +1d8 per slot', () => {
    expect(spellRoll({ name: 'Cure Wounds', level: 1 }, { castingMod: 3 })).toMatchObject({ kind: 'heal', notation: '1d8+3' });
    expect(spellRoll({ name: 'Cure Wounds', level: 1 }, { castingMod: -1, slotLevel: 2 }).notation).toBe('2d8-1');
  });
  test("Hunter's Mark is extra damage on a weapon hit", () => {
    expect(spellRoll({ name: "Hunter's Mark", level: 1 })).toMatchObject({ kind: 'rider', notation: '1d6' });
  });
  test('Guardian of Faith deals a fixed 20: nothing to roll', () => {
    expect(spellRoll({ name: 'Guardian of Faith', level: 4 })).toMatchObject({ fixed: 20, notation: null });
  });
  test('a spell with nothing to roll has no rule', () => {
    expect(spellRoll({ name: 'Light', level: 0 })).toBeNull();
  });
});

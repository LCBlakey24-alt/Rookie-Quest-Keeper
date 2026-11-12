import { castOptionAt, castableSpells, magicLevels, spellsAtLevel, spellWithDetails } from './magicModel';

const wizard = {
  cantrips_known: [{ name: 'Fire Bolt' }, 'Light'],
  spellbook: [{ name: 'Sleep', level: 1 }],
  spells_prepared: [{ name: 'Magic Missile' }, { name: 'Fireball', level: 3 }],
};

test('castable spells are cantrips plus prepared and known spells, not spellbook-only ones', () => {
  const names = castableSpells(wizard).map((spell) => spell.name);
  expect(names).toEqual(['Fire Bolt', 'Light', 'Magic Missile', 'Fireball']);
});

test('saved spells are filled in from the reference database', () => {
  expect(spellWithDetails({ name: 'Magic Missile' })).toMatchObject({ level: 1, school: 'Evocation' });
  expect(spellWithDetails('Fire Bolt').level).toBe(0);
});

test('the wheel has cantrips and each slot level, with dots for slots left (Pact Magic added in)', () => {
  const pools = { normal: { totals: { 1: 4, 2: 3, 3: 0 }, remaining: { 1: 2, 2: 3 } }, pact: { available: true, level: 2, total: 2, current: 1 } };
  expect(magicLevels(castableSpells(wizard), pools)).toEqual([
    { id: 'cantrips', level: 0, label: 'Cantrips', short: 'CANTRIP' },
    { id: 'level-1', level: 1, label: '1st level', short: '1ST', pips: { total: 4, left: 2 } },
    { id: 'level-2', level: 2, label: '2nd level', short: '2ND', pips: { total: 5, left: 4 } },
  ]);
});

test('a level lists its own spells by name', () => {
  expect(spellsAtLevel(castableSpells(wizard), 0).map((spell) => spell.name)).toEqual(['Fire Bolt', 'Light']);
});

test('casting from a wedge uses that level\'s slot, else the lowest higher one', () => {
  const options = [
    { source: 'spell', level: 1, remaining: 0 },
    { source: 'spell', level: 2, remaining: 1 },
    { source: 'pact', level: 2, remaining: 1 },
    { source: 'spell', level: 3, remaining: 2 },
  ];
  expect(castOptionAt(options, 2)).toMatchObject({ source: 'spell', level: 2 });
  expect(castOptionAt(options, 1)).toMatchObject({ level: 2 });
  expect(castOptionAt([], 1)).toBeNull();
  expect(castOptionAt([{ source: 'cantrip', level: 0 }], 0)).toMatchObject({ source: 'cantrip' });
});

test('a Warlock\'s lower-level spells sit under the Pact Magic wedge', () => {
  const warlock = { spells_known: [{ name: 'Hex', level: 1 }, { name: 'Hold Person', level: 2 }, { name: 'Counterspell', level: 3 }] };
  const pools = { pact: { available: true, level: 3, total: 2, current: 2 } };
  const spells = castableSpells(warlock);
  const levels = magicLevels(spells, pools).map((entry) => entry.level);
  expect(levels).toEqual([3]);
  expect(spellsAtLevel(spells, 3, levels).map((spell) => spell.name)).toEqual(['Counterspell', 'Hex', 'Hold Person']);
});

test('a spell with its own wedge is not repeated under higher wedges', () => {
  const spells = castableSpells(wizard);
  expect(spellsAtLevel(spells, 3, [0, 1, 3]).map((spell) => spell.name)).toEqual(['Fireball']);
});

test('the same spell from two classes is kept once per class; untagged repeats are dropped', () => {
  const multiclass = {
    spells_prepared: [{ name: 'Cure Wounds', sourceClass: 'Cleric' }, { name: 'Cure Wounds', sourceClass: 'Bard' }],
    spells_known: ['Cure Wounds'],
  };
  expect(castableSpells(multiclass).map((spell) => spell.sourceClass)).toEqual(['Cleric', 'Bard']);
  expect(castableSpells({ spells_known: ['Shield', { name: 'Shield' }] })).toHaveLength(1);
});

describe('castableSpells with an older Wizard save', () => {
  it('only lists spellbook spells kept in spells_known once they are prepared', () => {
    const names = castableSpells({
      character_class: 'Wizard', level: 3,
      spells_known: [{ name: 'Sleep', level: 1 }, { name: 'Shield', level: 1 }],
      spells_prepared: [{ name: 'Shield', level: 1 }],
    }).map((spell) => spell.name);
    expect(names).toContain('Shield');
    expect(names).not.toContain('Sleep');
  });

  it('keeps known spells castable for a known caster', () => {
    const names = castableSpells({ character_class: 'Sorcerer', level: 3, spells_known: [{ name: 'Sleep', level: 1 }] }).map((spell) => spell.name);
    expect(names).toContain('Sleep');
  });
});

describe('castableSpells keeps what the legacy rule leaves alone', () => {
  it('a name-only cantrip in an older Wizard save stays castable', () => {
    const names = castableSpells({ character_class: 'Wizard', level: 3, spells_known: ['Light', { name: 'Sleep', level: 1 }] }).map((spell) => spell.name);
    expect(names).toContain('Light');
    expect(names).not.toContain('Sleep');
  });

  it('a multiclass keeps the untagged copy of a spell', () => {
    const spells = castableSpells({
      class_levels: { Wizard: 3, Sorcerer: 2 },
      spells_known: [{ name: 'Sleep', level: 1 }, { name: 'Sleep', level: 1, sourceClass: 'Wizard' }],
    });
    expect(spells.filter((spell) => spell.name === 'Sleep')).toHaveLength(1);
    expect(spells.find((spell) => spell.name === 'Sleep').sourceClass).toBeUndefined();
  });
});


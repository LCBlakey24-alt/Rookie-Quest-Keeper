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

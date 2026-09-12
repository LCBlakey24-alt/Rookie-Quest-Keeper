import {
  buildPactMagicResource,
  getCastOptionsForSpell,
  getNormalSpellPool,
  getPactMagicPool,
  isLegacyPactSlotMap,
  spendCastOption,
} from './spellcastingPools';

describe('source-aware spellcasting pools', () => {
  test('reads persisted pact tracker ahead of derived pact math', () => {
    const pool = getPactMagicPool({
      resources: {
        pact_magic: { current: 1, remaining: 1, max: 3, slot_level: 5, restore: 'short-rest' },
      },
    }, {
      pactMagic: { slots: 4, level: 5 },
    });

    expect(pool).toMatchObject({ available: true, level: 5, total: 3, current: 1, restore: 'short-rest', legacy: false });
  });

  test('falls back to derived pact pool for older characters', () => {
    expect(getPactMagicPool({}, { pactMagic: { slots: 2, level: 3 } })).toMatchObject({
      available: true,
      level: 3,
      total: 2,
      current: 2,
      legacy: false,
    });
  });

  test('hydrates spent legacy Pact Magic from legacy spell slot remaining state', () => {
    const pool = getPactMagicPool({
      spell_slots: { 3: 2 },
      spell_slots_remaining: { 3: 1 },
    }, {
      pactMagic: { slots: 2, level: 3 },
    });

    expect(pool).toMatchObject({
      available: true,
      level: 3,
      total: 2,
      current: 1,
      legacy: true,
    });
  });

  test('normal spell pool prefers saved totals and clamps remaining', () => {
    expect(getNormalSpellPool({
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 99, 2: -1 },
    }, {
      slots: { 1: 3 },
    })).toEqual({
      totals: { 1: 4, 2: 2 },
      remaining: { 1: 4, 2: 0 },
      source: 'saved',
      legacyPactExcluded: false,
    });
  });

  test('single-class legacy Warlock slot map is excluded from ordinary slots', () => {
    const character = {
      spell_slots: { 3: 2 },
      spell_slots_remaining: { 3: 1 },
      resources: {
        pact_magic: { current: 1, remaining: 1, max: 2, slot_level: 3 },
      },
    };
    const slotMath = { slots: {}, pactMagic: { level: 3, slots: 2 } };

    expect(isLegacyPactSlotMap(character, slotMath)).toBe(true);
    expect(getNormalSpellPool(character, slotMath)).toEqual({
      totals: {},
      remaining: {},
      source: 'none',
      legacyPactExcluded: true,
    });
  });

  test('Warlock plus shared caster keeps saved ordinary slots separate from Pact Magic', () => {
    const character = {
      spell_slots: { 1: 3 },
      spell_slots_remaining: { 1: 2 },
      resources: {
        pact_magic: { current: 1, remaining: 1, max: 2, slot_level: 2 },
      },
    };
    const slotMath = { slots: { 1: 3 }, pactMagic: { level: 2, slots: 2 } };

    expect(isLegacyPactSlotMap(character, slotMath)).toBe(false);
    expect(getNormalSpellPool(character, slotMath)).toMatchObject({
      totals: { 1: 3 },
      remaining: { 1: 2 },
      source: 'saved',
      legacyPactExcluded: false,
    });
  });

  test('same slot level can expose separate normal and Pact choices', () => {
    const options = getCastOptionsForSpell({
      spell: { name: 'Custom Rift', level: 3 },
      normalSlots: { 3: 2 },
      normalRemaining: { 3: 1 },
      pactPool: { available: true, level: 3, total: 2, current: 2 },
    });

    expect(options).toEqual([
      { source: 'spell', level: 3, label: 'L3 Slot', remaining: 1, total: 2 },
      { source: 'pact', level: 3, label: 'Pact L3', remaining: 2, total: 2 },
    ]);
  });

  test('pact choice is omitted when its slot level is not valid for the spell', () => {
    const options = getCastOptionsForSpell({
      spell: { name: 'Exact Level Spell', level: 2 },
      normalSlots: { 2: 1 },
      normalRemaining: { 2: 1 },
      pactPool: { available: true, level: 3, total: 2, current: 2 },
    });

    expect(options).toEqual([
      { source: 'spell', level: 2, label: 'L2 Slot', remaining: 1, total: 1 },
    ]);
  });

  test('explicit upcast levels allow Pact Magic as a separate source', () => {
    const options = getCastOptionsForSpell({
      spell: { name: 'Custom Rift', level: 1, allowed_slot_levels: [1, 3] },
      normalSlots: { 1: 2 },
      normalRemaining: { 1: 1 },
      pactPool: { available: true, level: 3, total: 2, current: 1 },
    });

    expect(options.map(option => option.label)).toEqual(['L1 Slot', 'Pact L3']);
  });

  test('spending a normal slot leaves Pact Magic untouched', () => {
    expect(spendCastOption({
      option: { source: 'spell', level: 2 },
      normalRemaining: { 1: 3, 2: 1 },
      pactPool: { current: 2 },
    })).toEqual({
      normalRemaining: { 1: 3, 2: 0 },
      pactRemaining: 2,
    });
  });

  test('spending Pact Magic leaves ordinary slots untouched', () => {
    expect(spendCastOption({
      option: { source: 'pact', level: 3 },
      normalRemaining: { 1: 3, 2: 1 },
      pactPool: { current: 2 },
    })).toEqual({
      normalRemaining: { 1: 3, 2: 1 },
      pactRemaining: 1,
    });
  });

  test('building Pact resource preserves custom metadata while normalising state', () => {
    expect(buildPactMagicResource({
      pact_magic: { label: 'Scarabs of Akara', note: 'homebrew label kept' },
      other_resource: { current: 2, max: 2 },
    }, {
      level: 4,
      total: 2,
      current: 2,
    }, 1)).toEqual({
      pact_magic: {
        label: 'Scarabs of Akara',
        note: 'homebrew label kept',
        current: 1,
        remaining: 1,
        max: 2,
        slot_level: 4,
        restore: 'short-rest',
        min_level: 1,
        className: 'Warlock',
      },
      other_resource: { current: 2, max: 2 },
    });
  });
});

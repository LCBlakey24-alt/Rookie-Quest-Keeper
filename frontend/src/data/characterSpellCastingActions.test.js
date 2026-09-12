import {
  buildCharacterSpellCastUpdate,
  characterClassLevels,
  getCharacterCastOptions,
} from './characterSpellCastingActions';

describe('character spell casting actions', () => {
  test('normalises class levels from saved multiclass state', () => {
    expect(characterClassLevels({
      character_class: 'Fighter',
      level: 5,
      class_levels: { Fighter: 3, Wizard: 2 },
    })).toEqual({ Fighter: 3, Wizard: 2 });
  });

  test('cantrips never spend a slot', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Wizard',
      level: 3,
      class_levels: { Wizard: 3 },
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 1, 2: 2 },
    }, { name: 'Fire Bolt', level: 0 });

    expect(result.ok).toBe(true);
    expect(result.option.source).toBe('cantrip');
    expect(result.updates).toEqual({});
  });

  test('normal caster spends the lowest usable normal slot', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Wizard',
      level: 3,
      class_levels: { Wizard: 3 },
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 1, 2: 2 },
    }, { name: 'Magic Missile', level: 1 });

    expect(result.option).toMatchObject({ source: 'spell', level: 1 });
    expect(result.updates.spell_slots_remaining).toEqual({ 1: 0, 2: 2 });
  });

  test('warlock-only casting spends Pact Magic and keeps legacy slot mirror in sync', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Warlock',
      level: 5,
      class_levels: { Warlock: 5 },
      spell_slots: { 3: 2 },
      spell_slots_remaining: { 3: 2 },
      resources: {
        pact_magic: {
          label: 'Pact Magic',
          current: 2,
          remaining: 2,
          max: 2,
          slot_level: 3,
          restore: 'short-rest',
        },
      },
    }, { name: 'Hex', level: 1 });

    expect(result.option).toMatchObject({ source: 'pact', level: 3 });
    expect(result.updates.resources.pact_magic).toMatchObject({ current: 1, remaining: 1, max: 2, slot_level: 3 });
    expect(result.updates.spell_slots_remaining).toEqual({ 3: 1 });
  });

  test('multiclass caster prefers a normal slot when both normal and Pact Magic can cast the spell', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Wizard',
      level: 5,
      class_levels: { Wizard: 3, Warlock: 2 },
      classes: [
        { name: 'Wizard', level: 3, subclass: 'Evocation' },
        { name: 'Warlock', level: 2, subclass: 'Fiend' },
      ],
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 2, 2: 2 },
      resources: {
        pact_magic: { current: 2, remaining: 2, max: 2, slot_level: 1, restore: 'short-rest' },
      },
    }, { name: 'Magic Missile', level: 1 });

    expect(result.option).toMatchObject({ source: 'spell', level: 1 });
    expect(result.updates.spell_slots_remaining).toEqual({ 1: 1, 2: 2 });
    expect(result.updates.resources).toBeUndefined();
  });

  test('multiclass caster falls back to Pact Magic when eligible normal slots are empty', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Wizard',
      level: 6,
      class_levels: { Wizard: 3, Warlock: 3 },
      classes: [
        { name: 'Wizard', level: 3, subclass: 'Evocation' },
        { name: 'Warlock', level: 3, subclass: 'Fiend' },
      ],
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 0, 2: 0 },
      resources: {
        pact_magic: { current: 1, remaining: 1, max: 2, slot_level: 2, restore: 'short-rest' },
      },
    }, { name: 'Misty Step', level: 2 });

    expect(result.option).toMatchObject({ source: 'pact', level: 2 });
    expect(result.updates.resources.pact_magic).toMatchObject({ current: 0, remaining: 0, max: 2, slot_level: 2 });
    expect(result.updates.spell_slots_remaining).toBeUndefined();
  });

  test('reports no available slot when both pools are empty', () => {
    const result = buildCharacterSpellCastUpdate({
      character_class: 'Warlock',
      level: 3,
      class_levels: { Warlock: 3 },
      spell_slots: { 2: 2 },
      spell_slots_remaining: { 2: 0 },
      resources: {
        pact_magic: { current: 0, remaining: 0, max: 2, slot_level: 2, restore: 'short-rest' },
      },
    }, { name: 'Hex', level: 1 });

    expect(result.ok).toBe(false);
    expect(result.option).toBeNull();
    expect(result.reason).toContain('No level 1+ spell slots left');
  });

  test('exposes both normal and Pact Magic options for future explicit player choice', () => {
    const result = getCharacterCastOptions({
      character_class: 'Wizard',
      level: 6,
      class_levels: { Wizard: 3, Warlock: 3 },
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 2, 2: 1 },
      resources: {
        pact_magic: { current: 2, remaining: 2, max: 2, slot_level: 2, restore: 'short-rest' },
      },
    }, { name: 'Misty Step', level: 2 });

    expect(result.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'spell', level: 2 }),
      expect.objectContaining({ source: 'pact', level: 2 }),
    ]));
  });
});

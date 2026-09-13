import {
  buildFreshSpellSlotState,
  clampSpellSlotsRemaining,
  deriveCanonicalSpellSlots,
} from './canonicalSpellSlotState';

describe('canonical spell slot state', () => {
  test('2024 half-casters gain spell slots at level 1 while 2014 half-casters do not', () => {
    expect(deriveCanonicalSpellSlots(
      { character_class: 'Ranger', level: 1, rules_edition: '2024' },
      { Ranger: 1 },
    )).toEqual({ 1: 2 });

    expect(deriveCanonicalSpellSlots(
      { character_class: 'Ranger', level: 1, rules_edition: '2014' },
      { Ranger: 1 },
    )).toEqual({});
  });

  test('2024 half-caster odd levels round up instead of using the legacy floor rule', () => {
    expect(deriveCanonicalSpellSlots(
      { character_class: 'Paladin', level: 3, rules_edition: '2024' },
      { Paladin: 3 },
    )).toEqual({ 1: 3 });

    expect(deriveCanonicalSpellSlots(
      { character_class: 'Paladin', level: 3, rules_edition: '2014' },
      { Paladin: 3 },
    )).toEqual({ 1: 2 });
  });

  test('pure Warlock Pact Magic is stored as a canonical slot-level map', () => {
    expect(deriveCanonicalSpellSlots(
      { character_class: 'Warlock', level: 5, rules_edition: '2024' },
      { Warlock: 5 },
    )).toEqual({ 3: 2 });
  });

  test('multiclass shared spell slots stay separate from Warlock Pact Magic', () => {
    expect(deriveCanonicalSpellSlots(
      {
        character_class: 'Wizard',
        level: 6,
        rules_edition: '2024',
        class_levels: { Wizard: 3, Warlock: 3 },
        classes: [
          { name: 'Wizard', level: 3, subclass: '' },
          { name: 'Warlock', level: 3, subclass: '' },
        ],
      },
      { Wizard: 3, Warlock: 3 },
    )).toEqual({ 1: 4, 2: 2 });
  });

  test('fresh slot state restores all derived slots and remaining slots clamp safely', () => {
    const fresh = buildFreshSpellSlotState(
      { character_class: 'Wizard', level: 3, rules_edition: '2024' },
      { Wizard: 3 },
    );
    expect(fresh).toEqual({
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 4, 2: 2 },
    });

    expect(clampSpellSlotsRemaining({ 1: 4, 2: 2 }, { 1: 99, 2: -3 })).toEqual({ 1: 4, 2: 0 });
  });
});

import {
  classHasEditionSpellcasting,
  getEditionMaxSpellLevel,
  getEditionMulticlassSpellSlots,
  getEditionSpellSlotsForClass,
  halfCasterContribution,
} from './editionSpellSlotRules';

describe('edition-aware frontend spell slot rules', () => {
  test('2014 half casters round down while 2024 half casters round up', () => {
    expect(halfCasterContribution(1, '2014')).toBe(0);
    expect(halfCasterContribution(1, '2024')).toBe(1);
    expect(halfCasterContribution(3, '2014')).toBe(1);
    expect(halfCasterContribution(3, '2024')).toBe(2);
  });

  test('Paladin and Ranger begin spellcasting at level 1 only under 2024 rules', () => {
    expect(classHasEditionSpellcasting({ character_class: 'Paladin', level: 1, rules_edition: '2014' }, 'Paladin', 1)).toBe(false);
    expect(classHasEditionSpellcasting({ character_class: 'Paladin', level: 1, rules_edition: '2024' }, 'Paladin', 1)).toBe(true);
    expect(classHasEditionSpellcasting({ character_class: 'Ranger', level: 1, rules_edition: '2014' }, 'Ranger', 1)).toBe(false);
    expect(classHasEditionSpellcasting({ character_class: 'Ranger', level: 1, rules_edition: '2024' }, 'Ranger', 1)).toBe(true);
  });

  test('2024 Paladin level 1 has two level-one spell slots', () => {
    expect(getEditionSpellSlotsForClass(
      { character_class: 'Paladin', level: 1, rules_edition: '2024' },
      'Paladin',
      1,
    )).toEqual({ 1: 2 });
    expect(getEditionMaxSpellLevel(
      { character_class: 'Paladin', level: 1, rules_edition: '2024' },
      'Paladin',
      1,
    )).toBe(1);
  });

  test('2014 Paladin level 1 has no spell slots', () => {
    expect(getEditionSpellSlotsForClass(
      { character_class: 'Paladin', level: 1, rules_edition: '2014' },
      'Paladin',
      1,
    )).toEqual({});
  });

  test('2024 multiclass half caster contribution is rounded up', () => {
    const result = getEditionMulticlassSpellSlots(
      { Wizard: 1, Paladin: 1 },
      { character_class: 'Wizard', level: 2, rules_edition: '2024', class_levels: { Wizard: 1, Paladin: 1 } },
    );
    expect(result.multiclassLevel).toBe(2);
    expect(result.slots).toEqual({ 1: 3 });
  });

  test('2014 multiclass half caster contribution is rounded down', () => {
    const result = getEditionMulticlassSpellSlots(
      { Wizard: 1, Paladin: 1 },
      { character_class: 'Wizard', level: 2, rules_edition: '2014', class_levels: { Wizard: 1, Paladin: 1 } },
    );
    expect(result.multiclassLevel).toBe(1);
    expect(result.slots).toEqual({ 1: 2 });
  });

  test('Warlock Pact Magic remains separate from ordinary slots', () => {
    const result = getEditionMulticlassSpellSlots(
      { Warlock: 11, Paladin: 1 },
      { character_class: 'Warlock', level: 12, rules_edition: '2024', class_levels: { Warlock: 11, Paladin: 1 } },
    );
    expect(result.slots).toEqual({ 1: 2 });
    expect(result.pactMagic).toEqual({ slots: 3, level: 5 });
  });
});

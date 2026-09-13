import {
  getKnownSpellTarget,
  getPreparedSpellCapacity,
  getPreparedSpellCapacityGain,
  getPreparedSpellChangeRule,
  getSpellSelectionMode,
  getWizardSpellbookTarget,
} from './spellPreparationRules';

describe('edition-aware spell preparation rules', () => {
  test.each([
    ['Bard', 4, 7, 5, 9],
    ['Cleric', 4, 7, 5, 9],
    ['Druid', 1, 4, 2, 5],
    ['Paladin', 4, 5, 5, 6],
    ['Ranger', 1, 2, 2, 3],
    ['Sorcerer', 1, 2, 2, 4],
    ['Warlock', 1, 2, 2, 3],
    ['Wizard', 4, 7, 5, 9],
  ])('uses fixed 2024 prepared-spell table for %s', (className, levelA, countA, levelB, countB) => {
    expect(getPreparedSpellCapacity({ className, level: levelA, edition: '2024', abilityScore: 20 })).toBe(countA);
    expect(getPreparedSpellCapacity({ className, level: levelB, edition: '2024', abilityScore: 8 })).toBe(countB);
  });

  test('keeps 2014 ability-modifier prepared formulas where appropriate', () => {
    expect(getPreparedSpellCapacity({ className: 'Cleric', level: 5, edition: '2014', abilityScore: 16 })).toBe(8);
    expect(getPreparedSpellCapacity({ className: 'Druid', level: 4, edition: '2014', abilityScore: 14 })).toBe(6);
    expect(getPreparedSpellCapacity({ className: 'Wizard', level: 5, edition: '2014', abilityScore: 18 })).toBe(9);
    expect(getPreparedSpellCapacity({ className: 'Paladin', level: 1, edition: '2014', abilityScore: 18 })).toBe(0);
    expect(getPreparedSpellCapacity({ className: 'Paladin', level: 5, edition: '2014', abilityScore: 16 })).toBe(5);
  });

  test('suppresses legacy known-spell tables for revised 2024 casters', () => {
    expect(getKnownSpellTarget({ className: 'Bard', level: 5, edition: '2024' })).toBe(0);
    expect(getKnownSpellTarget({ className: 'Sorcerer', level: 5, edition: '2024' })).toBe(0);
    expect(getKnownSpellTarget({ className: 'Warlock', level: 5, edition: '2024' })).toBe(0);
    expect(getKnownSpellTarget({ className: 'Ranger', level: 5, edition: '2024' })).toBe(0);
    expect(getKnownSpellTarget({ className: 'Bard', level: 5, edition: '2014' })).toBe(8);
    expect(getKnownSpellTarget({ className: 'Ranger', level: 5, edition: '2014' })).toBe(4);
  });

  test('distinguishes known, prepared, and Wizard spellbook persistence', () => {
    expect(getSpellSelectionMode({ className: 'Bard', edition: '2014' })).toBe('known');
    expect(getSpellSelectionMode({ className: 'Bard', edition: '2024' })).toBe('prepared');
    expect(getSpellSelectionMode({ className: 'Ranger', edition: '2014' })).toBe('known');
    expect(getSpellSelectionMode({ className: 'Ranger', edition: '2024' })).toBe('prepared');
    expect(getSpellSelectionMode({ className: 'Wizard', edition: '2014' })).toBe('spellbook');
    expect(getSpellSelectionMode({ className: 'Wizard', edition: '2024' })).toBe('spellbook');
  });

  test('tracks Wizard class-granted spellbook size separately from preparation', () => {
    expect(getWizardSpellbookTarget(1)).toBe(6);
    expect(getWizardSpellbookTarget(5)).toBe(14);
    expect(getWizardSpellbookTarget(20)).toBe(44);
  });

  test('reports capacity gains and replacement cadence', () => {
    expect(getPreparedSpellCapacityGain({ className: 'Sorcerer', before: 1, after: 2, edition: '2024' })).toBe(2);
    expect(getPreparedSpellCapacityGain({ className: 'Warlock', before: 9, after: 10, edition: '2024' })).toBe(0);
    expect(getPreparedSpellChangeRule({ className: 'Bard', edition: '2024' })).toEqual({ cadence: 'level-up', maxReplacements: 1 });
    expect(getPreparedSpellChangeRule({ className: 'Ranger', edition: '2024' })).toEqual({ cadence: 'long-rest', maxReplacements: 1 });
    expect(getPreparedSpellChangeRule({ className: 'Wizard', edition: '2024' })).toEqual({ cadence: 'long-rest', maxReplacements: null });
  });
});

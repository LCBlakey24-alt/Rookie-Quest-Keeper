import {
  canChooseSubclassAtLevel,
  getAsiLevels,
  getChoicesForStartingLevel,
  getRequiredLevelChoices,
  getRulesEdition,
  getSpellcastingStartLevel,
  getSubclassUnlockLevel,
  isSpellcastingAvailableAtLevel,
} from './classLevelRules';

describe('class level rules', () => {
  test('normalises rules edition labels', () => {
    expect(getRulesEdition('2014')).toBe('2014');
    expect(getRulesEdition('2024')).toBe('2024');
    expect(getRulesEdition('D&D 2024 revised')).toBe('2024');
    expect(getRulesEdition()).toBe('2014');
  });

  test('tracks subclass timing by edition', () => {
    expect(getSubclassUnlockLevel('Cleric', '2014')).toBe(1);
    expect(getSubclassUnlockLevel('Cleric', '2024')).toBe(3);
    expect(getSubclassUnlockLevel('Wizard', '2014')).toBe(2);
    expect(getSubclassUnlockLevel('Wizard', '2024')).toBe(3);
    expect(canChooseSubclassAtLevel('Sorcerer', 1, '2014')).toBe(true);
    expect(canChooseSubclassAtLevel('Sorcerer', 1, '2024')).toBe(false);
    expect(canChooseSubclassAtLevel('Sorcerer', 3, '2024')).toBe(true);
  });

  test('tracks 2014 and 2024 Paladin and Ranger spellcasting starts', () => {
    expect(getSpellcastingStartLevel('Paladin', '2014')).toBe(2);
    expect(getSpellcastingStartLevel('Ranger', '2014')).toBe(2);
    expect(getSpellcastingStartLevel('Paladin', '2024')).toBe(1);
    expect(getSpellcastingStartLevel('Ranger', '2024')).toBe(1);

    expect(isSpellcastingAvailableAtLevel('Paladin', 1, '2014')).toBe(false);
    expect(isSpellcastingAvailableAtLevel('Paladin', 1, '2024')).toBe(true);
    expect(isSpellcastingAvailableAtLevel('Ranger', 1, '2014')).toBe(false);
    expect(isSpellcastingAvailableAtLevel('Ranger', 1, '2024')).toBe(true);
  });

  test('emits the correct spellcasting milestone choice for revised half casters', () => {
    expect(getRequiredLevelChoices({ className: 'Paladin', level: 1, edition: '2024' }))
      .toEqual(expect.arrayContaining([{ type: 'spellcasting_start', level: 1, label: 'Spellcasting begins' }]));
    expect(getRequiredLevelChoices({ className: 'Ranger', level: 1, edition: '2024' }))
      .toEqual(expect.arrayContaining([{ type: 'spellcasting_start', level: 1, label: 'Spellcasting begins' }]));

    expect(getRequiredLevelChoices({ className: 'Paladin', level: 1, edition: '2014' }).map((choice) => choice.type))
      .not.toContain('spellcasting_start');
    expect(getRequiredLevelChoices({ className: 'Ranger', level: 2, edition: '2014' }).map((choice) => choice.type))
      .toContain('spellcasting_start');
  });

  test('starting-level choice history uses edition-aware spellcasting milestones', () => {
    const revisedRanger = getChoicesForStartingLevel({ className: 'Ranger', startingLevel: 1, edition: '2024' });
    const legacyRanger = getChoicesForStartingLevel({ className: 'Ranger', startingLevel: 1, edition: '2014' });
    const legacyRangerTwo = getChoicesForStartingLevel({ className: 'Ranger', startingLevel: 2, edition: '2014' });

    expect(revisedRanger.map((choice) => choice.type)).toContain('spellcasting_start');
    expect(legacyRanger.map((choice) => choice.type)).not.toContain('spellcasting_start');
    expect(legacyRangerTwo.map((choice) => choice.type)).toContain('spellcasting_start');
  });

  test('keeps extra Fighter and Rogue ASI milestones', () => {
    expect(getAsiLevels('Fighter')).toEqual([4, 6, 8, 12, 14, 16, 19]);
    expect(getAsiLevels('Rogue')).toEqual([4, 8, 10, 12, 16, 19]);
    expect(getAsiLevels('Wizard')).toEqual([4, 8, 12, 16, 19]);
  });
});

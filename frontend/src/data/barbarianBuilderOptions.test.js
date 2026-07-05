import {
  getBarbarianBuilderOptions,
  getBarbarianSubclassOptions,
  isValidBarbarianSubclass,
  validateBarbarianBuilderSelections,
} from './barbarianBuilderOptions';

describe('Barbarian builder options', () => {
  test('returns 2014 and 2024 subclass options', () => {
    expect(getBarbarianSubclassOptions('2014').map(option => option.key)).toEqual(['berserker', 'custom_barbarian_subclass']);
    expect(getBarbarianSubclassOptions('2024').map(option => option.key)).toEqual(['berserker', 'wild_heart', 'world_tree', 'zealot', 'custom_barbarian_subclass']);
  });

  test('validates subclass selections by value or key', () => {
    expect(isValidBarbarianSubclass('Path of the Berserker', '2014')).toBe(true);
    expect(isValidBarbarianSubclass('world_tree', '2024')).toBe(true);
    expect(isValidBarbarianSubclass('world_tree', '2014')).toBe(false);
    expect(isValidBarbarianSubclass('Custom Barbarian Subclass', '2014')).toBe(true);
    expect(isValidBarbarianSubclass('totem_warrior', '2014')).toBe(false);
  });

  test('summarises level 1 2024 weapon mastery choices', () => {
    const options = getBarbarianBuilderOptions(1, '2024');

    expect(options.level).toBe(1);
    expect(options.weaponMasteryChoices).toBe(2);
    expect(options.requiredChoiceLabels).toContain('Weapon Mastery');
    expect(options.weaponMasteryOptions.length).toBeGreaterThan(0);
  });

  test('summarises level 3 subclass choice', () => {
    const options = getBarbarianBuilderOptions(3, '2014');

    expect(options.needsSubclass).toBe(true);
    expect(options.requiredChoiceLabels).toContain('Subclass');
  });

  test('validates complete and missing builder selections', () => {
    expect(validateBarbarianBuilderSelections({ level: 1, edition: '2024', weaponMasteries: ['Cleave', 'Topple'] }).valid).toBe(true);
    expect(validateBarbarianBuilderSelections({ level: 3, edition: '2024', subclass: '', weaponMasteries: [] }).errors).toContain('Choose or record a Barbarian subclass.');
  });
});

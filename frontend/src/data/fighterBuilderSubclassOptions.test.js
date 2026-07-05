import { getFighterBuilderOptions, getFighterSubclassOptions, isValidFighterSubclass, validateFighterBuilderSelections } from './fighterBuilderOptions';

describe('Fighter subclass builder options', () => {
  test('returns public-license subclass choices for builder rendering', () => {
    const options = getFighterBuilderOptions(3, '2014');

    expect(options.needsSubclass).toBe(true);
    expect(options.subclassOptions.map(option => option.key)).toEqual(['champion', 'custom_fighter_subclass']);
    expect(options.subclassOptions.find(option => option.custom)).toMatchObject({
      label: 'Custom / user-added subclass',
      supportedAutomation: false,
    });
  });

  test('keeps public-license subclass choices available for 2024 rules', () => {
    expect(getFighterSubclassOptions('2024').map(option => option.value)).toEqual(['Champion', 'Custom Fighter Subclass']);
  });

  test('validates public-license and custom/user-added subclass selections', () => {
    expect(isValidFighterSubclass('Champion', '2024')).toBe(true);
    expect(isValidFighterSubclass('champion', '2024')).toBe(true);
    expect(isValidFighterSubclass('Custom Fighter Subclass', '2024')).toBe(true);
    expect(isValidFighterSubclass('custom_fighter_subclass', '2024')).toBe(true);
    expect(isValidFighterSubclass('battle_master', '2024')).toBe(false);
    expect(isValidFighterSubclass('Unknown Subclass', '2024')).toBe(false);
  });

  test('reports missing subclass choices at subclass level', () => {
    expect(validateFighterBuilderSelections({ level: 3, edition: '2014', fightingStyle: 'Archery', subclass: '' }).errors).toContain('Choose or record a Fighter subclass.');
    expect(validateFighterBuilderSelections({ level: 3, edition: '2014', fightingStyle: 'Archery', subclass: 'Champion' }).valid).toBe(true);
    expect(validateFighterBuilderSelections({ level: 3, edition: '2014', fightingStyle: 'Archery', subclass: 'Custom Fighter Subclass' }).valid).toBe(true);
  });
});

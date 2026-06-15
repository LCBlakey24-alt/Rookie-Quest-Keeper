import { getFighterBuilderOptions, getFighterSubclassOptions, isValidFighterSubclass, validateFighterBuilderSelections } from './fighterBuilderOptions';

describe('Fighter subclass builder options', () => {
  test('returns ready-to-render subclass choices', () => {
    const options = getFighterBuilderOptions(3, '2014');

    expect(options.needsSubclass).toBe(true);
    expect(options.subclassOptions.map(option => option.key)).toEqual([
      'champion',
      'battle_master',
      'eldritch_knight',
    ]);
  });

  test('keeps subclass choices available for 2024 rules', () => {
    expect(getFighterSubclassOptions('2024').map(option => option.value)).toEqual([
      'Champion',
      'Battle Master',
      'Eldritch Knight',
    ]);
  });

  test('validates subclass selections by label or key', () => {
    expect(isValidFighterSubclass('Champion', '2024')).toBe(true);
    expect(isValidFighterSubclass('battle_master', '2024')).toBe(true);
    expect(isValidFighterSubclass('Unknown Subclass', '2024')).toBe(false);
  });

  test('reports missing subclass choices at subclass level', () => {
    expect(validateFighterBuilderSelections({ level: 3, edition: '2014', fightingStyle: 'Archery', subclass: '' }).errors).toContain('Choose a Fighter subclass.');
    expect(validateFighterBuilderSelections({ level: 3, edition: '2014', fightingStyle: 'Archery', subclass: 'Champion' }).valid).toBe(true);
  });
});

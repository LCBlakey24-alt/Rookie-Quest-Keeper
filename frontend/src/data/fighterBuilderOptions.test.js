import { getFighterBuilderOptions, validateFighterBuilderSelections } from './fighterBuilderOptions';

describe('Fighter builder options', () => {
  test('level 1 Fighter requires a fighting style', () => {
    const options = getFighterBuilderOptions(1, '2014');

    expect(options.needsFightingStyle).toBe(true);
    expect(options.needsSubclass).toBe(false);
    expect(options.fightingStyles.map(style => style.name)).toContain('Archery');
  });

  test('2024 level 1 Fighter requires weapon mastery choices', () => {
    const options = getFighterBuilderOptions(1, '2024');

    expect(options.needsFightingStyle).toBe(true);
    expect(options.weaponMasteryChoices).toBe(3);
    expect(options.fightingStyles.map(style => style.name)).toContain('Blind Fighting');
  });

  test('level 3 Fighter requires subclass selection', () => {
    const options = getFighterBuilderOptions(3, '2014');

    expect(options.needsSubclass).toBe(true);
  });

  test('validates fighting style by edition', () => {
    expect(validateFighterBuilderSelections({ level: 1, edition: '2014', fightingStyle: 'Archery' }).valid).toBe(true);
    expect(validateFighterBuilderSelections({ level: 1, edition: '2014', fightingStyle: 'Blind Fighting' }).valid).toBe(false);
    expect(validateFighterBuilderSelections({ level: 1, edition: '2024', fightingStyle: 'Blind Fighting', weaponMasteries: ['Longsword', 'Longbow', 'Dagger'] }).valid).toBe(true);
  });

  test('reports missing required Fighter choices', () => {
    const result = validateFighterBuilderSelections({ level: 1, edition: '2024', fightingStyle: '', weaponMasteries: [] });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Choose a valid Fighter Fighting Style.',
      'Choose 3 Weapon Mastery options.',
    ]);
  });
});

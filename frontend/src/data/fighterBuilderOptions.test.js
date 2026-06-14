import { getFighterBuilderOptions, validateFighterBuilderSelections } from './fighterBuilderOptions';

describe('Fighter builder options', () => {
  test('level 1 Fighter requires a fighting style', () => {
    const options = getFighterBuilderOptions(1, '2014');

    expect(options.needsFightingStyle).toBe(true);
    expect(options.needsSubclass).toBe(false);
    expect(options.fightingStyles.map(style => style.name)).toContain('Archery');
    expect(options.requiredChoiceLabels).toEqual(['Fighting Style']);
  });

  test('2024 level 1 Fighter requires weapon mastery choices', () => {
    const options = getFighterBuilderOptions(1, '2024');

    expect(options.needsFightingStyle).toBe(true);
    expect(options.weaponMasteryChoices).toBe(3);
    expect(options.fightingStyles.map(style => style.name)).toContain('Blind Fighting');
    expect(options.requiredChoiceLabels).toEqual(['Fighting Style', 'Weapon Mastery']);
    expect(options.helperText).toContain('Choose 3 Weapon Mastery options.');
  });

  test('returns ready-to-render fighting style options', () => {
    const options = getFighterBuilderOptions(1, '2024');

    expect(options.fightingStyleOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'Blind Fighting',
        label: 'Blind Fighting',
        key: 'blind_fighting',
        ruleset: '2024',
      }),
    ]));
  });

  test('level 3 Fighter requires subclass selection', () => {
    const options = getFighterBuilderOptions(3, '2014');

    expect(options.needsSubclass).toBe(true);
    expect(options.requiredChoiceLabels).toEqual(['Subclass']);
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

import { getFighterBuilderOptions, validateFighterBuilderSelections } from './fighterBuilderOptions';

describe('Fighter builder mastery integration', () => {
  test('includes mastery options when 2024 Fighter choices require them', () => {
    const options = getFighterBuilderOptions(1, '2024');

    expect(options.weaponMasteryChoices).toBe(3);
    expect(options.weaponMasteryOptions).toHaveLength(8);
    expect(options.weaponMasteryOptions.map(option => option.key)).toContain('cleave');
  });

  test('validates invalid mastery names', () => {
    const result = validateFighterBuilderSelections({
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Topple', 'Banana'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Choose valid Weapon Mastery options.');
  });

  test('accepts valid mastery names', () => {
    const result = validateFighterBuilderSelections({
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Topple', 'Vex'],
    });

    expect(result.valid).toBe(true);
  });
});

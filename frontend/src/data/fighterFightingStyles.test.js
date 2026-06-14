import {
  findFighterFightingStyle,
  getFighterFightingStyleNames,
  getFighterFightingStyles,
  isValidFighterFightingStyle,
  normaliseFightingStyleName,
} from './fighterFightingStyles';

describe('Fighter fighting style options', () => {
  test('normalises fighting style names safely', () => {
    expect(normaliseFightingStyleName('Great Weapon Fighting')).toBe('great_weapon_fighting');
    expect(normaliseFightingStyleName('  Two-Weapon Fighting  ')).toBe('two_weapon_fighting');
  });

  test('2014 Fighter uses the classic six style list', () => {
    expect(getFighterFightingStyleNames('2014')).toEqual([
      'Archery',
      'Defense',
      'Dueling',
      'Great Weapon Fighting',
      'Protection',
      'Two-Weapon Fighting',
    ]);
  });

  test('2024 Fighter includes expanded fighting style feat options', () => {
    const names = getFighterFightingStyleNames('2024');

    expect(names).toContain('Blind Fighting');
    expect(names).toContain('Interception');
    expect(names).toContain('Superior Technique');
    expect(names).toContain('Thrown Weapon Fighting');
    expect(names).toContain('Unarmed Fighting');
  });

  test('validates style availability by ruleset', () => {
    expect(isValidFighterFightingStyle('Archery', '2014')).toBe(true);
    expect(isValidFighterFightingStyle('Blind Fighting', '2014')).toBe(false);
    expect(isValidFighterFightingStyle('Blind Fighting', '2024')).toBe(true);
  });

  test('finds style details by name or key', () => {
    expect(findFighterFightingStyle('great_weapon_fighting', '2014')).toMatchObject({
      name: 'Great Weapon Fighting',
      ruleset: '2014',
    });
    expect(getFighterFightingStyles('2024').every(style => style.description)).toBe(true);
  });
});

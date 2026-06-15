import { getFighterWeaponMasteryOptions, isValidFighterWeaponMastery } from './fighterWeaponMasteryOptions';

describe('Fighter mastery option helper', () => {
  test('returns the 2024 option list', () => {
    const options = getFighterWeaponMasteryOptions('2024');

    expect(options).toHaveLength(8);
    expect(options.map(option => option.key)).toContain('cleave');
    expect(options.map(option => option.key)).toContain('vex');
  });

  test('does not return options for 2014 rules', () => {
    expect(getFighterWeaponMasteryOptions('2014')).toEqual([]);
  });

  test('validates labels and keys', () => {
    expect(isValidFighterWeaponMastery('Cleave', '2024')).toBe(true);
    expect(isValidFighterWeaponMastery('topple', '2024')).toBe(true);
    expect(isValidFighterWeaponMastery('banana', '2024')).toBe(false);
  });
});

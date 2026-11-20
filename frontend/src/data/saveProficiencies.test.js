import { getSaveProficiencies, isSaveProficient, normaliseSaveAbility } from './saveProficiencies';
import { getConcentrationSaveModifier } from './characterConcentrationRules';

describe('saving throw proficiencies', () => {
  test('a stored list is used as it is, whatever its spelling', () => {
    const character = { character_class: 'Wizard', saving_throw_proficiencies: ['STR', 'Constitution'] };
    expect(getSaveProficiencies(character)).toEqual(['strength', 'constitution']);
    expect(isSaveProficient(character, 'intelligence')).toBe(false);
  });

  test('an empty list falls back to the starting class (SRD)', () => {
    expect(getSaveProficiencies({ character_class: 'Wizard', saving_throw_proficiencies: [] })).toEqual(['intelligence', 'wisdom']);
    expect(getSaveProficiencies({ character_class: 'Barbarian' })).toEqual(['strength', 'constitution']);
    expect(getSaveProficiencies({ character_class: 'monk' })).toEqual(['strength', 'dexterity']);
  });

  test('a multiclass character keeps only the starting class saves', () => {
    expect(getSaveProficiencies({ character_class: 'Fighter / Wizard', class_levels: { Fighter: 2, Wizard: 1 } })).toEqual(['strength', 'constitution']);
    expect(getSaveProficiencies({ class_levels: { Rogue: 3, Fighter: 1 } })).toEqual(['dexterity', 'intelligence']);
  });

  test('an unknown or homebrew class with no stored list has none', () => {
    expect(getSaveProficiencies({ character_class: 'Gunslinger' })).toEqual([]);
    expect(getSaveProficiencies({})).toEqual([]);
  });

  test('normalises the usual spellings', () => {
    expect(normaliseSaveAbility('DEX')).toBe('dexterity');
    expect(normaliseSaveAbility('Wisdom save')).toBe('wisdom');
    expect(normaliseSaveAbility({ name: 'Charisma' })).toBe('charisma');
    expect(normaliseSaveAbility('Luck')).toBe('');
  });

  test('concentration uses the same rule', () => {
    expect(getConcentrationSaveModifier({ character_class: 'Sorcerer', constitution: 14 }, 3)).toBe(5);
    expect(getConcentrationSaveModifier({ character_class: 'Wizard', constitution: 14 }, 3)).toBe(2);
    expect(getConcentrationSaveModifier({ character_class: 'Wizard', constitution: 14, saving_throw_proficiencies: ['con save'] }, 3)).toBe(5);
  });
});

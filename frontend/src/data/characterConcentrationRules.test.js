import {
  getConcentrationName,
  getConcentrationSaveDc,
  getConcentrationSaveModifier,
  needsConcentrationReplacement,
} from './characterConcentrationRules';

describe('character concentration rules', () => {
  test('reads concentration names from legacy strings and spell objects', () => {
    expect(getConcentrationName('Bless')).toBe('Bless');
    expect(getConcentrationName({ name: 'Hex' })).toBe('Hex');
    expect(getConcentrationName({ spell_name: 'Fly' })).toBe('Fly');
  });

  test('uses the standard concentration save DC', () => {
    expect(getConcentrationSaveDc(1)).toBe(10);
    expect(getConcentrationSaveDc(20)).toBe(10);
    expect(getConcentrationSaveDc(22)).toBe(11);
    expect(getConcentrationSaveDc(50)).toBe(25);
  });

  test('adds Constitution save proficiency when present', () => {
    expect(getConcentrationSaveModifier({ constitution: 14 }, 3)).toBe(2);
    expect(getConcentrationSaveModifier({ constitution: 14, saving_throw_proficiencies: ['Constitution'] }, 3)).toBe(5);
    expect(getConcentrationSaveModifier({ constitution: 8, saving_throw_proficiencies: ['CON Save'] }, 4)).toBe(3);
  });

  test('only prompts when a different concentration spell would replace the current one', () => {
    expect(needsConcentrationReplacement('Bless', 'Bless')).toBe(false);
    expect(needsConcentrationReplacement('Bless', 'bless')).toBe(false);
    expect(needsConcentrationReplacement('Bless', 'Hex')).toBe(true);
    expect(needsConcentrationReplacement('', 'Hex')).toBe(false);
  });
});

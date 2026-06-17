import {
  getWizardClassLevel,
  getWizardClassLevelMap,
  hasWizardClassLevel,
  isWizardCharacter,
  normaliseWizardClassName,
} from './wizardCharacterShape';

describe('Wizard character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseWizardClassName('Wizard')).toBe('wizard');
    expect(normaliseWizardClassName(' wizard ')).toBe('wizard');
    expect(normaliseWizardClassName('Wizard / School')).toBe('wizard_school');
  });

  test('detects direct Wizard class fields', () => {
    expect(isWizardCharacter({ character_class: 'Wizard', level: 4 })).toBe(true);
    expect(isWizardCharacter({ className: 'Wizard', level: 4 })).toBe(true);
    expect(isWizardCharacter({ class: 'Wizard', level: 4 })).toBe(true);
    expect(getWizardClassLevel({ character_class: 'Wizard', level: 4 })).toBe(4);
  });

  test('detects explicit Wizard level fields', () => {
    expect(isWizardCharacter({ wizard_level: 6 })).toBe(true);
    expect(isWizardCharacter({ wizardLevel: 7 })).toBe(true);
    expect(getWizardClassLevel({ wizard_level: 6 })).toBe(6);
    expect(getWizardClassLevel({ wizardLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, wizard: 5 } };

    expect(getWizardClassLevelMap(character)).toEqual({ Fighter: 2, wizard: 5 });
    expect(isWizardCharacter(character)).toBe(true);
    expect(getWizardClassLevel(character)).toBe(5);
    expect(hasWizardClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Wizard ': 3, Rogue: 2 } };

    expect(isWizardCharacter(character)).toBe(true);
    expect(getWizardClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Wizard', class_level: 4 },
      ],
    };

    expect(isWizardCharacter(character)).toBe(true);
    expect(getWizardClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Wizard characters', () => {
    expect(getWizardClassLevel({ character_class: 'Wizard', level: 9 })).toBe(9);
    expect(getWizardClassLevel({ character_class: 'Wizard' })).toBe(1);
  });

  test('returns false and zero for non-Wizard characters', () => {
    expect(isWizardCharacter({ character_class: 'Druid', level: 8 })).toBe(false);
    expect(getWizardClassLevel({ character_class: 'Druid', level: 8 })).toBe(0);
    expect(hasWizardClassLevel({ character_class: 'Druid', level: 8 })).toBe(false);
  });
});

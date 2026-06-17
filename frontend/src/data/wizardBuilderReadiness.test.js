import {
  getWizardBuilderOptions,
  getWizardBuilderSelectionList,
  validateWizardBuilderSelections,
} from './wizardBuilderOptions';
import { getWizardBuilderChoiceSummary } from './wizardBuilderChoiceSummary';
import { getWizardBuilderReadiness } from './wizardBuilderReadiness';

describe('Wizard builder options and readiness', () => {
  test('returns 2014 builder options with school required at level 2', () => {
    expect(getWizardBuilderOptions({ level: 1, edition: '2014' })).toMatchObject({
      className: 'Wizard',
      edition: '2014',
      level: 1,
      subclassChoiceLevel: 2,
      subclassRequired: false,
      scholarRequired: false,
      spellbookSupported: true,
      preparedSpellsSupported: true,
    });

    const levelTwoOptions = getWizardBuilderOptions({ level: 2, edition: '2014' });
    expect(levelTwoOptions.subclassRequired).toBe(true);
    expect(levelTwoOptions.subclassOptions.map(option => option.key)).toContain('evocation');
    expect(levelTwoOptions.scholarOptions).toEqual([]);
  });

  test('returns 2024 builder options with Scholar and school choices', () => {
    const levelTwo = getWizardBuilderOptions({ level: 2, edition: '2024' });
    expect(levelTwo).toMatchObject({
      edition: '2024',
      subclassChoiceLevel: 3,
      subclassRequired: false,
      scholarRequired: true,
    });
    expect(levelTwo.scholarOptions.map(option => option.key)).toEqual(expect.arrayContaining(['arcana', 'history', 'investigation']));

    const levelThree = getWizardBuilderOptions({ level: 3, edition: '2024' });
    expect(levelThree.subclassRequired).toBe(true);
    expect(levelThree.subclassOptions.map(option => option.key)).toEqual(expect.arrayContaining(['abjuration', 'divination', 'evocation', 'illusion']));
  });

  test('validates required 2014 school choice', () => {
    expect(validateWizardBuilderSelections({ level: 1, edition: '2014' })).toMatchObject({
      ready: true,
      errors: [],
    });

    expect(validateWizardBuilderSelections({ level: 2, edition: '2014' })).toMatchObject({
      ready: false,
      errors: ['Choose a Wizard school.'],
    });

    expect(validateWizardBuilderSelections({ level: 2, edition: '2014', subclass: 'School of Evocation' })).toMatchObject({
      ready: true,
      errors: [],
    });
  });

  test('validates required 2024 staged choices', () => {
    const missing = validateWizardBuilderSelections({ level: 3, edition: '2024' });

    expect(missing.ready).toBe(false);
    expect(missing.errors).toEqual(expect.arrayContaining([
      'Choose a Wizard school.',
      'Choose a Scholar skill.',
    ]));

    expect(validateWizardBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'School of Illusion',
      scholarSkill: 'Arcana',
    })).toMatchObject({
      ready: true,
      errors: [],
    });
  });

  test('rejects options not available in the chosen ruleset', () => {
    expect(validateWizardBuilderSelections({ level: 3, edition: '2024', subclass: 'School of Necromancy', scholarSkill: 'Arcana' }).errors)
      .toContain('Choose a Wizard school available in this ruleset.');
    expect(validateWizardBuilderSelections({ level: 2, edition: '2024', scholarSkill: 'Performance' }).errors)
      .toContain('Choose a valid Scholar skill.');
  });

  test('builds selected Wizard choice summaries', () => {
    const summary = getWizardBuilderChoiceSummary({
      level: 3,
      edition: '2024',
      selections: {
        subclass: 'School of Divination',
        scholarSkill: 'Investigation',
        spellbookSpells: ['Mage Hand', 'Detect Magic'],
        preparedSpells: ['Shield', 'Magic Missile'],
      },
    });

    expect(summary).toMatchObject({
      className: 'Wizard',
      edition: '2024',
      level: 3,
      requiredChoices: {
        subclass: true,
        scholarSkill: true,
      },
    });
    expect(summary.subclass.key).toBe('divination');
    expect(summary.scholarSkill.key).toBe('investigation');
    expect(summary.spellbookSpells).toEqual(['Mage Hand', 'Detect Magic']);
    expect(summary.preparedSpells).toEqual(['Shield', 'Magic Missile']);
  });

  test('normalises Wizard selection aliases', () => {
    expect(getWizardBuilderSelectionList({
      wizard_subclass: 'School of Abjuration',
      scholar_skill: 'History',
      spellbook_spells: 'Identify',
      prepared_spells: 'Shield',
    })).toEqual({
      subclass: 'School of Abjuration',
      scholarSkill: 'History',
      spellbookSpells: ['Identify'],
      preparedSpells: ['Shield'],
    });
  });

  test('returns readiness with validation and choice summary', () => {
    const readiness = getWizardBuilderReadiness({
      level: 3,
      edition: '2024',
      subclass: 'School of Evocation',
      scholarSkill: 'Arcana',
      spellbookSpells: ['Detect Magic'],
      preparedSpells: ['Shield'],
    });

    expect(readiness).toMatchObject({
      className: 'Wizard',
      edition: '2024',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(readiness.choiceSummary.subclass.key).toBe('evocation');
    expect(readiness.choiceSummary.scholarSkill.key).toBe('arcana');
    expect(readiness.choiceSummary.spellbookSpells).toEqual(['Detect Magic']);
    expect(readiness.choiceSummary.preparedSpells).toEqual(['Shield']);
  });
});

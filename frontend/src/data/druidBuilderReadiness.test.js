import {
  getDruidBuilderOptions,
  getDruidBuilderSelectionList,
  validateDruidBuilderSelections,
} from './druidBuilderOptions';
import { getDruidBuilderChoiceSummary } from './druidBuilderChoiceSummary';
import { getDruidBuilderReadiness } from './druidBuilderReadiness';

describe('Druid builder options and readiness', () => {
  test('returns 2014 builder options with subclass required at level 2', () => {
    expect(getDruidBuilderOptions({ level: 1, edition: '2014' })).toMatchObject({
      className: 'Druid',
      edition: '2014',
      level: 1,
      subclassChoiceLevel: 2,
      subclassRequired: false,
      primalOrderRequired: false,
      elementalFuryRequired: false,
      preparedSpellsSupported: true,
    });

    const levelTwoOptions = getDruidBuilderOptions({ level: 2, edition: '2014' });
    expect(levelTwoOptions.subclassRequired).toBe(true);
    expect(levelTwoOptions.subclassOptions.map(option => option.key)).toContain('moon');
    expect(levelTwoOptions.primalOrderOptions).toEqual([]);
    expect(levelTwoOptions.elementalFuryOptions).toEqual([]);
  });

  test('returns 2024 builder options with staged Druid choices', () => {
    const levelOne = getDruidBuilderOptions({ level: 1, edition: '2024' });
    expect(levelOne).toMatchObject({
      edition: '2024',
      subclassChoiceLevel: 3,
      subclassRequired: false,
      primalOrderRequired: true,
      elementalFuryRequired: false,
    });
    expect(levelOne.primalOrderOptions.map(option => option.key)).toEqual(expect.arrayContaining(['magician', 'warden']));

    const levelSeven = getDruidBuilderOptions({ level: 7, edition: '2024' });
    expect(levelSeven.subclassRequired).toBe(true);
    expect(levelSeven.elementalFuryRequired).toBe(true);
    expect(levelSeven.elementalFuryOptions.map(option => option.key)).toEqual(expect.arrayContaining(['potent_spellcasting', 'primal_strike']));
  });

  test('validates required 2014 subclass choice', () => {
    expect(validateDruidBuilderSelections({ level: 1, edition: '2014' })).toMatchObject({
      ready: true,
      errors: [],
    });

    expect(validateDruidBuilderSelections({ level: 2, edition: '2014' })).toMatchObject({
      ready: false,
      errors: ['Choose a Druid circle.'],
    });

    expect(validateDruidBuilderSelections({ level: 2, edition: '2014', subclass: 'Circle of the Moon' })).toMatchObject({
      ready: true,
      errors: [],
    });
  });

  test('validates required 2024 staged choices', () => {
    const missing = validateDruidBuilderSelections({ level: 7, edition: '2024' });

    expect(missing.ready).toBe(false);
    expect(missing.errors).toEqual(expect.arrayContaining([
      'Choose a Druid circle.',
      'Choose a Primal Order.',
      'Choose an Elemental Fury option.',
    ]));

    expect(validateDruidBuilderSelections({
      level: 7,
      edition: '2024',
      subclass: 'Circle of the Sea',
      primalOrder: 'Warden',
      elementalFury: 'Primal Strike',
    })).toMatchObject({
      ready: true,
      errors: [],
    });
  });

  test('rejects options not available in the chosen ruleset', () => {
    expect(validateDruidBuilderSelections({ level: 3, edition: '2024', subclass: 'Circle of Spores', primalOrder: 'Magician' }).errors)
      .toContain('Choose a Druid circle available in this ruleset.');
    expect(validateDruidBuilderSelections({ level: 1, edition: '2024', primalOrder: 'Guardian' }).errors)
      .toContain('Choose a valid Primal Order.');
    expect(validateDruidBuilderSelections({ level: 7, edition: '2024', subclass: 'Circle of the Land', primalOrder: 'Magician', elementalFury: 'Lightning' }).errors)
      .toContain('Choose a valid Elemental Fury option.');
  });

  test('builds selected Druid choice summaries', () => {
    const summary = getDruidBuilderChoiceSummary({
      level: 7,
      edition: '2024',
      selections: {
        subclass: 'Circle of Stars',
        primalOrder: 'Magician',
        elementalFury: 'Potent Spellcasting',
        preparedSpells: ['Entangle', 'Healing Word'],
      },
    });

    expect(summary).toMatchObject({
      className: 'Druid',
      edition: '2024',
      level: 7,
      requiredChoices: {
        subclass: true,
        primalOrder: true,
        elementalFury: true,
      },
    });
    expect(summary.subclass.key).toBe('stars');
    expect(summary.primalOrder.key).toBe('magician');
    expect(summary.elementalFury.key).toBe('potent_spellcasting');
    expect(summary.preparedSpells).toEqual(['Entangle', 'Healing Word']);
  });

  test('normalises Druid selection aliases', () => {
    expect(getDruidBuilderSelectionList({
      druid_subclass: 'Circle of the Land',
      primal_order: 'Warden',
      elemental_fury: 'Primal Strike',
      prepared_spells: 'Faerie Fire',
    })).toEqual({
      subclass: 'Circle of the Land',
      primalOrder: 'Warden',
      elementalFury: 'Primal Strike',
      preparedSpells: ['Faerie Fire'],
    });
  });

  test('returns readiness with validation and choice summary', () => {
    const readiness = getDruidBuilderReadiness({
      level: 7,
      edition: '2024',
      subclass: 'Circle of the Sea',
      primalOrder: 'Warden',
      elementalFury: 'Primal Strike',
      preparedSpells: ['Cure Wounds'],
    });

    expect(readiness).toMatchObject({
      className: 'Druid',
      edition: '2024',
      level: 7,
      ready: true,
      errors: [],
    });
    expect(readiness.choiceSummary.subclass.key).toBe('sea');
    expect(readiness.choiceSummary.primalOrder.key).toBe('warden');
    expect(readiness.choiceSummary.elementalFury.key).toBe('primal_strike');
    expect(readiness.choiceSummary.preparedSpells).toEqual(['Cure Wounds']);
  });
});

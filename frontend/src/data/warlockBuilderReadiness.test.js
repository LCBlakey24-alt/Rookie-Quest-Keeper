import {
  getWarlockBuilderOptions,
  getWarlockBuilderSelectionList,
  validateWarlockBuilderSelections,
} from './warlockBuilderOptions';
import { getWarlockBuilderChoiceSummary } from './warlockBuilderChoiceSummary';
import { getWarlockBuilderReadiness } from './warlockBuilderReadiness';

describe('Warlock builder options and readiness', () => {
  test('returns 2014 builder options with patron and pact timing', () => {
    const levelOne = getWarlockBuilderOptions({ level: 1, edition: '2014' });
    expect(levelOne).toMatchObject({
      className: 'Warlock',
      edition: '2014',
      level: 1,
      subclassChoiceLevel: 1,
      subclassRequired: true,
      pactBoonRequired: false,
      invocationCount: 0,
      invocationsRequired: false,
    });

    const levelThree = getWarlockBuilderOptions({ level: 3, edition: '2014' });
    expect(levelThree.pactBoonRequired).toBe(true);
    expect(levelThree.invocationCount).toBe(2);
    expect(levelThree.subclassOptions.map(option => option.key)).toContain('fiend');
  });

  test('returns 2024 builder options with staged choices', () => {
    const levelOne = getWarlockBuilderOptions({ level: 1, edition: '2024' });
    expect(levelOne).toMatchObject({
      edition: '2024',
      subclassChoiceLevel: 3,
      subclassRequired: false,
      pactBoonRequired: false,
      invocationCount: 1,
      invocationsRequired: true,
    });

    const levelThree = getWarlockBuilderOptions({ level: 3, edition: '2024' });
    expect(levelThree.subclassRequired).toBe(true);
    expect(levelThree.pactBoonRequired).toBe(true);
    expect(levelThree.subclassOptions.map(option => option.key)).toEqual(expect.arrayContaining(['archfey', 'fiend', 'great_old_one', 'celestial']));
  });

  test('validates required 2014 choices', () => {
    expect(validateWarlockBuilderSelections({ level: 1, edition: '2014' })).toMatchObject({
      ready: false,
      errors: ['Choose a Warlock patron.'],
    });

    expect(validateWarlockBuilderSelections({
      level: 3,
      edition: '2014',
      subclass: 'Fiend Patron',
      pactBoon: 'Pact of the Blade',
      invocations: ['Agonizing Blast', 'Eldritch Sight'],
    })).toMatchObject({
      ready: true,
      errors: [],
    });
  });

  test('validates required 2024 choices', () => {
    const missing = validateWarlockBuilderSelections({ level: 3, edition: '2024' });

    expect(missing.ready).toBe(false);
    expect(missing.errors).toEqual(expect.arrayContaining([
      'Choose a Warlock patron.',
      'Choose a Pact Boon.',
      'Choose 3 Eldritch Invocations.',
    ]));

    expect(validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Archfey Patron',
      pactBoon: 'Pact of the Chain',
      invocations: ['One', 'Two', 'Three'],
    })).toMatchObject({ ready: true, errors: [] });
  });

  test('rejects invalid selections', () => {
    const result = validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Genie Patron',
      pactBoon: 'Pact of the Spoon',
      invocations: ['One'],
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      'Choose a Warlock patron available in this ruleset.',
      'Choose a valid Pact Boon.',
      'Choose 3 Eldritch Invocations.',
    ]));
  });

  test('builds selected choice summaries', () => {
    const summary = getWarlockBuilderChoiceSummary({
      level: 3,
      edition: '2024',
      selections: {
        subclass: 'Great Old One Patron',
        pactBoon: 'Pact of the Tome',
        invocations: ['One', 'Two', 'Three'],
      },
    });

    expect(summary).toMatchObject({
      className: 'Warlock',
      edition: '2024',
      level: 3,
      invocationCount: 3,
      requiredChoices: {
        subclass: true,
        pactBoon: true,
        invocations: true,
      },
    });
    expect(summary.subclass.key).toBe('great_old_one');
    expect(summary.pactBoon.key).toBe('tome');
    expect(summary.invocations).toEqual(['One', 'Two', 'Three']);
  });

  test('normalises selection aliases', () => {
    expect(getWarlockBuilderSelectionList({
      warlock_subclass: 'Fiend Patron',
      pact_boon: 'Pact of the Blade',
      eldritch_invocations: 'Agonizing Blast',
    })).toEqual({
      subclass: 'Fiend Patron',
      pactBoon: 'Pact of the Blade',
      invocations: ['Agonizing Blast'],
    });
  });

  test('returns readiness with validation and choice summary', () => {
    const readiness = getWarlockBuilderReadiness({
      level: 3,
      edition: '2024',
      subclass: 'Celestial Patron',
      pactBoon: 'Pact of the Chain',
      invocations: ['One', 'Two', 'Three'],
    });

    expect(readiness).toMatchObject({
      className: 'Warlock',
      edition: '2024',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(readiness.choiceSummary.subclass.key).toBe('celestial');
    expect(readiness.choiceSummary.pactBoon.key).toBe('chain');
  });
});

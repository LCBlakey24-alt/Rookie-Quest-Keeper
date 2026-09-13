import {
  getWarlockBuilderOptions,
  getWarlockBuilderSelectionList,
  validateWarlockBuilderSelections,
} from './warlockBuilderOptions';
import { getWarlockBuilderChoiceSummary } from './warlockBuilderChoiceSummary';
import { getWarlockBuilderReadiness } from './warlockBuilderReadiness';

const VALID_2024_INVOCATIONS = ['Pact of the Chain', 'Eldritch Mind', 'Armor of Shadows'];

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

  test('returns 2024 builder options with pact options folded into invocations', () => {
    const levelOne = getWarlockBuilderOptions({ level: 1, edition: '2024' });
    expect(levelOne).toMatchObject({
      edition: '2024',
      subclassChoiceLevel: 3,
      subclassRequired: false,
      pactBoonRequired: false,
      invocationCount: 1,
      invocationsRequired: true,
    });
    expect(levelOne.eligibleInvocationOptions).toEqual(expect.arrayContaining(['Pact of the Blade', 'Pact of the Chain', 'Pact of the Tome']));

    const levelThree = getWarlockBuilderOptions({ level: 3, edition: '2024' });
    expect(levelThree.subclassRequired).toBe(true);
    expect(levelThree.pactBoonRequired).toBe(false);
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

  test('validates required 2024 choices without a separate Pact Boon field', () => {
    const missing = validateWarlockBuilderSelections({ level: 3, edition: '2024' });

    expect(missing.ready).toBe(false);
    expect(missing.errors).toEqual(expect.arrayContaining([
      'Choose a Warlock patron.',
      'Choose 3 Eldritch Invocations.',
    ]));
    expect(missing.errors).not.toContain('Choose a Pact Boon.');

    expect(validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Archfey Patron',
      invocations: VALID_2024_INVOCATIONS,
    })).toMatchObject({ ready: true, errors: [] });
  });

  test('rejects invalid 2024 selections', () => {
    const result = validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Genie Patron',
      pactBoon: 'Pact of the Spoon',
      invocations: ['Pact of the Chain'],
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      'Choose a Warlock patron available in this ruleset.',
      'Choose 3 Eldritch Invocations.',
    ]));
    expect(result.errors).not.toContain('Choose a valid Pact Boon.');
  });

  test('rejects too many or duplicate invocations', () => {
    const tooMany = validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Archfey Patron',
      invocations: [...VALID_2024_INVOCATIONS, 'Agonizing Blast'],
    });
    expect(tooMany.errors).toContain('Choose only 3 Eldritch Invocations.');

    const duplicate = validateWarlockBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Archfey Patron',
      invocations: ['Agonizing Blast', 'agonizing   blast', 'Eldritch Mind'],
    });
    expect(duplicate.errors).toContain('Choose each Eldritch Invocation only once.');
  });

  test('builds selected choice summaries', () => {
    const summary = getWarlockBuilderChoiceSummary({
      level: 3,
      edition: '2024',
      selections: {
        subclass: 'Great Old One Patron',
        invocations: VALID_2024_INVOCATIONS,
      },
    });

    expect(summary).toMatchObject({
      className: 'Warlock',
      edition: '2024',
      level: 3,
      pactBoon: null,
      invocationCount: 3,
      requiredChoices: {
        subclass: true,
        pactBoon: false,
        invocations: true,
      },
    });
    expect(summary.subclass.key).toBe('great_old_one');
    expect(summary.invocations).toEqual(VALID_2024_INVOCATIONS);
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
      invocations: VALID_2024_INVOCATIONS,
    });

    expect(readiness).toMatchObject({
      className: 'Warlock',
      edition: '2024',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(readiness.choiceSummary.subclass.key).toBe('celestial');
    expect(readiness.choiceSummary.pactBoon).toBeNull();
  });
});
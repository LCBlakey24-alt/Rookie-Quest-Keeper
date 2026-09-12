import { validateHigherLevelCharacterCreation } from './startingLevelRequestValidation';

describe('higher-level character creation readiness', () => {
  test('level 1 characters are not subjected to the higher-level guard', () => {
    expect(validateHigherLevelCharacterCreation({
      payload: { creation_mode: 'full', level: 1, character_class: 'Fighter' },
    })).toEqual({ ready: true, blockers: [] });
  });

  test('a level 4 fighter requires both the ASI choice and the higher-level class choice', () => {
    const result = validateHigherLevelCharacterCreation({
      payload: {
        creation_mode: 'full',
        level: 4,
        character_class: 'Fighter',
        subclass: 'Champion',
        edition: '2014',
      },
      levelChoices: {},
      detailChoices: { classSpecific: {} },
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      'Choose the level 4 ASI or feat.',
      'Choose 1 more fighting style.',
    ]));
  });

  test('the same fighter is ready once the required choices are complete', () => {
    const result = validateHigherLevelCharacterCreation({
      payload: {
        creation_mode: 'full',
        level: 4,
        character_class: 'Fighter',
        subclass: 'Champion',
        edition: '2014',
      },
      levelChoices: {
        'asi-4': { mode: 'asi', abilityOne: 'strength', abilityTwo: 'constitution' },
      },
      detailChoices: {
        classSpecific: { fightingStyles: ['Defense'] },
      },
    });

    expect(result).toEqual({ ready: true, blockers: [] });
  });

  test('a higher-level warlock reports a missing pact boon', () => {
    const result = validateHigherLevelCharacterCreation({
      payload: {
        creation_mode: 'full',
        level: 3,
        character_class: 'Warlock',
        subclass: 'The Fiend',
        edition: '2014',
      },
      detailChoices: { warlock: { pactBoon: '', invocations: [] } },
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('Choose a Warlock Pact Boon.');
  });
});

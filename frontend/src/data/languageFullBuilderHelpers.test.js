import {
  buildFullBuilderLanguages,
  getBackgroundLanguageBudget,
  splitExistingLanguagesForBuilder,
  trimBackgroundLanguagesToBudget,
} from './languageFullBuilderHelpers';

describe('languageFullBuilderHelpers', () => {
  it('reads numeric background language budgets safely', () => {
    expect(getBackgroundLanguageBudget({ languages: 2 })).toBe(2);
    expect(getBackgroundLanguageBudget({ languages: '1' })).toBe(1);
    expect(getBackgroundLanguageBudget({ languages: undefined })).toBe(0);
    expect(getBackgroundLanguageBudget(null)).toBe(0);
  });

  it('merges fixed race languages, race choices, and background choices', () => {
    expect(buildFullBuilderLanguages({
      raceLanguages: ['Common', 'One of choice'],
      raceChosenLanguages: ['Draconic'],
      backgroundChosenLanguages: ['Elvish'],
    })).toEqual(['Common', 'Draconic', 'Elvish']);
  });

  it('deduplicates final language output', () => {
    expect(buildFullBuilderLanguages({
      raceLanguages: ['Common', 'Elvish'],
      raceChosenLanguages: ['Elvish'],
      backgroundChosenLanguages: ['Common', 'Dwarvish'],
    })).toEqual(['Common', 'Elvish', 'Dwarvish']);
  });

  it('preserves additional sheet languages when merging builder choices', () => {
    expect(buildFullBuilderLanguages({
      raceLanguages: ['Common', 'One of choice'],
      raceChosenLanguages: ['Draconic'],
      backgroundChosenLanguages: ['Elvish'],
      preservedLanguages: ['Thieves Cant'],
    })).toEqual(['Common', 'Draconic', 'Elvish', 'Thieves Cant']);
  });

  it('splits saved language values into race, background, and preserved groups for editing', () => {
    expect(splitExistingLanguagesForBuilder({
      savedLanguages: ['Common', 'Draconic', 'Elvish', 'Thieves Cant'],
      raceLanguages: ['Common', 'One of choice'],
      backgroundData: { languages: 1 },
    })).toEqual({
      raceChosenLanguages: ['Draconic'],
      backgroundChosenLanguages: ['Elvish'],
      preservedLanguages: ['Thieves Cant'],
    });
  });

  it('trims background language selections to the active background budget', () => {
    expect(trimBackgroundLanguagesToBudget(['Elvish', 'Dwarvish', 'Giant'], { languages: 2 }))
      .toEqual(['Elvish', 'Dwarvish']);
  });
});

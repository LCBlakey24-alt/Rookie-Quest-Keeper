import {
  buildFullBuilderLanguages,
  getBackgroundLanguageBudget,
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

  it('trims background language selections to the active background budget', () => {
    expect(trimBackgroundLanguagesToBudget(['Elvish', 'Dwarvish', 'Giant'], { languages: 2 }))
      .toEqual(['Elvish', 'Dwarvish']);
  });
});

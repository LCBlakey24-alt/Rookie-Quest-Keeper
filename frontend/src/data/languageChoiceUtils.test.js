import {
  buildBasicLanguages,
  countChoiceLanguages,
  getFixedLanguages,
  isChoiceLanguage,
  pickAutoLanguages,
} from './languageChoiceUtils';

describe('languageChoiceUtils', () => {
  it('detects choice-style language placeholders', () => {
    expect(isChoiceLanguage('One of choice')).toBe(true);
    expect(isChoiceLanguage('One additional language')).toBe(true);
    expect(isChoiceLanguage('Common')).toBe(false);
  });

  it('keeps fixed languages and removes placeholders', () => {
    expect(getFixedLanguages(['Common', 'One of choice', 'Draconic'])).toEqual(['Common', 'Draconic']);
  });

  it('counts language choice placeholders', () => {
    expect(countChoiceLanguages(['Common', 'One of choice', 'One additional language'])).toBe(2);
  });

  it('picks deterministic auto languages that are not already known', () => {
    expect(pickAutoLanguages(2, ['Common', 'Dwarvish'])).toEqual(['Elvish', 'Giant']);
  });

  it('builds complete basic build language lists', () => {
    expect(buildBasicLanguages({
      raceLanguages: ['Common', 'One of choice'],
      backgroundLanguageCount: 1,
    })).toEqual(['Common', 'Dwarvish', 'Elvish']);
  });
});

// Shared helpers for resolving origin language entries into concrete sheet values.

export const EXTRA_LANGUAGE_OPTIONS = [
  'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal',
  'Primordial', 'Sylvan', 'Undercommon'
];

export const isChoiceLanguage = (language) => {
  const text = String(language || '').toLowerCase();
  return text.includes('choice') || text.includes('additional');
};

export const getFixedLanguages = (languages = []) => (
  Array.isArray(languages) ? languages.filter(language => !isChoiceLanguage(language)) : []
);

export const countChoiceLanguages = (languages = []) => (
  Array.isArray(languages) ? languages.filter(isChoiceLanguage).length : 0
);

export const pickAutoLanguages = (count, existingLanguages = []) => {
  const alreadyKnown = new Set(existingLanguages);
  return EXTRA_LANGUAGE_OPTIONS
    .filter(language => !alreadyKnown.has(language))
    .slice(0, Math.max(0, Number(count) || 0));
};

export const buildBasicLanguages = ({ raceLanguages = [], backgroundLanguageCount = 0 } = {}) => {
  const fixedLanguages = getFixedLanguages(raceLanguages);
  const raceChoiceCount = countChoiceLanguages(raceLanguages);
  const raceAutoLanguages = pickAutoLanguages(raceChoiceCount, fixedLanguages);
  const backgroundAutoLanguages = pickAutoLanguages(
    backgroundLanguageCount,
    [...fixedLanguages, ...raceAutoLanguages]
  );

  return Array.from(new Set([
    ...fixedLanguages,
    ...raceAutoLanguages,
    ...backgroundAutoLanguages,
  ]));
};

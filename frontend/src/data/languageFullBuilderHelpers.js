// Helpers for the full character builder language flow.
// These keep CharacterBuilder.js wiring small by centralising background-language
// budget calculation and final language merging.
import { getFixedLanguages } from './languageChoiceUtils';

export const getBackgroundLanguageBudget = (backgroundData) => (
  Math.max(0, Number(backgroundData?.languages) || 0)
);

export const buildFullBuilderLanguages = ({
  raceLanguages = [],
  raceChosenLanguages = [],
  backgroundChosenLanguages = [],
} = {}) => (
  Array.from(new Set([
    ...getFixedLanguages(raceLanguages),
    ...raceChosenLanguages,
    ...backgroundChosenLanguages,
  ].filter(Boolean)))
);

export const trimBackgroundLanguagesToBudget = (selectedLanguages = [], backgroundData) => {
  const budget = getBackgroundLanguageBudget(backgroundData);
  return selectedLanguages.slice(0, budget);
};

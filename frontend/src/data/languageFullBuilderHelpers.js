// Helpers for the full character builder language flow.
// These keep CharacterBuilder.js wiring small by centralising background-language
// budget calculation and final language merging.
import { countChoiceLanguages, getFixedLanguages } from './languageChoiceUtils';

export const getBackgroundLanguageBudget = (backgroundData) => (
  Math.max(0, Number(backgroundData?.languages) || 0)
);

export const buildFullBuilderLanguages = ({
  raceLanguages = [],
  raceChosenLanguages = [],
  backgroundChosenLanguages = [],
  preservedLanguages = [],
} = {}) => (
  Array.from(new Set([
    ...getFixedLanguages(raceLanguages),
    ...raceChosenLanguages,
    ...backgroundChosenLanguages,
    ...preservedLanguages,
  ].filter(Boolean)))
);

export const splitExistingLanguagesForBuilder = ({
  savedLanguages = [],
  raceLanguages = [],
  backgroundData = null,
} = {}) => {
  const fixedLanguages = getFixedLanguages(raceLanguages);
  const raceChoiceBudget = countChoiceLanguages(raceLanguages);
  const backgroundChoiceBudget = getBackgroundLanguageBudget(backgroundData);
  const extraLanguages = Array.from(new Set(
    (Array.isArray(savedLanguages) ? savedLanguages : [])
      .filter(Boolean)
      .filter(language => !fixedLanguages.includes(language))
  ));

  return {
    raceChosenLanguages: extraLanguages.slice(0, raceChoiceBudget),
    backgroundChosenLanguages: extraLanguages.slice(raceChoiceBudget, raceChoiceBudget + backgroundChoiceBudget),
    preservedLanguages: extraLanguages.slice(raceChoiceBudget + backgroundChoiceBudget),
  };
};

export const trimBackgroundLanguagesToBudget = (selectedLanguages = [], backgroundData) => {
  const budget = getBackgroundLanguageBudget(backgroundData);
  return selectedLanguages.slice(0, budget);
};

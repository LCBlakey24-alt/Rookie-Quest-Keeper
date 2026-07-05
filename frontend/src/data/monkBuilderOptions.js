import { getMonkProgressionSummary } from './monkProgression';
import { getMonkSubclassByKey, getMonkSubclassOptions, isMonkSubclassAvailable } from './monkSubclasses';

function getCumulativeMonkChoices(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  const choicesByType = new Map();

  for (let currentLevel = 1; currentLevel <= monkLevel; currentLevel += 1) {
    const summary = getMonkProgressionSummary(currentLevel, edition);
    summary.currentLevelFeatures
      .filter(feature => feature.type === 'choice')
      .forEach(choice => choicesByType.set(choice.choiceType, choice));
  }

  return Array.from(choicesByType.values()).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function toChoiceLabel(choiceType = '') {
  return String(choiceType || '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildChoiceSummary(choice) {
  if (!choice) return null;
  const base = {
    key: choice.key,
    level: choice.level,
    name: choice.name,
    choiceType: choice.choiceType,
    label: toChoiceLabel(choice.choiceType),
    required: true,
  };

  if (choice.choiceType === 'subclass') {
    return { ...base, count: 1, helperText: 'Choose Open Hand for built-in public-license automation, or record a custom/user-added Monk subclass.' };
  }

  return { ...base, count: choice.choices || 1, helperText: `Choose ${choice.name}.` };
}

export function getMonkBuilderOptions(level = 1, edition = '2014') {
  const summary = getMonkProgressionSummary(level, edition);
  const choices = getCumulativeMonkChoices(summary.level, summary.edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');

  return {
    ...summary,
    choices,
    choiceSummaries,
    needsSubclass,
    subclassOptions: getMonkSubclassOptions(summary.edition),
    requiredChoiceLabels: choiceSummaries.map(choice => choice.label),
    helperText: choiceSummaries.map(choice => choice.helperText).join(' '),
  };
}

export function isValidMonkSubclass(value = '', edition = '2014') {
  return isMonkSubclassAvailable(value, edition);
}

export function getSelectedMonkSubclass(value = '', edition = '2014') {
  return getMonkSubclassByKey(value, edition);
}

export function validateMonkBuilderSelections({ level = 1, edition = '2014', subclass = '' } = {}) {
  const options = getMonkBuilderOptions(level, edition);
  const errors = [];

  if (options.needsSubclass && !isValidMonkSubclass(subclass, edition)) {
    errors.push('Choose or record a Monk subclass.');
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

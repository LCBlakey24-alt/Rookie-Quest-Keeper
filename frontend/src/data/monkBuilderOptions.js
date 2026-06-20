import { getMonkProgressionSummary } from './monkProgression';
import { getMonkSubclassKey, getMonkSubclassOptions } from './monkSubclasses';

export function getMonkBuilderOptions(level = 1, edition = '2014') {
  const summary = getMonkProgressionSummary(level, edition);
  const choices = summary.activeFeatures.filter(feature => feature.type === 'choice');
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  return { ...summary, choices, needsSubclass, subclassOptions: getMonkSubclassOptions(summary.edition), requiredChoiceLabels: choices.map(choice => choice.name), helperText: choices.map(choice => choice.choiceType === 'subclass' ? 'Choose a Monk subclass.' : `Choose ${choice.name}.`).join(' ') };
}

export function isValidMonkSubclass(value = '', edition = '2014') {
  const key = getMonkSubclassKey(value);
  return getMonkSubclassOptions(edition).some(option => option.key === key || getMonkSubclassKey(option.value) === key);
}

export function validateMonkBuilderSelections({ level = 1, edition = '2014', subclass = '' } = {}) {
  const options = getMonkBuilderOptions(level, edition);
  const errors = [];
  if (options.needsSubclass && !isValidMonkSubclass(subclass, edition)) errors.push('Choose a Monk subclass.');
  return { valid: errors.length === 0, errors, options };
}

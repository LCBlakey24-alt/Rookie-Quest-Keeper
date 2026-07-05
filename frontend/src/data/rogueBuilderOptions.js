import { getRogueProgressionSummary } from './rogueProgression';
import { getRogueSubclassOptions, getRogueSubclassKey } from './rogueSubclasses';

export function getRogueBuilderOptions(level = 1, edition = '2014') {
  const summary = getRogueProgressionSummary(level, edition);
  const choices = summary.activeFeatures.filter(feature => feature.type === 'choice');
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  const expertiseChoices = choices.filter(choice => choice.choiceType === 'expertise').reduce((count, choice) => count + (choice.choices || 0), 0);
  const weaponMasteryChoices = choices.filter(choice => choice.choiceType === 'weapon_mastery').reduce((count, choice) => Math.max(count, choice.choices || 0), 0);
  return { ...summary, choices, needsSubclass, expertiseChoices, weaponMasteryChoices, subclassOptions: getRogueSubclassOptions(summary.edition), requiredChoiceLabels: choices.map(choice => choice.name), helperText: choices.map(choice => choice.choiceType === 'subclass' ? 'Choose Thief for built-in public-license automation, or record a custom/user-added Rogue subclass.' : `Choose ${choice.name}.`).join(' ') };
}

export function isValidRogueSubclass(value = '', edition = '2014') {
  const key = getRogueSubclassKey(value);
  return getRogueSubclassOptions(edition).some(option => option.key === key || getRogueSubclassKey(option.value) === key);
}

export function validateRogueBuilderSelections({ level = 1, edition = '2014', subclass = '' } = {}) {
  const options = getRogueBuilderOptions(level, edition);
  const errors = [];
  if (options.needsSubclass && !isValidRogueSubclass(subclass, edition)) errors.push('Choose or record a Rogue subclass.');
  return { valid: errors.length === 0, errors, options };
}

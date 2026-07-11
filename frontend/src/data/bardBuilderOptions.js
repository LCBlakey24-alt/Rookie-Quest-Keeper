import { getBardProgressionSummary } from './bardProgression';
import { getBardSubclassByKey, getBardSubclassOptions, isBardSubclassAvailable } from './bardSubclasses';

function getCumulativeBardChoices(level = 1, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  const choices = [];

  for (let currentLevel = 1; currentLevel <= bardLevel; currentLevel += 1) {
    const summary = getBardProgressionSummary(currentLevel, edition);
    summary.currentLevelFeatures
      .filter(feature => feature.type === 'choice')
      .forEach(choice => choices.push(choice));
  }

  return choices.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
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
  const count = choice.choices || 1;
  const label = toChoiceLabel(choice.choiceType);
  const helperByType = {
    subclass: 'Choose College of Lore for built-in public-license automation, or record a custom/user-added Bard subclass.',
    expertise: `Choose ${count} Expertise skills.`,
    magical_secrets: `Choose ${count} Magical Secrets spells.`,
    asi_or_feat: 'Choose an Ability Score Improvement or feat.',
    epic_boon_or_asi: 'Choose an Epic Boon or Ability Score Improvement.',
  };

  return {
    key: choice.key,
    level: choice.level,
    name: choice.name,
    choiceType: choice.choiceType,
    label,
    count,
    required: true,
    helperText: helperByType[choice.choiceType] || `Choose ${choice.name}.`,
  };
}

export function getBardBuilderOptions(level = 1, edition = '2014', charismaModifier = 0) {
  const summary = getBardProgressionSummary(level, edition, charismaModifier);
  const choices = getCumulativeBardChoices(summary.level, summary.edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);

  return {
    ...summary,
    choices,
    choiceSummaries,
    needsSubclass: choices.some(choice => choice.choiceType === 'subclass'),
    needsExpertise: choices.some(choice => choice.choiceType === 'expertise'),
    needsMagicalSecrets: choices.some(choice => choice.choiceType === 'magical_secrets'),
    subclassOptions: getBardSubclassOptions(summary.edition),
    requiredChoiceLabels: choiceSummaries.map(choice => choice.label),
    helperText: choiceSummaries.map(choice => choice.helperText).join(' '),
  };
}

export function isValidBardSubclass(value = '', edition = '2014') {
  return isBardSubclassAvailable(value, edition);
}

export function getSelectedBardSubclass(value = '', edition = '2014') {
  return getBardSubclassByKey(value, edition);
}

function hasSelection(value, minimum = 1) {
  return Array.isArray(value) ? value.filter(Boolean).length >= minimum : Boolean(value);
}

function getRequiredChoiceCount(choices, choiceType) {
  return choices
    .filter(choice => choice.choiceType === choiceType)
    .reduce((total, choice) => total + (choice.choices || 1), 0);
}

export function validateBardBuilderSelections({
  level = 1,
  edition = '2014',
  charismaModifier = 0,
  subclass = '',
  expertise = [],
  magicalSecrets = [],
} = {}) {
  const options = getBardBuilderOptions(level, edition, charismaModifier);
  const errors = [];
  const expertiseRequired = getRequiredChoiceCount(options.choices, 'expertise');
  const magicalSecretsRequired = getRequiredChoiceCount(options.choices, 'magical_secrets');

  if (options.needsSubclass && !isValidBardSubclass(subclass, edition)) errors.push('Choose or record a Bard subclass.');
  if (expertiseRequired > 0 && !hasSelection(expertise, expertiseRequired)) errors.push(`Choose ${expertiseRequired} Expertise skills.`);
  if (magicalSecretsRequired > 0 && !hasSelection(magicalSecrets, magicalSecretsRequired)) errors.push(`Choose ${magicalSecretsRequired} Magical Secrets spells.`);

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

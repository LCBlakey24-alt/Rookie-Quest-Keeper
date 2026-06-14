import { getFighterChoicesForLevel, getFighterProgressionSummary } from './fighterProgression';
import { getFighterFightingStyles, isValidFighterFightingStyle } from './fighterFightingStyles';

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

  if (choice.choiceType === 'fighting_style') {
    return { ...base, helperText: 'Choose one Fighter Fighting Style for this ruleset.' };
  }
  if (choice.choiceType === 'weapon_mastery') {
    return { ...base, count: choice.choices || 0, helperText: `Choose ${choice.choices || 0} Weapon Mastery option${choice.choices === 1 ? '' : 's'}.` };
  }
  if (choice.choiceType === 'subclass') {
    return { ...base, helperText: 'Choose a Fighter subclass.' };
  }
  return { ...base, helperText: `Choose ${toChoiceLabel(choice.choiceType)}.` };
}

export function getFighterBuilderOptions(level = 1, edition = '2014') {
  const summary = getFighterProgressionSummary(level, edition);
  const choices = getFighterChoicesForLevel(level, edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);
  const needsFightingStyle = choices.some(choice => choice.choiceType === 'fighting_style');
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  const needsWeaponMastery = choices.find(choice => choice.choiceType === 'weapon_mastery') || null;
  const fightingStyles = getFighterFightingStyles(edition);

  return {
    edition: summary.edition,
    level: summary.level,
    attacksPerAction: summary.attacksPerAction,
    choices,
    choiceSummaries,
    requiredChoiceLabels: choiceSummaries.map(choice => choice.label),
    helperText: choiceSummaries.map(choice => choice.helperText).join(' '),
    needsFightingStyle,
    needsSubclass,
    weaponMasteryChoices: needsWeaponMastery?.choices || 0,
    fightingStyles,
    fightingStyleOptions: fightingStyles.map(style => ({
      value: style.name,
      label: style.name,
      key: style.key,
      description: style.description,
      ruleset: style.ruleset,
    })),
  };
}

export function validateFighterBuilderSelections({ level = 1, edition = '2014', fightingStyle = '', subclass = '', weaponMasteries = [] } = {}) {
  const options = getFighterBuilderOptions(level, edition);
  const errors = [];

  if (options.needsFightingStyle && !isValidFighterFightingStyle(fightingStyle, edition)) {
    errors.push('Choose a valid Fighter Fighting Style.');
  }

  if (options.needsSubclass && !subclass) {
    errors.push('Choose a Fighter subclass.');
  }

  if (options.weaponMasteryChoices > 0 && weaponMasteries.length !== options.weaponMasteryChoices) {
    errors.push(`Choose ${options.weaponMasteryChoices} Weapon Mastery option${options.weaponMasteryChoices === 1 ? '' : 's'}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

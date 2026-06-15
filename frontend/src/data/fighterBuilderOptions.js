import { getFighterChoicesForLevel, getFighterProgressionSummary } from './fighterProgression';
import { getFighterFightingStyles, isValidFighterFightingStyle } from './fighterFightingStyles';
import { getFighterWeaponMasteryOptions, isValidFighterWeaponMastery } from './fighterWeaponMasteryOptions';

export const FIGHTER_SUBCLASS_OPTIONS = [
  {
    value: 'Champion',
    label: 'Champion',
    key: 'champion',
    summary: 'Simple, reliable martial features with improved critical hits.',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Battle Master',
    label: 'Battle Master',
    key: 'battle_master',
    summary: 'Tactical maneuvers powered by superiority dice.',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Eldritch Knight',
    label: 'Eldritch Knight',
    key: 'eldritch_knight',
    summary: 'A weapon-focused Fighter with limited spellcasting support.',
    rulesets: ['2014', '2024'],
  },
];

function toChoiceLabel(choiceType = '') {
  return String(choiceType || '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normaliseSelection(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
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

export function getFighterSubclassOptions(edition = '2014') {
  const ruleset = String(edition).includes('2024') ? '2024' : '2014';
  return FIGHTER_SUBCLASS_OPTIONS
    .filter(option => option.rulesets.includes(ruleset))
    .map(option => ({
      value: option.value,
      label: option.label,
      key: option.key,
      summary: option.summary,
      ruleset,
    }));
}

export function isValidFighterSubclass(value = '', edition = '2014') {
  const selected = normaliseSelection(value);
  return getFighterSubclassOptions(edition).some(option => normaliseSelection(option.value) === selected || option.key === selected);
}

export function getFighterBuilderOptions(level = 1, edition = '2014') {
  const summary = getFighterProgressionSummary(level, edition);
  const choices = getFighterChoicesForLevel(level, edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);
  const needsFightingStyle = choices.some(choice => choice.choiceType === 'fighting_style');
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  const needsWeaponMastery = choices.find(choice => choice.choiceType === 'weapon_mastery') || null;
  const fightingStyles = getFighterFightingStyles(edition);
  const subclassOptions = getFighterSubclassOptions(summary.edition);
  const weaponMasteryOptions = getFighterWeaponMasteryOptions(summary.edition);

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
    subclassOptions,
    weaponMasteryOptions,
  };
}

export function validateFighterBuilderSelections({ level = 1, edition = '2014', fightingStyle = '', subclass = '', weaponMasteries = [] } = {}) {
  const options = getFighterBuilderOptions(level, edition);
  const errors = [];

  if (options.needsFightingStyle && !isValidFighterFightingStyle(fightingStyle, edition)) {
    errors.push('Choose a valid Fighter Fighting Style.');
  }

  if (options.needsSubclass && !isValidFighterSubclass(subclass, edition)) {
    errors.push('Choose a Fighter subclass.');
  }

  if (options.weaponMasteryChoices > 0 && weaponMasteries.length !== options.weaponMasteryChoices) {
    errors.push(`Choose ${options.weaponMasteryChoices} Weapon Mastery option${options.weaponMasteryChoices === 1 ? '' : 's'}.`);
  }

  if (options.weaponMasteryChoices > 0 && weaponMasteries.some(mastery => !isValidFighterWeaponMastery(mastery, edition))) {
    errors.push('Choose valid Weapon Mastery options.');
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

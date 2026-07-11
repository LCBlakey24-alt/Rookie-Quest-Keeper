import { getBarbarianChoicesForLevel, getBarbarianProgressionSummary } from './barbarianProgression';
import { getFighterWeaponMasteryOptions, isValidFighterWeaponMastery } from './fighterWeaponMasteryOptions';

export const BARBARIAN_SUBCLASS_OPTIONS = [
  {
    value: 'Path of the Berserker',
    label: 'Path of the Berserker',
    key: 'berserker',
    summary: 'Public-license Barbarian subclass support focused on direct rage-fuelled attacks.',
    rulesets: ['2014', '2024'],
    supportedAutomation: true,
  },
  {
    value: 'Path of the Wild Heart',
    label: 'Path of the Wild Heart',
    key: 'wild_heart',
    summary: 'Public-license 2024 Barbarian subclass support for primal animal aspects.',
    rulesets: ['2024'],
    supportedAutomation: true,
  },
  {
    value: 'Path of the World Tree',
    label: 'Path of the World Tree',
    key: 'world_tree',
    summary: 'Public-license 2024 Barbarian subclass support for protection and repositioning.',
    rulesets: ['2024'],
    supportedAutomation: true,
  },
  {
    value: 'Path of the Zealot',
    label: 'Path of the Zealot',
    key: 'zealot',
    summary: 'Public-license 2024 Barbarian subclass support for divine battle fervour.',
    rulesets: ['2024'],
    supportedAutomation: true,
  },
  {
    value: 'Custom Barbarian Subclass',
    label: 'Custom / user-added subclass',
    key: 'custom_barbarian_subclass',
    summary: 'Record your own Barbarian subclass or accepted homebrew without built-in app-provided automation.',
    rulesets: ['2014', '2024'],
    supportedAutomation: false,
    custom: true,
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

  if (choice.choiceType === 'subclass') {
    return { ...base, helperText: 'Choose a public-license Barbarian subclass, or record a custom/user-added Barbarian subclass.' };
  }
  if (choice.choiceType === 'weapon_mastery') {
    return { ...base, count: choice.choices || 0, helperText: `Choose ${choice.choices || 0} Weapon Mastery option${choice.choices === 1 ? '' : 's'}.` };
  }
  return { ...base, helperText: `Choose ${toChoiceLabel(choice.choiceType)}.` };
}

function getCumulativeBarbarianChoices(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  const choicesByType = new Map();

  for (let currentLevel = 1; currentLevel <= barbarianLevel; currentLevel += 1) {
    getBarbarianChoicesForLevel(currentLevel, edition).forEach(choice => {
      choicesByType.set(choice.choiceType, choice);
    });
  }

  return Array.from(choicesByType.values()).sort((a, b) => a.level - b.level);
}

export function getBarbarianSubclassOptions(edition = '2014') {
  const ruleset = String(edition).includes('2024') ? '2024' : '2014';
  return BARBARIAN_SUBCLASS_OPTIONS
    .filter(option => option.rulesets.includes(ruleset))
    .map(option => ({
      value: option.value,
      label: option.label,
      key: option.key,
      summary: option.summary,
      ruleset,
      supportedAutomation: option.supportedAutomation,
      custom: Boolean(option.custom),
    }));
}

export function isValidBarbarianSubclass(value = '', edition = '2014') {
  const selected = normaliseSelection(value);
  return getBarbarianSubclassOptions(edition).some(option => option.key === selected || normaliseSelection(option.value) === selected);
}

export function getBarbarianWeaponMasteryOptions(edition = '2024') {
  return getFighterWeaponMasteryOptions(edition);
}

export function isValidBarbarianWeaponMastery(value = '', edition = '2024') {
  return isValidFighterWeaponMastery(value, edition);
}

export function getBarbarianBuilderOptions(level = 1, edition = '2014') {
  const summary = getBarbarianProgressionSummary(level, edition);
  const choices = getCumulativeBarbarianChoices(summary.level, summary.edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  const weaponMasteryChoices = choices
    .filter(choice => choice.choiceType === 'weapon_mastery')
    .reduce((count, choice) => Math.max(count, choice.choices || 0), 0);
  const subclassOptions = getBarbarianSubclassOptions(summary.edition);
  const weaponMasteryOptions = getBarbarianWeaponMasteryOptions(summary.edition);

  return {
    edition: summary.edition,
    level: summary.level,
    rageUses: summary.rageUses,
    rageDamageBonus: summary.rageDamageBonus,
    brutalCriticalDice: summary.brutalCriticalDice,
    choices,
    choiceSummaries,
    requiredChoiceLabels: choiceSummaries.map(choice => choice.label),
    helperText: choiceSummaries.map(choice => choice.helperText).join(' '),
    needsSubclass,
    weaponMasteryChoices,
    subclassOptions,
    weaponMasteryOptions,
  };
}

export function validateBarbarianBuilderSelections({ level = 1, edition = '2014', subclass = '', weaponMasteries = [] } = {}) {
  const options = getBarbarianBuilderOptions(level, edition);
  const errors = [];

  if (options.needsSubclass && !isValidBarbarianSubclass(subclass, edition)) {
    errors.push('Choose or record a Barbarian subclass.');
  }

  if (options.weaponMasteryChoices > 0 && weaponMasteries.length !== options.weaponMasteryChoices) {
    errors.push(`Choose ${options.weaponMasteryChoices} Weapon Mastery option${options.weaponMasteryChoices === 1 ? '' : 's'}.`);
  }

  if (options.weaponMasteryChoices > 0 && weaponMasteries.some(mastery => !isValidBarbarianWeaponMastery(mastery, edition))) {
    errors.push('Choose valid Weapon Mastery options.');
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

// Shared class level rules for character creation / level-up validation.
// This keeps 2014 and 2024 timing differences in one place.

export const CLASS_NAMES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
];

export const SUBCLASS_UNLOCK_LEVELS_2014 = {
  Barbarian: 3,
  Bard: 3,
  Cleric: 1,
  Druid: 2,
  Fighter: 3,
  Monk: 3,
  Paladin: 3,
  Ranger: 3,
  Rogue: 3,
  Sorcerer: 1,
  Warlock: 1,
  Wizard: 2,
};

export const SUBCLASS_UNLOCK_LEVELS_2024 = {
  Barbarian: 3,
  Bard: 3,
  Cleric: 3,
  Druid: 3,
  Fighter: 3,
  Monk: 3,
  Paladin: 3,
  Ranger: 3,
  Rogue: 3,
  Sorcerer: 3,
  Warlock: 3,
  Wizard: 3,
};

export const DEFAULT_ASI_LEVELS = [4, 8, 12, 16, 19];

export const CLASS_ASI_LEVELS = {
  Barbarian: DEFAULT_ASI_LEVELS,
  Bard: DEFAULT_ASI_LEVELS,
  Cleric: DEFAULT_ASI_LEVELS,
  Druid: DEFAULT_ASI_LEVELS,
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Monk: DEFAULT_ASI_LEVELS,
  Paladin: DEFAULT_ASI_LEVELS,
  Ranger: DEFAULT_ASI_LEVELS,
  Rogue: [4, 8, 10, 12, 16, 19],
  Sorcerer: DEFAULT_ASI_LEVELS,
  Warlock: DEFAULT_ASI_LEVELS,
  Wizard: DEFAULT_ASI_LEVELS,
};

export const SPELLCASTING_START_LEVEL = {
  Bard: 1,
  Cleric: 1,
  Druid: 1,
  Sorcerer: 1,
  Warlock: 1,
  Wizard: 1,
  Paladin: 2,
  Ranger: 2,
};

export function getRulesEdition(value = '2014') {
  return String(value) === '2024' ? '2024' : '2014';
}

export function getSubclassUnlockLevel(className, edition = '2014') {
  const rules = getRulesEdition(edition) === '2024'
    ? SUBCLASS_UNLOCK_LEVELS_2024
    : SUBCLASS_UNLOCK_LEVELS_2014;
  return rules[className] || 3;
}

export function canChooseSubclassAtLevel(className, level, edition = '2014') {
  return Number(level || 1) >= getSubclassUnlockLevel(className, edition);
}

export function getAsiLevels(className) {
  return CLASS_ASI_LEVELS[className] || DEFAULT_ASI_LEVELS;
}

export function isAsiLevel(className, level) {
  return getAsiLevels(className).includes(Number(level));
}

export function getSpellcastingStartLevel(className) {
  return SPELLCASTING_START_LEVEL[className] || null;
}

export function isSpellcastingAvailableAtLevel(className, level) {
  const start = getSpellcastingStartLevel(className);
  return Boolean(start && Number(level || 1) >= start);
}

export function getRequiredLevelChoices({ className, level, edition = '2014' }) {
  const choices = [];
  const numericLevel = Number(level || 1);

  if (numericLevel === getSubclassUnlockLevel(className, edition)) {
    choices.push({ type: 'subclass', level: numericLevel, label: 'Subclass choice' });
  }

  if (isAsiLevel(className, numericLevel)) {
    choices.push({ type: 'asi_or_feat', level: numericLevel, label: 'Ability Score Improvement or feat' });
  }

  if (numericLevel === getSpellcastingStartLevel(className)) {
    choices.push({ type: 'spellcasting_start', level: numericLevel, label: 'Spellcasting begins' });
  }

  return choices;
}

export function getChoicesForStartingLevel({ className, startingLevel = 1, edition = '2014' }) {
  const level = Math.max(1, Math.min(20, Number(startingLevel || 1)));
  const choices = [];
  for (let current = 1; current <= level; current += 1) {
    choices.push(...getRequiredLevelChoices({ className, level: current, edition }));
  }
  return choices;
}

import { getRangerProgressionSummary } from './rangerProgression';
import { getRangerSubclassByKey, getRangerSubclassOptions, isRangerSubclassAvailable } from './rangerSubclasses';

function getCumulativeRangerChoices(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  const choices = [];

  for (let currentLevel = 1; currentLevel <= rangerLevel; currentLevel += 1) {
    const summary = getRangerProgressionSummary(currentLevel, edition);
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
    favored_enemy: 'Choose Favored Enemy.',
    favored_terrain: 'Choose Favored Terrain.',
    fighting_style: 'Choose a Fighting Style.',
    subclass: 'Choose a Ranger subclass.',
    weapon_mastery: 'Choose Ranger weapon masteries.',
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

export function getRangerBuilderOptions(level = 1, edition = '2014') {
  const summary = getRangerProgressionSummary(level, edition);
  const choices = getCumulativeRangerChoices(summary.level, summary.edition);
  const choiceSummaries = choices.map(buildChoiceSummary).filter(Boolean);

  return {
    ...summary,
    choices,
    choiceSummaries,
    needsSubclass: choices.some(choice => choice.choiceType === 'subclass'),
    needsFightingStyle: choices.some(choice => choice.choiceType === 'fighting_style'),
    needsFavoredEnemy: choices.some(choice => choice.choiceType === 'favored_enemy'),
    needsFavoredTerrain: choices.some(choice => choice.choiceType === 'favored_terrain'),
    needsWeaponMastery: choices.some(choice => choice.choiceType === 'weapon_mastery'),
    subclassOptions: getRangerSubclassOptions(summary.edition),
    requiredChoiceLabels: choiceSummaries.map(choice => choice.label),
    helperText: choiceSummaries.map(choice => choice.helperText).join(' '),
  };
}

export function isValidRangerSubclass(value = '', edition = '2014') {
  return isRangerSubclassAvailable(value, edition);
}

export function getSelectedRangerSubclass(value = '', edition = '2014') {
  return getRangerSubclassByKey(value, edition);
}

function hasSelection(value, minimum = 1) {
  return Array.isArray(value) ? value.length >= minimum : Boolean(value);
}

export function validateRangerBuilderSelections({
  level = 1,
  edition = '2014',
  subclass = '',
  fightingStyle = '',
  favoredEnemy = '',
  favoredTerrain = '',
  weaponMasteries = [],
} = {}) {
  const options = getRangerBuilderOptions(level, edition);
  const errors = [];

  if (options.needsFavoredEnemy && !hasSelection(favoredEnemy)) errors.push('Choose Favored Enemy.');
  if (options.needsFavoredTerrain && !hasSelection(favoredTerrain)) errors.push('Choose Favored Terrain.');
  if (options.needsWeaponMastery && !hasSelection(weaponMasteries, 2)) errors.push('Choose Ranger weapon masteries.');
  if (options.needsFightingStyle && !hasSelection(fightingStyle)) errors.push('Choose a Fighting Style.');
  if (options.needsSubclass && !isValidRangerSubclass(subclass, edition)) errors.push('Choose a Ranger subclass.');

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

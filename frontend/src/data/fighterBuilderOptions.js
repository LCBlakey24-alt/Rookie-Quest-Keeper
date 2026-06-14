import { getFighterChoicesForLevel, getFighterProgressionSummary } from './fighterProgression';
import { getFighterFightingStyles, isValidFighterFightingStyle } from './fighterFightingStyles';

export function getFighterBuilderOptions(level = 1, edition = '2014') {
  const summary = getFighterProgressionSummary(level, edition);
  const choices = getFighterChoicesForLevel(level, edition);
  const needsFightingStyle = choices.some(choice => choice.choiceType === 'fighting_style');
  const needsSubclass = choices.some(choice => choice.choiceType === 'subclass');
  const needsWeaponMastery = choices.find(choice => choice.choiceType === 'weapon_mastery') || null;

  return {
    edition: summary.edition,
    level: summary.level,
    attacksPerAction: summary.attacksPerAction,
    choices,
    needsFightingStyle,
    needsSubclass,
    weaponMasteryChoices: needsWeaponMastery?.choices || 0,
    fightingStyles: getFighterFightingStyles(edition),
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

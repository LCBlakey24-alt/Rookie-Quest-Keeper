import { getRangerBuilderOptions } from './rangerBuilderOptions';

export function getRangerBuilderChoiceSummary(level = 1, edition = '2014') {
  const options = getRangerBuilderOptions(level, edition);

  const sections = [
    {
      key: 'favoredEnemy',
      label: 'Favored Enemy',
      required: options.needsFavoredEnemy,
      count: options.needsFavoredEnemy ? 1 : 0,
      options: [],
    },
    {
      key: 'favoredTerrain',
      label: 'Favored Terrain',
      required: options.needsFavoredTerrain,
      count: options.needsFavoredTerrain ? 1 : 0,
      options: [],
    },
    {
      key: 'weaponMasteries',
      label: 'Weapon Mastery',
      required: options.needsWeaponMastery,
      count: options.needsWeaponMastery ? 2 : 0,
      options: [],
    },
    {
      key: 'fightingStyle',
      label: 'Fighting Style',
      required: options.needsFightingStyle,
      count: options.needsFightingStyle ? 1 : 0,
      options: [],
    },
    {
      key: 'subclass',
      label: 'Subclass',
      required: options.needsSubclass,
      count: options.needsSubclass ? 1 : 0,
      options: options.subclassOptions || [],
    },
  ].filter(section => section.required);

  return {
    edition: options.edition,
    level: options.level,
    requiredChoiceLabels: options.requiredChoiceLabels,
    helperText: options.helperText,
    sections,
    hasRequiredChoices: sections.length > 0,
  };
}

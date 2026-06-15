import { getFighterBuilderOptions } from './fighterBuilderOptions';

function hasOptions(options = []) {
  return Array.isArray(options) && options.length > 0;
}

export function getFighterBuilderChoiceSummary(level = 1, edition = '2014') {
  const options = getFighterBuilderOptions(level, edition);

  const sections = [
    {
      key: 'fighting_style',
      label: 'Fighting Style',
      required: options.needsFightingStyle,
      count: options.needsFightingStyle ? 1 : 0,
      options: options.fightingStyleOptions || [],
    },
    {
      key: 'subclass',
      label: 'Subclass',
      required: options.needsSubclass,
      count: options.needsSubclass ? 1 : 0,
      options: options.subclassOptions || [],
    },
    {
      key: 'weapon_mastery',
      label: 'Weapon Mastery',
      required: options.weaponMasteryChoices > 0,
      count: options.weaponMasteryChoices || 0,
      options: options.weaponMasteryOptions || [],
    },
  ].filter(section => section.required || hasOptions(section.options));

  return {
    edition: options.edition,
    level: options.level,
    requiredChoiceLabels: options.requiredChoiceLabels,
    helperText: options.helperText,
    sections,
    hasRequiredChoices: sections.some(section => section.required),
  };
}

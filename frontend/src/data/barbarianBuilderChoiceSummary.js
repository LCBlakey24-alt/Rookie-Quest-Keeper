import { getBarbarianBuilderOptions } from './barbarianBuilderOptions';

export function getBarbarianBuilderChoiceSummary(level = 1, edition = '2014') {
  const options = getBarbarianBuilderOptions(level, edition);

  const sections = [
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
  ].filter(section => section.required);

  return {
    edition: options.edition,
    level: options.level,
    requiredChoiceLabels: options.requiredChoiceLabels,
    helperText: options.helperText,
    sections,
    hasRequiredChoices: sections.some(section => section.required),
  };
}

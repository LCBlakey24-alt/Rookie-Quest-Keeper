import { getRogueBuilderOptions } from './rogueBuilderOptions';

export function getRogueBuilderChoiceSummary(level = 1, edition = '2014') {
  const options = getRogueBuilderOptions(level, edition);
  const sections = [
    { key: 'subclass', label: 'Subclass', required: options.needsSubclass, count: options.needsSubclass ? 1 : 0, options: options.subclassOptions },
    { key: 'expertise', label: 'Expertise', required: options.expertiseChoices > 0, count: options.expertiseChoices, options: [] },
    { key: 'weapon_mastery', label: 'Weapon Mastery', required: options.weaponMasteryChoices > 0, count: options.weaponMasteryChoices, options: [] },
  ].filter(section => section.required);
  return { edition: options.edition, level: options.level, requiredChoiceLabels: options.requiredChoiceLabels, helperText: options.helperText, sections, hasRequiredChoices: sections.length > 0 };
}

import { getMonkBuilderOptions } from './monkBuilderOptions';

export function getMonkBuilderChoiceSummary(level = 1, edition = '2014') {
  const options = getMonkBuilderOptions(level, edition);

  const sections = [
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

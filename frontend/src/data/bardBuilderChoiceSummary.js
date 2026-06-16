import { getBardBuilderOptions } from './bardBuilderOptions';

export function getBardBuilderChoiceSummary(level = 1, edition = '2014', charismaModifier = 0) {
  const options = getBardBuilderOptions(level, edition, charismaModifier);

  const expertiseCount = options.choices
    .filter(choice => choice.choiceType === 'expertise')
    .reduce((total, choice) => total + (choice.choices || 1), 0);

  const magicalSecretsCount = options.choices
    .filter(choice => choice.choiceType === 'magical_secrets')
    .reduce((total, choice) => total + (choice.choices || 1), 0);

  const sections = [
    {
      key: 'subclass',
      label: 'Subclass',
      required: options.needsSubclass,
      count: options.needsSubclass ? 1 : 0,
      options: options.subclassOptions || [],
    },
    {
      key: 'expertise',
      label: 'Expertise',
      required: expertiseCount > 0,
      count: expertiseCount,
      options: [],
    },
    {
      key: 'magicalSecrets',
      label: 'Magical Secrets',
      required: magicalSecretsCount > 0,
      count: magicalSecretsCount,
      options: [],
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

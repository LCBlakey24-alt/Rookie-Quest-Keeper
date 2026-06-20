import { getBardBuilderChoiceSummary } from './bardBuilderChoiceSummary';
import { validateBardBuilderSelections } from './bardBuilderOptions';

function selectedCount(value) {
  return Array.isArray(value) ? value.filter(Boolean).length : value ? 1 : 0;
}

function selectedCountsFromSelections(selections = {}) {
  return {
    subclass: selectedCount(selections.subclass),
    expertise: selectedCount(selections.expertise),
    magicalSecrets: selectedCount(selections.magicalSecrets),
  };
}

export function getBardBuilderReadiness({
  level = 1,
  edition = '2014',
  charismaModifier = 0,
  subclass = '',
  expertise = [],
  magicalSecrets = [],
} = {}) {
  const selections = { subclass, expertise, magicalSecrets };
  const choiceSummary = getBardBuilderChoiceSummary(level, edition, charismaModifier);
  const validation = validateBardBuilderSelections({ level, edition, charismaModifier, ...selections });
  const selected = selectedCountsFromSelections(selections);

  const missingSections = choiceSummary.sections
    .filter(section => section.required && selected[section.key] < section.count)
    .map(section => section.label);

  return {
    ready: validation.valid && missingSections.length === 0,
    errors: validation.errors,
    missingSections,
    choiceSummary,
  };
}

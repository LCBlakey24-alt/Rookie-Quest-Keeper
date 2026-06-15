import { getMonkBuilderChoiceSummary } from './monkBuilderChoiceSummary';
import { validateMonkBuilderSelections } from './monkBuilderOptions';

function selectedCount(value) {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

export function getMonkBuilderReadiness({ level = 1, edition = '2014', subclass = '' } = {}) {
  const choiceSummary = getMonkBuilderChoiceSummary(level, edition);
  const validation = validateMonkBuilderSelections({ level, edition, subclass });

  const selected = {
    subclass: selectedCount(subclass),
  };

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

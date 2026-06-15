import { getBarbarianBuilderChoiceSummary } from './barbarianBuilderChoiceSummary';
import { validateBarbarianBuilderSelections } from './barbarianBuilderOptions';

function selectedCount(value) {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

export function getBarbarianBuilderReadiness({ level = 1, edition = '2014', subclass = '', weaponMasteries = [] } = {}) {
  const choiceSummary = getBarbarianBuilderChoiceSummary(level, edition);
  const validation = validateBarbarianBuilderSelections({ level, edition, subclass, weaponMasteries });

  const selected = {
    subclass: selectedCount(subclass),
    weapon_mastery: selectedCount(weaponMasteries),
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

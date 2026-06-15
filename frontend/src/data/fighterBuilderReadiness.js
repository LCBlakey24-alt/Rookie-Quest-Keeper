import { getFighterBuilderChoiceSummary } from './fighterBuilderChoiceSummary';
import { validateFighterBuilderSelections } from './fighterBuilderOptions';

function selectedCount(value) {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

export function getFighterBuilderReadiness({ level = 1, edition = '2014', fightingStyle = '', subclass = '', weaponMasteries = [] } = {}) {
  const choiceSummary = getFighterBuilderChoiceSummary(level, edition);
  const validation = validateFighterBuilderSelections({ level, edition, fightingStyle, subclass, weaponMasteries });

  const selected = {
    fighting_style: selectedCount(fightingStyle),
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

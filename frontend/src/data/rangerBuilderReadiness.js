import { getRangerBuilderChoiceSummary } from './rangerBuilderChoiceSummary';
import { validateRangerBuilderSelections } from './rangerBuilderOptions';

function selectedCount(value) {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

function selectedCountsFromSelections(selections = {}) {
  return {
    favoredEnemy: selectedCount(selections.favoredEnemy),
    favoredTerrain: selectedCount(selections.favoredTerrain),
    weaponMasteries: selectedCount(selections.weaponMasteries),
    fightingStyle: selectedCount(selections.fightingStyle),
    subclass: selectedCount(selections.subclass),
  };
}

export function getRangerBuilderReadiness({
  level = 1,
  edition = '2014',
  subclass = '',
  fightingStyle = '',
  favoredEnemy = '',
  favoredTerrain = '',
  weaponMasteries = [],
} = {}) {
  const selections = { subclass, fightingStyle, favoredEnemy, favoredTerrain, weaponMasteries };
  const choiceSummary = getRangerBuilderChoiceSummary(level, edition);
  const validation = validateRangerBuilderSelections({ level, edition, ...selections });
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

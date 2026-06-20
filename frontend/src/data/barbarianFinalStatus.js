import { getBarbarianBuilderReadiness } from './barbarianBuilderReadiness';
import { getBarbarianSheetSummary } from './barbarianSheetSummary';

export function getBarbarianFinalStatus({ character = {}, level = character?.level || 1, edition = '2014', subclass = '', weaponMasteries = [] } = {}) {
  const readiness = getBarbarianBuilderReadiness({ level, edition, subclass, weaponMasteries });
  const sheetSummary = getBarbarianSheetSummary(character);

  return {
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary,
  };
}

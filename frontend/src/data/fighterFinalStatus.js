import { getFighterBuilderReadiness } from './fighterBuilderReadiness';
import { getFighterSheetSummary } from './fighterSheetSummary';

export function getFighterFinalStatus({ character = {}, level = character?.level || 1, edition = '2014', fightingStyle = '', subclass = '', weaponMasteries = [] } = {}) {
  const readiness = getFighterBuilderReadiness({ level, edition, fightingStyle, subclass, weaponMasteries });
  const sheetSummary = getFighterSheetSummary(character);

  return {
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary,
  };
}

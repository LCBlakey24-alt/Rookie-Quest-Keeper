import { getMonkBuilderReadiness } from './monkBuilderReadiness';
import { getMonkSheetSummary } from './monkSheetSummary';

export function getMonkFinalStatus({ character = {}, level = character?.level || 1, edition = '2014', subclass = '' } = {}) {
  const readiness = getMonkBuilderReadiness({ level, edition, subclass });
  return { ready: readiness.ready, missingSections: readiness.missingSections, errors: readiness.errors, choiceSummary: readiness.choiceSummary, sheetSummary: getMonkSheetSummary(character) };
}

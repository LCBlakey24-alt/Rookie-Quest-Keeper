import { getRogueBuilderReadiness } from './rogueBuilderReadiness';
import { getRogueSheetSummary } from './rogueSheetSummary';

export function getRogueFinalStatus({ character = {}, level = character?.level || 1, edition = '2014', subclass = '' } = {}) {
  const readiness = getRogueBuilderReadiness({ level, edition, subclass });
  return { ready: readiness.ready, missingSections: readiness.missingSections, errors: readiness.errors, choiceSummary: readiness.choiceSummary, sheetSummary: getRogueSheetSummary(character) };
}

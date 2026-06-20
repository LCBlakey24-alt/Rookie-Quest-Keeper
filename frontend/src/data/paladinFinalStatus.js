import { getPaladinBuilderReadiness } from './paladinBuilderReadiness';
import { getPaladinSheetSummary } from './paladinSheetSummary';
export function getPaladinFinalStatus({character={},level=character?.level||1,edition='2014',subclass='',fightingStyle=''}={}){const readiness=getPaladinBuilderReadiness({level,edition,subclass,fightingStyle}); return {ready:readiness.ready,missingSections:readiness.missingSections,errors:readiness.errors,choiceSummary:readiness.choiceSummary,sheetSummary:getPaladinSheetSummary(character)};}

import { getWarlockBuilderReadiness } from './warlockBuilderReadiness';
import { getWarlockClassLevel } from './warlockCharacterShape';
import { getWarlockSheetSummary } from './warlockSheetSummary';

export function getWarlockFinalStatus({
  character = {},
  level = null,
  edition = character?.rules_edition || character?.ruleset_id || '2014',
  subclass = character?.subclass || character?.warlock_subclass || character?.warlockSubclass || character?.patron || character?.warlockPatron || '',
  pactBoon = character?.pactBoon || character?.pact_boon || '',
  invocations = character?.invocations || character?.eldritchInvocations || character?.eldritch_invocations || [],
} = {}) {
  const warlockLevel = level || getWarlockClassLevel(character) || 1;
  const readiness = getWarlockBuilderReadiness({
    level: warlockLevel,
    edition,
    subclass,
    pactBoon,
    invocations,
  });

  return {
    className: 'Warlock',
    edition: readiness.edition,
    level: readiness.level,
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getWarlockSheetSummary(character),
  };
}

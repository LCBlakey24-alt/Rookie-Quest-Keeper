import { getClericBuilderReadiness } from './clericBuilderReadiness';
import { getClericSheetSummary } from './clericSheetSummary';

export function getClericFinalStatus({
  character = {},
  level = character?.level || 1,
  edition = character?.rules_edition || '2014',
  subclass = character?.subclass || character?.cleric_subclass || character?.clericSubclass || '',
  divineOrder = character?.divineOrder || character?.divine_order || '',
  blessedStrikes = character?.blessedStrikes || character?.blessed_strikes || '',
  preparedSpells = character?.preparedSpells || character?.prepared_spells || [],
} = {}) {
  const readiness = getClericBuilderReadiness({
    level,
    edition,
    subclass,
    divineOrder,
    blessedStrikes,
    preparedSpells,
  });

  return {
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getClericSheetSummary(character),
  };
}

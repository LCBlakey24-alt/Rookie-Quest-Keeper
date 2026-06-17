import { getClericBuilderReadiness } from './clericBuilderReadiness';
import { getClericClassLevel } from './clericCharacterShape';
import { getClericSheetSummary } from './clericSheetSummary';

export function getClericFinalStatus({
  character = {},
  level = null,
  edition = character?.rules_edition || character?.ruleset_id || '2014',
  subclass = character?.subclass || character?.cleric_subclass || character?.clericSubclass || '',
  divineOrder = character?.divineOrder || character?.divine_order || '',
  blessedStrikes = character?.blessedStrikes || character?.blessed_strikes || '',
  preparedSpells = character?.preparedSpells || character?.prepared_spells || [],
} = {}) {
  const clericLevel = level || getClericClassLevel(character) || 1;
  const readiness = getClericBuilderReadiness({
    level: clericLevel,
    edition,
    subclass,
    divineOrder,
    blessedStrikes,
    preparedSpells,
  });

  return {
    className: 'Cleric',
    edition: readiness.edition,
    level: readiness.level,
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getClericSheetSummary(character),
  };
}

import { getDruidBuilderReadiness } from './druidBuilderReadiness';
import { getDruidClassLevel } from './druidCharacterShape';
import { getDruidSheetSummary } from './druidSheetSummary';

export function getDruidFinalStatus({
  character = {},
  level = null,
  edition = character?.rules_edition || character?.ruleset_id || '2014',
  subclass = character?.subclass || character?.druid_subclass || character?.druidSubclass || character?.circle || character?.druidCircle || '',
  primalOrder = character?.primalOrder || character?.primal_order || '',
  elementalFury = character?.elementalFury || character?.elemental_fury || '',
  preparedSpells = character?.preparedSpells || character?.prepared_spells || [],
} = {}) {
  const druidLevel = level || getDruidClassLevel(character) || 1;
  const readiness = getDruidBuilderReadiness({
    level: druidLevel,
    edition,
    subclass,
    primalOrder,
    elementalFury,
    preparedSpells,
  });

  return {
    className: 'Druid',
    edition: readiness.edition,
    level: readiness.level,
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getDruidSheetSummary(character),
  };
}

import { getSorcererBuilderReadiness } from './sorcererBuilderReadiness';
import { getSorcererClassLevel } from './sorcererCharacterShape';
import { getSorcererSheetSummary } from './sorcererSheetSummary';

export function getSorcererFinalStatus({
  character = {},
  level = null,
  edition = character?.rules_edition || character?.ruleset_id || '2014',
  subclass = character?.subclass || character?.sorcerer_subclass || character?.sorcererSubclass || character?.origin || character?.sorcerousOrigin || '',
  metamagic = character?.metamagic || character?.metamagicOptions || character?.metamagic_options || [],
} = {}) {
  const sorcererLevel = level || getSorcererClassLevel(character) || 1;
  const readiness = getSorcererBuilderReadiness({
    level: sorcererLevel,
    edition,
    subclass,
    metamagic,
  });

  return {
    className: 'Sorcerer',
    edition: readiness.edition,
    level: readiness.level,
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getSorcererSheetSummary(character),
  };
}

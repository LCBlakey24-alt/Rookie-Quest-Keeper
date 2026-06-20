import { getRangerBuilderReadiness } from './rangerBuilderReadiness';
import { getRangerSheetSummary } from './rangerSheetSummary';

export function getRangerFinalStatus({
  character = {},
  level = character?.level || 1,
  edition = character?.rules_edition || '2014',
  subclass = character?.subclass || character?.ranger_subclass || character?.rangerSubclass || '',
  fightingStyle = character?.fightingStyle || character?.fighting_style || '',
  favoredEnemy = character?.favoredEnemy || character?.favored_enemy || '',
  favoredTerrain = character?.favoredTerrain || character?.favored_terrain || '',
  weaponMasteries = character?.weaponMasteries || character?.weapon_masteries || [],
} = {}) {
  const readiness = getRangerBuilderReadiness({
    level,
    edition,
    subclass,
    fightingStyle,
    favoredEnemy,
    favoredTerrain,
    weaponMasteries,
  });

  return {
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getRangerSheetSummary(character),
  };
}

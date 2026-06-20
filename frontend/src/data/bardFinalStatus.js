import { getBardBuilderReadiness } from './bardBuilderReadiness';
import { getBardSheetSummary } from './bardSheetSummary';

export function getBardFinalStatus({
  character = {},
  level = character?.level || 1,
  edition = character?.rules_edition || '2014',
  charismaModifier = character?.charismaModifier || character?.charisma_modifier || character?.cha_mod || character?.chaMod || 0,
  subclass = character?.subclass || character?.bard_subclass || character?.bardSubclass || '',
  expertise = character?.expertise || character?.expertise_skills || [],
  magicalSecrets = character?.magicalSecrets || character?.magical_secrets || [],
} = {}) {
  const readiness = getBardBuilderReadiness({
    level,
    edition,
    charismaModifier,
    subclass,
    expertise,
    magicalSecrets,
  });

  return {
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getBardSheetSummary(character),
  };
}

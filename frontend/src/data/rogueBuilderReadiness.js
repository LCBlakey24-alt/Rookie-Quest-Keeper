import { getRogueBuilderChoiceSummary } from './rogueBuilderChoiceSummary';
import { validateRogueBuilderSelections } from './rogueBuilderOptions';

export function getRogueBuilderReadiness({ level = 1, edition = '2014', subclass = '' } = {}) {
  const choiceSummary = getRogueBuilderChoiceSummary(level, edition);
  const validation = validateRogueBuilderSelections({ level, edition, subclass });
  return { ready: validation.valid, errors: validation.errors, missingSections: validation.valid ? [] : ['Subclass'], choiceSummary };
}

import { getMonkBuilderChoiceSummary } from './monkBuilderChoiceSummary';
import { validateMonkBuilderSelections } from './monkBuilderOptions';

export function getMonkBuilderReadiness({ level = 1, edition = '2014', subclass = '' } = {}) {
  const choiceSummary = getMonkBuilderChoiceSummary(level, edition);
  const validation = validateMonkBuilderSelections({ level, edition, subclass });
  return { ready: validation.valid, errors: validation.errors, missingSections: validation.valid ? [] : ['Subclass'], choiceSummary };
}

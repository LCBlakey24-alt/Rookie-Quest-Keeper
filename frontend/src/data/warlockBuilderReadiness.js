import { validateWarlockBuilderSelections } from './warlockBuilderOptions';
import { getWarlockBuilderChoiceSummary } from './warlockBuilderChoiceSummary';

export function getWarlockBuilderReadiness({ level = 1, edition = '2014', subclass = '', pactBoon = '', invocations = [] } = {}) {
  const validation = validateWarlockBuilderSelections({ level, edition, subclass, pactBoon, invocations });
  const choiceSummary = getWarlockBuilderChoiceSummary({
    level,
    edition,
    selections: { subclass, pactBoon, invocations },
  });

  return {
    className: 'Warlock',
    edition: validation.options.edition,
    level: validation.options.level,
    ready: validation.ready,
    missingSections: validation.missingSections,
    errors: validation.errors,
    options: validation.options,
    choiceSummary,
  };
}

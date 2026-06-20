import { validateSorcererBuilderSelections } from './sorcererBuilderOptions';
import { getSorcererBuilderChoiceSummary } from './sorcererBuilderChoiceSummary';

export function getSorcererBuilderReadiness({ level = 1, edition = '2014', subclass = '', metamagic = [] } = {}) {
  const validation = validateSorcererBuilderSelections({ level, edition, subclass, metamagic });
  const choiceSummary = getSorcererBuilderChoiceSummary({
    level,
    edition,
    selections: { subclass, metamagic },
  });

  return {
    className: 'Sorcerer',
    edition: validation.options.edition,
    level: validation.options.level,
    ready: validation.ready,
    missingSections: validation.missingSections,
    errors: validation.errors,
    options: validation.options,
    choiceSummary,
  };
}

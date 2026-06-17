import { validateClericBuilderSelections } from './clericBuilderOptions';
import { getClericBuilderChoiceSummary } from './clericBuilderChoiceSummary';

export function getClericBuilderReadiness({
  level = 1,
  edition = '2014',
  subclass = '',
  divineOrder = '',
  blessedStrikes = '',
  preparedSpells = [],
} = {}) {
  const validation = validateClericBuilderSelections({
    level,
    edition,
    subclass,
    divineOrder,
    blessedStrikes,
  });

  const choiceSummary = getClericBuilderChoiceSummary({
    level,
    edition,
    selections: {
      subclass,
      divineOrder,
      blessedStrikes,
      preparedSpells,
    },
  });

  return {
    className: 'Cleric',
    edition: validation.options.edition,
    level: validation.options.level,
    ready: validation.ready,
    missingSections: validation.missingSections,
    errors: validation.errors,
    options: validation.options,
    choiceSummary,
  };
}

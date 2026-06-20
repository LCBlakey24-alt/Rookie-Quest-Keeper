import { validateDruidBuilderSelections } from './druidBuilderOptions';
import { getDruidBuilderChoiceSummary } from './druidBuilderChoiceSummary';

export function getDruidBuilderReadiness({
  level = 1,
  edition = '2014',
  subclass = '',
  primalOrder = '',
  elementalFury = '',
  preparedSpells = [],
} = {}) {
  const validation = validateDruidBuilderSelections({
    level,
    edition,
    subclass,
    primalOrder,
    elementalFury,
  });

  const choiceSummary = getDruidBuilderChoiceSummary({
    level,
    edition,
    selections: {
      subclass,
      primalOrder,
      elementalFury,
      preparedSpells,
    },
  });

  return {
    className: 'Druid',
    edition: validation.options.edition,
    level: validation.options.level,
    ready: validation.ready,
    missingSections: validation.missingSections,
    errors: validation.errors,
    options: validation.options,
    choiceSummary,
  };
}

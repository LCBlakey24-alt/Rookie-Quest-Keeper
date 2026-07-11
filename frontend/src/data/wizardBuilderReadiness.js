import { validateWizardBuilderSelections } from './wizardBuilderOptions';
import { getWizardBuilderChoiceSummary } from './wizardBuilderChoiceSummary';

export function getWizardBuilderReadiness({
  level = 1,
  edition = '2014',
  subclass = '',
  scholarSkill = '',
  spellbookSpells = [],
  preparedSpells = [],
} = {}) {
  const validation = validateWizardBuilderSelections({
    level,
    edition,
    subclass,
    scholarSkill,
    spellbookSpells,
    preparedSpells,
  });

  const choiceSummary = getWizardBuilderChoiceSummary({
    level,
    edition,
    selections: {
      subclass,
      scholarSkill,
      spellbookSpells,
      preparedSpells,
    },
  });

  return {
    className: 'Wizard',
    edition: validation.options.edition,
    level: validation.options.level,
    ready: validation.ready,
    missingSections: validation.missingSections,
    errors: validation.errors,
    options: validation.options,
    choiceSummary,
  };
}

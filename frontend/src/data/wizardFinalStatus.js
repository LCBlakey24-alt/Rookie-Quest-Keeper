import { getWizardBuilderReadiness } from './wizardBuilderReadiness';
import { getWizardClassLevel } from './wizardCharacterShape';
import { getWizardSheetSummary } from './wizardSheetSummary';

export function getWizardFinalStatus({
  character = {},
  level = null,
  edition = character?.rules_edition || character?.ruleset_id || '2014',
  subclass = character?.subclass || character?.wizard_subclass || character?.wizardSubclass || character?.school || character?.wizardSchool || '',
  scholarSkill = character?.scholarSkill || character?.scholar_skill || '',
  spellbookSpells = character?.spellbookSpells || character?.spellbook_spells || character?.spellbook || [],
  preparedSpells = character?.preparedSpells || character?.prepared_spells || [],
} = {}) {
  const wizardLevel = level || getWizardClassLevel(character) || 1;
  const readiness = getWizardBuilderReadiness({
    level: wizardLevel,
    edition,
    subclass,
    scholarSkill,
    spellbookSpells,
    preparedSpells,
  });

  return {
    className: 'Wizard',
    edition: readiness.edition,
    level: readiness.level,
    ready: readiness.ready,
    missingSections: readiness.missingSections,
    errors: readiness.errors,
    choiceSummary: readiness.choiceSummary,
    sheetSummary: getWizardSheetSummary(character),
  };
}

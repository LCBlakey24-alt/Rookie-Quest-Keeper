import { getWizardClassLevel, isWizardCharacter } from './wizardCharacterShape';
import { getWizardProgressionSummary } from './wizardProgression';
import { getWizardSubclassKey, getWizardSubclassSummary } from './wizardSubclasses';
import { getWizardBuilderSelectionList } from './wizardBuilderOptions';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;
const joinSelectionOrFallback = (value, fallback = '') => {
  const joined = joinSelection(value, '');
  return joined || fallback;
};
const getSubclassName = (character = {}) => character?.subclass || character?.wizard_subclass || character?.wizardSubclass || character?.school || character?.wizardSchool || '';

function getScholarLabel(selection = {}) {
  return selection.scholarSkill || (selection.level >= 2 && selection.edition === '2024' ? 'Choose Scholar skill' : 'Not used in this ruleset');
}

function getArcaneRecoveryLabel(progression = {}) {
  const levelBudget = progression.arcaneRecoveryLevel || 0;
  return levelBudget > 0 ? `Recover spell slots up to level ${levelBudget} total` : 'Arcane Recovery not unlocked';
}

export function getWizardSheetSummary(character = {}) {
  const level = getWizardClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getWizardProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getWizardSubclassSummary(subclassName, level || 1, edition);
  const selections = getWizardBuilderSelectionList(character);

  return {
    className: 'Wizard',
    edition,
    level,
    isWizard: isWizardCharacter(character),
    subclassKey: getWizardSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= progression.subclassChoiceLevel ? 'Choose/record Wizard School' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingOnline: progression.spellcastingLevel > 0,
    spellcastingHint: `Full caster level ${progression.spellcastingLevel}`,
    arcaneRecoveryLevel: progression.arcaneRecoveryLevel,
    arcaneRecoveryLabel: getArcaneRecoveryLabel(progression),
    scholarLabel: getScholarLabel({ ...selections, level, edition }),
    spellbookSpellsLabel: joinSelectionOrFallback(selections.spellbookSpells, progression.spellcastingLevel > 0 ? 'Record spellbook spells' : 'None yet'),
    preparedSpellsLabel: joinSelectionOrFallback(selections.preparedSpells, progression.spellcastingLevel > 0 ? 'Choose prepared Wizard spells' : 'None yet'),
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

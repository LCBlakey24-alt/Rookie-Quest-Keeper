import { getWizardSubclassByKey, getWizardSubclassOptions } from './wizardSubclasses';
import { getWizardSubclassChoiceLevel, normaliseWizardRulesEdition } from './wizardProgression';

export const WIZARD_SCHOLAR_SKILL_OPTIONS = [
  { key: 'arcana', name: 'Arcana', summary: 'Magic theory and arcane study.' },
  { key: 'history', name: 'History', summary: 'Lore, records, and old knowledge.' },
  { key: 'investigation', name: 'Investigation', summary: 'Clues, research, and deduction.' },
  { key: 'medicine', name: 'Medicine', summary: 'Anatomy, care, and field knowledge.' },
  { key: 'nature', name: 'Nature', summary: 'Natural lore and creatures.' },
  { key: 'religion', name: 'Religion', summary: 'Divine lore and traditions.' },
];

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function optionMatches(option, value = '') {
  const key = normaliseChoice(value);
  return Boolean(key && (option.key === key || normaliseChoice(option.name) === key));
}

export function getWizardBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const wizardLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWizardRulesEdition(edition);
  const subclassChoiceLevel = getWizardSubclassChoiceLevel(ruleset);

  return {
    className: 'Wizard',
    edition: ruleset,
    level: wizardLevel,
    subclassChoiceLevel,
    subclassRequired: wizardLevel >= subclassChoiceLevel,
    subclassOptions: getWizardSubclassOptions(ruleset),
    scholarRequired: ruleset === '2024' && wizardLevel >= 2,
    scholarOptions: ruleset === '2024' ? WIZARD_SCHOLAR_SKILL_OPTIONS : [],
    spellbookSupported: wizardLevel >= 1,
    preparedSpellsSupported: wizardLevel >= 1,
  };
}

export function isValidWizardSubclass(subclass = '', edition = '2014') {
  return Boolean(getWizardSubclassByKey(subclass, edition));
}

export function getSelectedWizardSubclass(selection = {}, edition = '2014') {
  const subclass = selection?.subclass || selection?.wizard_subclass || selection?.wizardSubclass || selection?.school || selection?.wizardSchool || '';
  return getWizardSubclassByKey(subclass, edition);
}

export function validateWizardBuilderSelections({
  level = 1,
  edition = '2014',
  subclass = '',
  scholarSkill = '',
} = {}) {
  const options = getWizardBuilderOptions({ level, edition });
  const errors = [];

  if (options.subclassRequired && !subclass) errors.push('Choose a Wizard school.');
  if (subclass && !isValidWizardSubclass(subclass, options.edition)) errors.push('Choose a Wizard school available in this ruleset.');

  if (options.scholarRequired && !scholarSkill) errors.push('Choose a Scholar skill.');
  if (scholarSkill && !options.scholarOptions.some(option => optionMatches(option, scholarSkill))) {
    errors.push('Choose a valid Scholar skill.');
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      scholarSkill: scholarSkill || null,
    },
  };
}

export function getWizardBuilderSelectionList(selection = {}) {
  return {
    subclass: selection?.subclass || selection?.wizard_subclass || selection?.wizardSubclass || selection?.school || selection?.wizardSchool || null,
    scholarSkill: selection?.scholarSkill || selection?.scholar_skill || null,
    spellbookSpells: readList(selection?.spellbookSpells || selection?.spellbook_spells || selection?.spellbook),
    preparedSpells: readList(selection?.preparedSpells || selection?.prepared_spells),
  };
}

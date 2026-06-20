import { getWizardBuilderOptions, getWizardBuilderSelectionList } from './wizardBuilderOptions';
import { getWizardSubclassByKey } from './wizardSubclasses';

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findOption(options = [], value = '') {
  const key = normaliseChoice(value);
  if (!key) return null;
  return options.find(option => option.key === key || normaliseChoice(option.name) === key) || null;
}

export function getWizardBuilderChoiceSummary({ level = 1, edition = '2014', selections = {} } = {}) {
  const options = getWizardBuilderOptions({ level, edition });
  const selectionList = getWizardBuilderSelectionList(selections);
  const subclass = getWizardSubclassByKey(selectionList.subclass, options.edition);
  const scholarSkill = findOption(options.scholarOptions, selectionList.scholarSkill);

  return {
    className: 'Wizard',
    edition: options.edition,
    level: options.level,
    subclass,
    scholarSkill,
    spellbookSpells: selectionList.spellbookSpells,
    preparedSpells: selectionList.preparedSpells,
    requiredChoices: {
      subclass: options.subclassRequired,
      scholarSkill: options.scholarRequired,
    },
  };
}

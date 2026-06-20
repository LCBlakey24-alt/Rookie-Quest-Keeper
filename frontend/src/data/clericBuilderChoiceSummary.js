import { getClericBuilderOptions, getClericBuilderSelectionList } from './clericBuilderOptions';
import { getClericSubclassByKey } from './clericSubclasses';

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

export function getClericBuilderChoiceSummary({ level = 1, edition = '2014', selections = {} } = {}) {
  const options = getClericBuilderOptions({ level, edition });
  const selectionList = getClericBuilderSelectionList(selections);
  const subclass = getClericSubclassByKey(selectionList.subclass, options.edition);
  const divineOrder = findOption(options.divineOrderOptions, selectionList.divineOrder);
  const blessedStrikes = findOption(options.blessedStrikesOptions, selectionList.blessedStrikes);

  return {
    className: 'Cleric',
    edition: options.edition,
    level: options.level,
    subclass,
    divineOrder,
    blessedStrikes,
    preparedSpells: selectionList.preparedSpells,
    requiredChoices: {
      subclass: options.subclassRequired,
      divineOrder: options.divineOrderRequired,
      blessedStrikes: options.blessedStrikesRequired,
    },
  };
}

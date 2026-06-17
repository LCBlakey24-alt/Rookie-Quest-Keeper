import { getDruidBuilderOptions, getDruidBuilderSelectionList } from './druidBuilderOptions';
import { getDruidSubclassByKey } from './druidSubclasses';

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

export function getDruidBuilderChoiceSummary({ level = 1, edition = '2014', selections = {} } = {}) {
  const options = getDruidBuilderOptions({ level, edition });
  const selectionList = getDruidBuilderSelectionList(selections);
  const subclass = getDruidSubclassByKey(selectionList.subclass, options.edition);
  const primalOrder = findOption(options.primalOrderOptions, selectionList.primalOrder);
  const elementalFury = findOption(options.elementalFuryOptions, selectionList.elementalFury);

  return {
    className: 'Druid',
    edition: options.edition,
    level: options.level,
    subclass,
    primalOrder,
    elementalFury,
    preparedSpells: selectionList.preparedSpells,
    requiredChoices: {
      subclass: options.subclassRequired,
      primalOrder: options.primalOrderRequired,
      elementalFury: options.elementalFuryRequired,
    },
  };
}

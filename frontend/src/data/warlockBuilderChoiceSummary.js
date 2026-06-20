import { getWarlockBuilderOptions, getWarlockBuilderSelectionList, WARLOCK_PACT_BOON_OPTIONS } from './warlockBuilderOptions';
import { getWarlockSubclassByKey } from './warlockSubclasses';

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^pact of the /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findPactBoon(value = '') {
  const key = normaliseChoice(value);
  if (!key) return null;
  return WARLOCK_PACT_BOON_OPTIONS.find(option => option.key === key || normaliseChoice(option.name) === key) || null;
}

export function getWarlockBuilderChoiceSummary({ level = 1, edition = '2014', selections = {} } = {}) {
  const options = getWarlockBuilderOptions({ level, edition });
  const selectionList = getWarlockBuilderSelectionList(selections);
  const subclass = getWarlockSubclassByKey(selectionList.subclass, options.edition);
  const pactBoon = findPactBoon(selectionList.pactBoon);

  return {
    className: 'Warlock',
    edition: options.edition,
    level: options.level,
    subclass,
    pactBoon,
    invocations: selectionList.invocations,
    requiredChoices: {
      subclass: options.subclassRequired,
      pactBoon: options.pactBoonRequired,
      invocations: options.invocationsRequired,
    },
    invocationCount: options.invocationCount,
  };
}

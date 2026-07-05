import { getWarlockSubclassByKey, getWarlockSubclassOptions } from './warlockSubclasses';
import { getWarlockInvocationCount, getWarlockSubclassChoiceLevel, normaliseWarlockRulesEdition } from './warlockProgression';

export const WARLOCK_PACT_BOON_OPTIONS = [
  { key: 'blade', name: 'Pact of the Blade', summary: 'Weapon-focused pact option.' },
  { key: 'chain', name: 'Pact of the Chain', summary: 'Companion-focused pact option.' },
  { key: 'tome', name: 'Pact of the Tome', summary: 'Cantrip and ritual-focused pact option.' },
  { key: 'talisman', name: 'Pact of the Talisman', summary: 'Charm-focused pact option.' },
];

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^pact of the /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function normaliseInvocation(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function optionMatches(option, value = '') {
  const key = normaliseChoice(value);
  return Boolean(key && (option.key === key || normaliseChoice(option.name) === key));
}

export function getWarlockBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const warlockLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWarlockRulesEdition(edition);
  const subclassChoiceLevel = getWarlockSubclassChoiceLevel(ruleset);
  const pactBoonRequired = ruleset === '2014' ? warlockLevel >= 3 : warlockLevel >= 3;

  return {
    className: 'Warlock',
    edition: ruleset,
    level: warlockLevel,
    subclassChoiceLevel,
    subclassRequired: warlockLevel >= subclassChoiceLevel,
    subclassOptions: getWarlockSubclassOptions(ruleset),
    pactBoonRequired,
    pactBoonOptions: WARLOCK_PACT_BOON_OPTIONS,
    invocationCount: getWarlockInvocationCount(warlockLevel, ruleset),
    invocationsRequired: getWarlockInvocationCount(warlockLevel, ruleset) > 0,
  };
}

export function isValidWarlockSubclass(subclass = '', edition = '2014') {
  return Boolean(getWarlockSubclassByKey(subclass, edition));
}

export function isValidWarlockPactBoon(pactBoon = '') {
  return WARLOCK_PACT_BOON_OPTIONS.some(option => optionMatches(option, pactBoon));
}

export function getSelectedWarlockSubclass(selection = {}, edition = '2014') {
  const subclass = selection?.subclass || selection?.warlock_subclass || selection?.warlockSubclass || selection?.patron || selection?.warlockPatron || '';
  return getWarlockSubclassByKey(subclass, edition);
}

export function validateWarlockBuilderSelections({
  level = 1,
  edition = '2014',
  subclass = '',
  pactBoon = '',
  invocations = [],
} = {}) {
  const options = getWarlockBuilderOptions({ level, edition });
  const errors = [];
  const invocationList = readList(invocations);

  if (options.subclassRequired && !subclass) errors.push('Choose a Warlock patron.');
  if (subclass && !isValidWarlockSubclass(subclass, options.edition)) errors.push('Choose a Warlock patron available in this ruleset.');

  if (options.pactBoonRequired && !pactBoon) errors.push('Choose a Pact Boon.');
  if (pactBoon && !isValidWarlockPactBoon(pactBoon)) errors.push('Choose a valid Pact Boon.');

  if (options.invocationsRequired && invocationList.length < options.invocationCount) {
    errors.push(`Choose ${options.invocationCount} Eldritch Invocation${options.invocationCount === 1 ? '' : 's'}.`);
  }
  if (options.invocationsRequired && invocationList.length > options.invocationCount) {
    errors.push(`Choose only ${options.invocationCount} Eldritch Invocation${options.invocationCount === 1 ? '' : 's'}.`);
  }
  const uniqueInvocations = new Set(invocationList.map(normaliseInvocation).filter(Boolean));
  if (uniqueInvocations.size < invocationList.length) {
    errors.push('Choose each Eldritch Invocation only once.');
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      pactBoon: pactBoon || null,
      invocations: invocationList,
    },
  };
}

export function getWarlockBuilderSelectionList(selection = {}) {
  return {
    subclass: selection?.subclass || selection?.warlock_subclass || selection?.warlockSubclass || selection?.patron || selection?.warlockPatron || null,
    pactBoon: selection?.pactBoon || selection?.pact_boon || null,
    invocations: readList(selection?.invocations || selection?.eldritchInvocations || selection?.eldritch_invocations),
  };
}

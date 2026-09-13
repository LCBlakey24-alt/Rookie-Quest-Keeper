import { getWarlockSubclassByKey, getWarlockSubclassOptions } from './warlockSubclasses';
import { getWarlockInvocationCount, getWarlockSubclassChoiceLevel, normaliseWarlockRulesEdition } from './warlockProgression';

export const WARLOCK_PACT_BOON_OPTIONS = [
  { key: 'blade', name: 'Pact of the Blade', summary: 'Weapon-focused pact option.' },
  { key: 'chain', name: 'Pact of the Chain', summary: 'Companion-focused pact option.' },
  { key: 'tome', name: 'Pact of the Tome', summary: 'Cantrip and ritual-focused pact option.' },
  { key: 'talisman', name: 'Pact of the Talisman', summary: 'Charm-focused pact option.' },
];

export const WARLOCK_INVOCATION_OPTIONS_2014 = [
  'Agonizing Blast',
  'Armor of Shadows',
  'Beast Speech',
  'Beguiling Influence',
  'Devil’s Sight',
  'Eldritch Mind',
  'Eldritch Sight',
  'Eldritch Spear',
  'Eyes of the Rune Keeper',
  'Fiendish Vigor',
  'Mask of Many Faces',
  'Misty Visions',
  'Repelling Blast',
  'Thief of Five Fates',
  'Book of Ancient Secrets',
  'Eldritch Smite',
  'Improved Pact Weapon',
  'Investment of the Chain Master',
  'One with Shadows',
  'Tomb of Levistus',
  'Ascendant Step',
  'Lifedrinker',
  'Shroud of Shadow',
  'Visions of Distant Realms',
  'Witch Sight',
];

export const WARLOCK_INVOCATION_OPTIONS_2024 = [
  { name: 'Agonizing Blast', minLevel: 2, prerequisiteNote: 'Requires an eligible damaging Warlock cantrip.' },
  { name: 'Armor of Shadows', minLevel: 1 },
  { name: 'Ascendant Step', minLevel: 5 },
  { name: 'Devil’s Sight', minLevel: 2 },
  { name: 'Devouring Blade', minLevel: 12, requiresInvocation: 'Thirsting Blade' },
  { name: 'Eldritch Mind', minLevel: 1 },
  { name: 'Eldritch Smite', minLevel: 5, requiresInvocation: 'Pact of the Blade' },
  { name: 'Eldritch Spear', minLevel: 2, prerequisiteNote: 'Requires an eligible damaging Warlock cantrip.' },
  { name: 'Fiendish Vigor', minLevel: 2 },
  { name: 'Gaze of Two Minds', minLevel: 5 },
  { name: 'Gift of the Depths', minLevel: 5 },
  { name: 'Gift of the Protectors', minLevel: 9, requiresInvocation: 'Pact of the Tome' },
  { name: 'Investment of the Chain Master', minLevel: 5, requiresInvocation: 'Pact of the Chain' },
  { name: 'Lessons of the First Ones', minLevel: 2, prerequisiteNote: 'Choose an Origin feat when this invocation is configured.' },
  { name: 'Lifedrinker', minLevel: 9, requiresInvocation: 'Pact of the Blade' },
  { name: 'Mask of Many Faces', minLevel: 2 },
  { name: 'Master of Myriad Forms', minLevel: 5 },
  { name: 'Misty Visions', minLevel: 2 },
  { name: 'One with Shadows', minLevel: 5 },
  { name: 'Otherworldly Leap', minLevel: 2 },
  { name: 'Pact of the Blade', minLevel: 1, pactInvocation: true },
  { name: 'Pact of the Chain', minLevel: 1, pactInvocation: true },
  { name: 'Pact of the Tome', minLevel: 1, pactInvocation: true },
  { name: 'Repelling Blast', minLevel: 2, prerequisiteNote: 'Requires an eligible attacking Warlock cantrip.' },
  { name: 'Thirsting Blade', minLevel: 5, requiresInvocation: 'Pact of the Blade' },
  { name: 'Visions of Distant Realms', minLevel: 9 },
  { name: 'Whispers of the Grave', minLevel: 7 },
  { name: 'Witch Sight', minLevel: 15 },
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

export function getWarlockInvocationOptionDetails(level = 1, edition = '2014') {
  const warlockLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWarlockRulesEdition(edition);
  if (ruleset !== '2024') {
    return WARLOCK_INVOCATION_OPTIONS_2014.map((name) => ({ name, minLevel: 1 }));
  }
  return WARLOCK_INVOCATION_OPTIONS_2024.filter((option) => warlockLevel >= option.minLevel);
}

export function getWarlockInvocationOptions(level = 1, edition = '2014') {
  return getWarlockInvocationOptionDetails(level, edition).map((option) => option.name);
}

export function getWarlockBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const warlockLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWarlockRulesEdition(edition);
  const subclassChoiceLevel = getWarlockSubclassChoiceLevel(ruleset);
  const pactBoonRequired = ruleset === '2014' && warlockLevel >= 3;
  const invocationOptionDetails = getWarlockInvocationOptionDetails(warlockLevel, ruleset);
  const eligibleInvocationOptions = invocationOptionDetails.map((option) => option.name);

  return {
    className: 'Warlock',
    edition: ruleset,
    level: warlockLevel,
    subclassChoiceLevel,
    subclassRequired: warlockLevel >= subclassChoiceLevel,
    subclassOptions: getWarlockSubclassOptions(ruleset),
    pactBoonRequired,
    pactBoonOptions: ruleset === '2014' ? WARLOCK_PACT_BOON_OPTIONS : [],
    invocationCount: getWarlockInvocationCount(warlockLevel, ruleset),
    invocationsRequired: getWarlockInvocationCount(warlockLevel, ruleset) > 0,
    invocationOptionDetails,
    eligibleInvocationOptions,
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
  if (options.pactBoonRequired && pactBoon && !isValidWarlockPactBoon(pactBoon)) errors.push('Choose a valid Pact Boon.');

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

  const eligible = new Set(options.eligibleInvocationOptions.map(normaliseInvocation));
  invocationList.forEach((invocation) => {
    if (!eligible.has(normaliseInvocation(invocation))) {
      errors.push(`${invocation} is not available to this Warlock at level ${options.level}.`);
    }
  });

  if (options.edition === '2024') {
    const selected = new Set(invocationList.map(normaliseInvocation));
    options.invocationOptionDetails.forEach((option) => {
      if (!option.requiresInvocation || !selected.has(normaliseInvocation(option.name))) return;
      if (!selected.has(normaliseInvocation(option.requiresInvocation))) {
        errors.push(`${option.name} requires ${option.requiresInvocation}.`);
      }
    });
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      pactBoon: options.pactBoonRequired ? pactBoon || null : null,
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

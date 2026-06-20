import { getSorcererSubclassByKey, getSorcererSubclassOptions } from './sorcererSubclasses';
import { getSorcererMetamagicCount, getSorcererSubclassChoiceLevel, getSorceryPointMaximum, normaliseSorcererRulesEdition } from './sorcererProgression';

export const SORCERER_METAMAGIC_OPTIONS = [
  { key: 'careful', name: 'Careful Spell', summary: 'Protect selected allies from part of an area spell.' },
  { key: 'distant', name: 'Distant Spell', summary: 'Increase the reach or range of a spell.' },
  { key: 'empowered', name: 'Empowered Spell', summary: 'Reroll some spell damage dice.' },
  { key: 'extended', name: 'Extended Spell', summary: 'Increase the duration of a spell.' },
  { key: 'heightened', name: 'Heightened Spell', summary: 'Make a spell harder to resist.' },
  { key: 'quickened', name: 'Quickened Spell', summary: 'Cast a spell more quickly.' },
  { key: 'subtle', name: 'Subtle Spell', summary: 'Cast with fewer obvious signs.' },
  { key: 'twinned', name: 'Twinned Spell', summary: 'Apply a spell to an extra valid target.' },
  { key: 'seeking', name: 'Seeking Spell', summary: 'Improve a missed spell attack.' },
  { key: 'transmuted', name: 'Transmuted Spell', summary: 'Change a spell damage type.' },
];

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ spell$/, '')
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

export function getSorcererBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const sorcererLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseSorcererRulesEdition(edition);
  const subclassChoiceLevel = getSorcererSubclassChoiceLevel(ruleset);
  const metamagicCount = getSorcererMetamagicCount(sorcererLevel, ruleset);

  return {
    className: 'Sorcerer',
    edition: ruleset,
    level: sorcererLevel,
    subclassChoiceLevel,
    subclassRequired: sorcererLevel >= subclassChoiceLevel,
    subclassOptions: getSorcererSubclassOptions(ruleset),
    sorceryPointMaximum: getSorceryPointMaximum(sorcererLevel),
    metamagicCount,
    metamagicRequired: metamagicCount > 0,
    metamagicOptions: SORCERER_METAMAGIC_OPTIONS,
  };
}

export function isValidSorcererSubclass(subclass = '', edition = '2014') {
  return Boolean(getSorcererSubclassByKey(subclass, edition));
}

export function isValidSorcererMetamagic(value = '') {
  return SORCERER_METAMAGIC_OPTIONS.some(option => optionMatches(option, value));
}

export function getSelectedSorcererSubclass(selection = {}, edition = '2014') {
  const subclass = selection?.subclass || selection?.sorcerer_subclass || selection?.sorcererSubclass || selection?.origin || selection?.sorcerousOrigin || '';
  return getSorcererSubclassByKey(subclass, edition);
}

export function validateSorcererBuilderSelections({ level = 1, edition = '2014', subclass = '', metamagic = [] } = {}) {
  const options = getSorcererBuilderOptions({ level, edition });
  const errors = [];
  const metamagicList = readList(metamagic);

  if (options.subclassRequired && !subclass) errors.push('Choose a Sorcerer origin.');
  if (subclass && !isValidSorcererSubclass(subclass, options.edition)) errors.push('Choose a Sorcerer origin available in this ruleset.');

  if (options.metamagicRequired && metamagicList.length < options.metamagicCount) {
    errors.push(`Choose ${options.metamagicCount} Metamagic option${options.metamagicCount === 1 ? '' : 's'}.`);
  }

  if (metamagicList.some(item => !isValidSorcererMetamagic(item))) {
    errors.push('Choose valid Metamagic options.');
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      metamagic: metamagicList,
    },
  };
}

export function getSorcererBuilderSelectionList(selection = {}) {
  return {
    subclass: selection?.subclass || selection?.sorcerer_subclass || selection?.sorcererSubclass || selection?.origin || selection?.sorcerousOrigin || null,
    metamagic: readList(selection?.metamagic || selection?.metamagicOptions || selection?.metamagic_options),
  };
}

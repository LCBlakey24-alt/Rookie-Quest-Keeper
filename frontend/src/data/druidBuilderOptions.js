import { getDruidSubclassByKey, getDruidSubclassOptions } from './druidSubclasses';
import { getDruidSubclassChoiceLevel, normaliseDruidRulesEdition } from './druidProgression';

export const DRUID_PRIMAL_ORDER_OPTIONS = [
  { key: 'magician', name: 'Magician', summary: 'Leans into cantrips, primal magic, and Wisdom-based utility.' },
  { key: 'warden', name: 'Warden', summary: 'Leans into armour, weapons, and front-line durability.' },
];

export const DRUID_ELEMENTAL_FURY_OPTIONS = [
  { key: 'potent_spellcasting', name: 'Potent Spellcasting', summary: 'Supports cantrip-focused Druid damage.' },
  { key: 'primal_strike', name: 'Primal Strike', summary: 'Supports weapon-focused Druid damage.' },
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
  return Array.isArray(value) ? value : [value];
}

function optionMatches(option, value = '') {
  const key = normaliseChoice(value);
  return Boolean(key && (option.key === key || normaliseChoice(option.name) === key));
}

export function getDruidBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const druidLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseDruidRulesEdition(edition);
  const subclassChoiceLevel = getDruidSubclassChoiceLevel(ruleset);

  return {
    className: 'Druid',
    edition: ruleset,
    level: druidLevel,
    subclassChoiceLevel,
    subclassRequired: druidLevel >= subclassChoiceLevel,
    subclassOptions: getDruidSubclassOptions(ruleset),
    primalOrderRequired: ruleset === '2024' && druidLevel >= 1,
    primalOrderOptions: ruleset === '2024' ? DRUID_PRIMAL_ORDER_OPTIONS : [],
    elementalFuryRequired: ruleset === '2024' && druidLevel >= 7,
    elementalFuryOptions: ruleset === '2024' ? DRUID_ELEMENTAL_FURY_OPTIONS : [],
    preparedSpellsSupported: druidLevel >= 1,
  };
}

export function isValidDruidSubclass(subclass = '', edition = '2014') {
  return Boolean(getDruidSubclassByKey(subclass, edition));
}

export function getSelectedDruidSubclass(selection = {}, edition = '2014') {
  const subclass = selection?.subclass || selection?.druid_subclass || selection?.druidSubclass || selection?.circle || selection?.druidCircle || '';
  return getDruidSubclassByKey(subclass, edition);
}

export function validateDruidBuilderSelections({
  level = 1,
  edition = '2014',
  subclass = '',
  primalOrder = '',
  elementalFury = '',
} = {}) {
  const options = getDruidBuilderOptions({ level, edition });
  const errors = [];

  if (options.subclassRequired && !subclass) errors.push('Choose a Druid circle.');
  if (subclass && !isValidDruidSubclass(subclass, options.edition)) errors.push('Choose a Druid circle available in this ruleset.');

  if (options.primalOrderRequired && !primalOrder) errors.push('Choose a Primal Order.');
  if (primalOrder && !options.primalOrderOptions.some(option => optionMatches(option, primalOrder))) {
    errors.push('Choose a valid Primal Order.');
  }

  if (options.elementalFuryRequired && !elementalFury) errors.push('Choose an Elemental Fury option.');
  if (elementalFury && !options.elementalFuryOptions.some(option => optionMatches(option, elementalFury))) {
    errors.push('Choose a valid Elemental Fury option.');
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      primalOrder: primalOrder || null,
      elementalFury: elementalFury || null,
    },
  };
}

export function getDruidBuilderSelectionList(selection = {}) {
  return {
    subclass: selection?.subclass || selection?.druid_subclass || selection?.druidSubclass || selection?.circle || selection?.druidCircle || null,
    primalOrder: selection?.primalOrder || selection?.primal_order || null,
    elementalFury: selection?.elementalFury || selection?.elemental_fury || null,
    preparedSpells: readList(selection?.preparedSpells || selection?.prepared_spells),
  };
}

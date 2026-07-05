import { getClericSubclassByKey, getClericSubclassOptions } from './clericSubclasses';
import { getClericSubclassChoiceLevel } from './clericProgression';

export const CLERIC_DIVINE_ORDER_OPTIONS = [
  { key: 'protector', name: 'Protector', summary: 'Leans into armour, weapons, and front-line durability.' },
  { key: 'thaumaturge', name: 'Thaumaturge', summary: 'Leans into cantrips, divine magic, and wisdom-based utility.' },
];

export const CLERIC_BLESSED_STRIKES_OPTIONS = [
  { key: 'divine_strike', name: 'Divine Strike', summary: 'Adds divine damage to weapon attacks.' },
  { key: 'potent_spellcasting', name: 'Potent Spellcasting', summary: 'Adds Wisdom to Cleric cantrip damage.' },
];

function normaliseRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

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

export function getClericBuilderOptions({ level = 1, edition = '2014' } = {}) {
  const clericLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseRuleset(edition);
  const subclassChoiceLevel = getClericSubclassChoiceLevel(ruleset);

  return {
    className: 'Cleric',
    edition: ruleset,
    level: clericLevel,
    subclassChoiceLevel,
    subclassRequired: clericLevel >= subclassChoiceLevel,
    subclassOptions: getClericSubclassOptions(ruleset),
    divineOrderRequired: ruleset === '2024' && clericLevel >= 1,
    divineOrderOptions: ruleset === '2024' ? CLERIC_DIVINE_ORDER_OPTIONS : [],
    blessedStrikesRequired: ruleset === '2024' && clericLevel >= 7,
    blessedStrikesOptions: ruleset === '2024' ? CLERIC_BLESSED_STRIKES_OPTIONS : [],
  };
}

export function isValidClericSubclass(subclass = '', edition = '2014') {
  return Boolean(getClericSubclassByKey(subclass, edition));
}

export function getSelectedClericSubclass(selection = {}, edition = '2014') {
  const subclass = selection?.subclass || selection?.cleric_subclass || selection?.clericSubclass || '';
  return getClericSubclassByKey(subclass, edition);
}

export function validateClericBuilderSelections({
  level = 1,
  edition = '2014',
  subclass = '',
  divineOrder = '',
  blessedStrikes = '',
} = {}) {
  const options = getClericBuilderOptions({ level, edition });
  const errors = [];

  if (options.subclassRequired && !subclass) errors.push('Choose or record a Cleric subclass.');
  if (subclass && !isValidClericSubclass(subclass, options.edition)) errors.push('Choose Life Domain for built-in public-license automation, or record a custom/user-added Cleric subclass.');

  if (options.divineOrderRequired && !divineOrder) errors.push('Choose a Divine Order.');
  if (divineOrder && !options.divineOrderOptions.some(option => option.key === normaliseChoice(divineOrder) || normaliseChoice(option.name) === normaliseChoice(divineOrder))) {
    errors.push('Choose a valid Divine Order.');
  }

  if (options.blessedStrikesRequired && !blessedStrikes) errors.push('Choose a Blessed Strikes option.');
  if (blessedStrikes && !options.blessedStrikesOptions.some(option => option.key === normaliseChoice(blessedStrikes) || normaliseChoice(option.name) === normaliseChoice(blessedStrikes))) {
    errors.push('Choose a valid Blessed Strikes option.');
  }

  return {
    ready: errors.length === 0,
    errors,
    missingSections: errors,
    options,
    selections: {
      subclass: subclass || null,
      divineOrder: divineOrder || null,
      blessedStrikes: blessedStrikes || null,
    },
  };
}

export function getClericBuilderSelectionList(selection = {}) {
  return {
    subclass: selection?.subclass || selection?.cleric_subclass || selection?.clericSubclass || null,
    divineOrder: selection?.divineOrder || selection?.divine_order || null,
    blessedStrikes: selection?.blessedStrikes || selection?.blessed_strikes || null,
    preparedSpells: readList(selection?.preparedSpells || selection?.prepared_spells),
  };
}

import { getSorcererBuilderOptions, getSorcererBuilderSelectionList, SORCERER_METAMAGIC_OPTIONS } from './sorcererBuilderOptions';
import { getSorcererSubclassByKey } from './sorcererSubclasses';

function normaliseChoice(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ spell$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findMetamagic(value = '') {
  const key = normaliseChoice(value);
  if (!key) return null;
  return SORCERER_METAMAGIC_OPTIONS.find(option => option.key === key || normaliseChoice(option.name) === key) || null;
}

export function getSorcererBuilderChoiceSummary({ level = 1, edition = '2014', selections = {} } = {}) {
  const options = getSorcererBuilderOptions({ level, edition });
  const selectionList = getSorcererBuilderSelectionList(selections);
  const subclass = getSorcererSubclassByKey(selectionList.subclass, options.edition);
  const metamagic = selectionList.metamagic.map(findMetamagic).filter(Boolean);

  return {
    className: 'Sorcerer',
    edition: options.edition,
    level: options.level,
    subclass,
    metamagic,
    requiredChoices: {
      subclass: options.subclassRequired,
      metamagic: options.metamagicRequired,
    },
    sorceryPointMaximum: options.sorceryPointMaximum,
    metamagicCount: options.metamagicCount,
  };
}

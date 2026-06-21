import * as fighterPackage from './fighterPackage';
import * as barbarianPackage from './barbarianPackage';
import * as roguePackage from './roguePackage';
import * as monkPackage from './monkPackage';
import * as paladinPackage from './paladinPackage';
import * as rangerPackage from './rangerPackage';
import * as bardPackage from './bardPackage';
import * as clericPackage from './clericPackage';
import * as druidPackage from './druidPackage';
import * as wizardPackage from './wizardPackage';
import * as warlockPackage from './warlockPackage';
import * as sorcererPackage from './sorcererPackage';

const PACKAGE_BY_CLASS = {
  Fighter: fighterPackage,
  Barbarian: barbarianPackage,
  Rogue: roguePackage,
  Monk: monkPackage,
  Paladin: paladinPackage,
  Ranger: rangerPackage,
  Bard: bardPackage,
  Cleric: clericPackage,
  Druid: druidPackage,
  Wizard: wizardPackage,
  Warlock: warlockPackage,
  Sorcerer: sorcererPackage,
};

function normalizeClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PACKAGE_CLASS_BY_NORMALIZED_NAME = Object.keys(PACKAGE_BY_CLASS).reduce((lookup, className) => {
  lookup[normalizeClassName(className)] = className;
  return lookup;
}, {});

function getCanonicalClassName(className = '') {
  return PACKAGE_CLASS_BY_NORMALIZED_NAME[normalizeClassName(className)] || String(className || '').trim();
}

function getClassPackage(className = '') {
  const canonicalClassName = getCanonicalClassName(className);
  return PACKAGE_BY_CLASS[canonicalClassName] || null;
}

function getExportName(className = '', suffix = '') {
  const canonicalClassName = getCanonicalClassName(className);
  return canonicalClassName ? `get${canonicalClassName}${suffix}` : '';
}

function normaliseOption(option = {}) {
  if (typeof option === 'string') {
    return {
      value: option,
      label: option,
      key: option.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
    };
  }

  const label = option.label || option.name || option.value || '';
  return {
    ...option,
    value: option.value || label,
    label,
    key: option.key || String(label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
  };
}

export function hasClassBuilderPackage(className = '') {
  return Boolean(getClassPackage(className));
}

export function getClassPackageBuilderOptions(className = '', { level = 1, edition = '2014' } = {}) {
  const pkg = getClassPackage(className);
  const fn = pkg?.[getExportName(className, 'BuilderOptions')];
  if (typeof fn !== 'function') return null;

  try {
    const objectResult = fn({ level, edition });
    if (objectResult && typeof objectResult === 'object' && Number(objectResult.level || 0) === Number(level || 0)) {
      return objectResult;
    }
  } catch {
    // Some existing helpers take positional arguments instead of an options object.
  }

  try {
    return fn(level, edition);
  } catch {
    return null;
  }
}

export function getClassPackageSubclassOptions(className = '', edition = '2014') {
  const pkg = getClassPackage(className);
  const fn = pkg?.[getExportName(className, 'SubclassOptions')];
  if (typeof fn !== 'function') return [];

  try {
    return fn(edition).map(normaliseOption).filter(option => option.value && option.label);
  } catch {
    return [];
  }
}

export function getClassBuilderUiOptions(className = '', { level = 1, edition = '2014' } = {}) {
  const canonicalClassName = getCanonicalClassName(className);
  const builderOptions = getClassPackageBuilderOptions(canonicalClassName, { level, edition }) || {};
  const subclassOptions = getClassPackageSubclassOptions(canonicalClassName, edition);

  return {
    className: canonicalClassName,
    hasPackage: hasClassBuilderPackage(canonicalClassName),
    builderOptions,
    subclassOptions,
    hasSubclassOptions: subclassOptions.length > 0,
  };
}

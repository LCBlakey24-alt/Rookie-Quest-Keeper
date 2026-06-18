import { CLASSES } from './characterRules5e';
import { getClassBuilderUiOptions } from './classBuilderHelperBridge';

function normaliseKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normaliseSubclassOption(option = {}, source = 'static') {
  if (typeof option === 'string') {
    return {
      value: option,
      label: option,
      key: normaliseKey(option),
      source,
    };
  }

  const label = option.label || option.name || option.value || '';
  return {
    ...option,
    value: option.value || label,
    label,
    key: option.key || normaliseKey(label),
    source,
  };
}

function getStaticSubclassOptions(classData = null) {
  return (classData?.subclasses || [])
    .map(option => normaliseSubclassOption(option, 'static'))
    .filter(option => option.value && option.label);
}

export function getCharacterBuilderClassOptions(className = '', { edition = '2014', level = 1, classes = CLASSES } = {}) {
  const classData = classes?.[className] || null;
  const packageOptions = getClassBuilderUiOptions(className, { edition, level });
  const packageSubclasses = (packageOptions.subclassOptions || [])
    .map(option => normaliseSubclassOption(option, 'package'))
    .filter(option => option.value && option.label);
  const staticSubclasses = getStaticSubclassOptions(classData);
  const subclassOptions = packageSubclasses.length ? packageSubclasses : staticSubclasses;

  return {
    className,
    classData,
    hasClassData: Boolean(classData),
    hasPackage: packageOptions.hasPackage,
    builderOptions: packageOptions.builderOptions || {},
    subclassOptions,
    subclassNames: subclassOptions.map(option => option.value),
    subclassLabels: subclassOptions.map(option => option.label),
    usesPackageSubclassOptions: packageSubclasses.length > 0,
  };
}

export function getCharacterBuilderSubclassOptions(className = '', options = {}) {
  return getCharacterBuilderClassOptions(className, options).subclassOptions;
}

export function getCharacterBuilderSubclassNames(className = '', options = {}) {
  return getCharacterBuilderClassOptions(className, options).subclassNames;
}

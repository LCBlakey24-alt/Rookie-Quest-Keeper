import { getCharacterBuilderClassOptions } from '../../data/characterBuilderClassOptions';

function normaliseKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getClassSelectionState({
  className = '',
  edition = '2014',
  level = 1,
  classes = undefined,
  selectedSubclass = '',
} = {}) {
  const builderClassOptions = getCharacterBuilderClassOptions(className, {
    edition,
    level,
    ...(classes ? { classes } : {}),
  });

  const subclassOptions = builderClassOptions.subclassOptions || [];
  const selectedKey = normaliseKey(selectedSubclass);
  const selectedSubclassOption = subclassOptions.find(option => {
    return normaliseKey(option.value) === selectedKey || normaliseKey(option.label) === selectedKey || option.key === selectedKey;
  }) || null;

  return {
    ...builderClassOptions,
    availableSubclasses: builderClassOptions.subclassNames,
    availableSubclassOptions: subclassOptions,
    selectedSubclassOption,
    selectedSubclassIsAvailable: !selectedSubclass || Boolean(selectedSubclassOption),
    shouldClearSelectedSubclass: Boolean(selectedSubclass) && !selectedSubclassOption,
  };
}

export function getAvailableSubclassesForBuilder(args = {}) {
  return getClassSelectionState(args).availableSubclasses;
}

export function getAvailableSubclassOptionsForBuilder(args = {}) {
  return getClassSelectionState(args).availableSubclassOptions;
}

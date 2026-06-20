export function normaliseWizardClassName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readLevel(value) {
  const level = Number(value || 0);
  return Number.isFinite(level) && level > 0 ? level : 0;
}

function readClassLevelFromMap(classLevels = {}) {
  if (!classLevels || typeof classLevels !== 'object') return 0;

  const direct = readLevel(classLevels.wizard || classLevels.Wizard);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseWizardClassName(className) === 'wizard');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseWizardClassName(item?.name || item?.class_name || item?.className || item?.class) === 'wizard');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getWizardClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getWizardClassLevel(character = {}) {
  const directLevel = readLevel(character?.wizard_level || character?.wizardLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getWizardClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isWizardCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasWizardClassLevel(character = {}) {
  return getWizardClassLevel(character) > 0;
}

export function isWizardCharacter(character = {}) {
  const directClass = normaliseWizardClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'wizard') return true;

  if (readLevel(character?.wizard_level || character?.wizardLevel) > 0) return true;
  if (readClassLevelFromMap(getWizardClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

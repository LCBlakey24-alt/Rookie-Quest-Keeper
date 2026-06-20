export function normaliseSorcererClassName(value = '') {
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

  const direct = readLevel(classLevels.sorcerer || classLevels.Sorcerer);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseSorcererClassName(className) === 'sorcerer');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseSorcererClassName(item?.name || item?.class_name || item?.className || item?.class) === 'sorcerer');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getSorcererClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getSorcererClassLevel(character = {}) {
  const directLevel = readLevel(character?.sorcerer_level || character?.sorcererLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getSorcererClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isSorcererCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasSorcererClassLevel(character = {}) {
  return getSorcererClassLevel(character) > 0;
}

export function isSorcererCharacter(character = {}) {
  const directClass = normaliseSorcererClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'sorcerer') return true;

  if (readLevel(character?.sorcerer_level || character?.sorcererLevel) > 0) return true;
  if (readClassLevelFromMap(getSorcererClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

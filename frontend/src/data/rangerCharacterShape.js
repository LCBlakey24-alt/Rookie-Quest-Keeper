export function normaliseRangerClassName(value = '') {
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

  const direct = readLevel(classLevels.ranger || classLevels.Ranger);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseRangerClassName(className) === 'ranger');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseRangerClassName(item?.name || item?.class_name || item?.className || item?.class) === 'ranger');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getRangerClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getRangerClassLevel(character = {}) {
  const directLevel = readLevel(character?.ranger_level || character?.rangerLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getRangerClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isRangerCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasRangerClassLevel(character = {}) {
  return getRangerClassLevel(character) > 0;
}

export function isRangerCharacter(character = {}) {
  const directClass = normaliseRangerClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'ranger') return true;

  if (readLevel(character?.ranger_level || character?.rangerLevel) > 0) return true;
  if (readClassLevelFromMap(getRangerClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

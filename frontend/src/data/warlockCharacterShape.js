export function normaliseWarlockClassName(value = '') {
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

  const direct = readLevel(classLevels.warlock || classLevels.Warlock);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseWarlockClassName(className) === 'warlock');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseWarlockClassName(item?.name || item?.class_name || item?.className || item?.class) === 'warlock');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getWarlockClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getWarlockClassLevel(character = {}) {
  const directLevel = readLevel(character?.warlock_level || character?.warlockLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getWarlockClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isWarlockCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasWarlockClassLevel(character = {}) {
  return getWarlockClassLevel(character) > 0;
}

export function isWarlockCharacter(character = {}) {
  const directClass = normaliseWarlockClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'warlock') return true;

  if (readLevel(character?.warlock_level || character?.warlockLevel) > 0) return true;
  if (readClassLevelFromMap(getWarlockClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

export function normaliseClericClassName(value = '') {
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

  const direct = readLevel(classLevels.cleric || classLevels.Cleric);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseClericClassName(className) === 'cleric');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseClericClassName(item?.name || item?.class_name || item?.className || item?.class) === 'cleric');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getClericClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getClericClassLevel(character = {}) {
  const directLevel = readLevel(character?.cleric_level || character?.clericLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getClericClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isClericCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasClericClassLevel(character = {}) {
  return getClericClassLevel(character) > 0;
}

export function isClericCharacter(character = {}) {
  const directClass = normaliseClericClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'cleric') return true;

  if (readLevel(character?.cleric_level || character?.clericLevel) > 0) return true;
  if (readClassLevelFromMap(getClericClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

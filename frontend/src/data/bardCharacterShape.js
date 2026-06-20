export function normaliseBardClassName(value = '') {
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

  const direct = readLevel(classLevels.bard || classLevels.Bard);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseBardClassName(className) === 'bard');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseBardClassName(item?.name || item?.class_name || item?.className || item?.class) === 'bard');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getBardClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getBardClassLevel(character = {}) {
  const directLevel = readLevel(character?.bard_level || character?.bardLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getBardClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isBardCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasBardClassLevel(character = {}) {
  return getBardClassLevel(character) > 0;
}

export function isBardCharacter(character = {}) {
  const directClass = normaliseBardClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'bard') return true;

  if (readLevel(character?.bard_level || character?.bardLevel) > 0) return true;
  if (readClassLevelFromMap(getBardClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

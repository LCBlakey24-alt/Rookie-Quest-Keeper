export function normaliseDruidClassName(value = '') {
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

  const direct = readLevel(classLevels.druid || classLevels.Druid);
  if (direct > 0) return direct;

  const entry = Object.entries(classLevels).find(([className]) => normaliseDruidClassName(className) === 'druid');
  return readLevel(entry?.[1]);
}

function readClassLevelFromEntries(entries = []) {
  if (!Array.isArray(entries)) return 0;

  const entry = entries.find(item => normaliseDruidClassName(item?.name || item?.class_name || item?.className || item?.class) === 'druid');
  return readLevel(entry?.level || entry?.class_level || entry?.classLevel);
}

export function getDruidClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || character?.multiclassLevels || {};
}

export function getDruidClassLevel(character = {}) {
  const directLevel = readLevel(character?.druid_level || character?.druidLevel);
  if (directLevel > 0) return directLevel;

  const mappedLevel = readClassLevelFromMap(getDruidClassLevelMap(character));
  if (mappedLevel > 0) return mappedLevel;

  const entryLevel = readClassLevelFromEntries(character?.classes);
  if (entryLevel > 0) return entryLevel;

  return isDruidCharacter(character) ? readLevel(character?.level) || 1 : 0;
}

export function hasDruidClassLevel(character = {}) {
  return getDruidClassLevel(character) > 0;
}

export function isDruidCharacter(character = {}) {
  const directClass = normaliseDruidClassName(character?.character_class || character?.className || character?.class);
  if (directClass === 'druid') return true;

  if (readLevel(character?.druid_level || character?.druidLevel) > 0) return true;
  if (readClassLevelFromMap(getDruidClassLevelMap(character)) > 0) return true;
  if (readClassLevelFromEntries(character?.classes) > 0) return true;

  return false;
}

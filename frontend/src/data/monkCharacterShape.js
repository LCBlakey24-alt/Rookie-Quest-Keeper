export function normaliseMonkClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getMonkClassLevel(character = {}) {
  const direct = Number(character?.monk_level || character?.monkLevel || 0);
  if (direct > 0) return direct;
  const levels = { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
  const mapped = Number(levels.monk || levels.Monk || 0);
  if (mapped > 0) return mapped;
  const entry = (Array.isArray(character?.classes) ? character.classes : [])
    .find(item => normaliseMonkClassName(item?.name || item?.class_name || item?.className || item?.class) === 'monk');
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;
  return normaliseMonkClassName(character?.character_class || character?.className || character?.class) === 'monk'
    ? Number(character?.level || 1) || 1
    : 0;
}

export function isMonkCharacter(character = {}) {
  return normaliseMonkClassName(character?.character_class || character?.className || character?.class) === 'monk'
    || getMonkClassLevel(character) > 0;
}

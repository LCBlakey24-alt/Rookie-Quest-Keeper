export function normaliseRogueClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getRogueClassLevelMap(character = {}) {
  return { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
}

export function getRogueClassLevel(character = {}) {
  const direct = Number(character?.rogue_level || character?.rogueLevel || 0);
  if (direct > 0) return direct;
  const levels = getRogueClassLevelMap(character);
  const mapped = Number(levels.rogue || levels.Rogue || 0);
  if (mapped > 0) return mapped;
  const entry = (Array.isArray(character?.classes) ? character.classes : [])
    .find(item => normaliseRogueClassName(item?.name || item?.class_name || item?.className || item?.class) === 'rogue');
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;
  return normaliseRogueClassName(character?.character_class || character?.className || character?.class) === 'rogue'
    ? Number(character?.level || 1) || 1
    : 0;
}

export function hasRogueClassLevel(character = {}) {
  return getRogueClassLevel(character) > 0;
}

export function isRogueCharacter(character = {}) {
  return normaliseRogueClassName(character?.character_class || character?.className || character?.class) === 'rogue'
    || hasRogueClassLevel(character);
}

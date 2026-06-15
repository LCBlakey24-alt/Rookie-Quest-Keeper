export function normaliseBarbarianClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getBarbarianClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || {};
}

export function hasBarbarianClassLevel(character = {}) {
  if (Number(character?.barbarian_level || character?.barbarianLevel || 0) > 0) return true;

  const levels = getBarbarianClassLevelMap(character);
  if (Number(levels.barbarian || levels.Barbarian || 0) > 0) return true;

  const entries = Array.isArray(character?.classes) ? character.classes : [];
  return entries.some(entry => normaliseBarbarianClassName(entry?.name || entry?.class_name || entry?.className || entry?.class) === 'barbarian');
}

export function isBarbarianCharacter(character = {}) {
  return normaliseBarbarianClassName(character?.character_class || character?.className || character?.class) === 'barbarian'
    || hasBarbarianClassLevel(character);
}

export function normaliseCharacterClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getClassLevelMap(character = {}) {
  return character?.class_levels || character?.classLevels || character?.multiclass_levels || {};
}

export function hasFighterClassLevel(character = {}) {
  if (Number(character?.fighter_level || character?.fighterLevel || 0) > 0) return true;

  const levels = getClassLevelMap(character);
  if (Number(levels.fighter || levels.Fighter || 0) > 0) return true;

  const entries = Array.isArray(character?.classes) ? character.classes : [];
  return entries.some(entry => normaliseCharacterClassName(entry?.name || entry?.class_name || entry?.className || entry?.class) === 'fighter');
}

export function isFighterCharacter(character = {}) {
  return normaliseCharacterClassName(character?.character_class || character?.className || character?.class) === 'fighter'
    || hasFighterClassLevel(character);
}

export function normalisePaladinClassName(value = '') { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''); }
export function getPaladinClassLevel(character = {}) {
  const direct = Number(character?.paladin_level || character?.paladinLevel || 0); if (direct > 0) return direct;
  const levels = { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
  const mapped = Number(levels.paladin || levels.Paladin || 0); if (mapped > 0) return mapped;
  const entry = (Array.isArray(character?.classes) ? character.classes : []).find(item => normalisePaladinClassName(item?.name || item?.class_name || item?.className || item?.class) === 'paladin');
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0); if (entryLevel > 0) return entryLevel;
  return normalisePaladinClassName(character?.character_class || character?.className || character?.class) === 'paladin' ? Number(character?.level || 1) || 1 : 0;
}
export function isPaladinCharacter(character = {}) { return normalisePaladinClassName(character?.character_class || character?.className || character?.class) === 'paladin' || getPaladinClassLevel(character) > 0; }

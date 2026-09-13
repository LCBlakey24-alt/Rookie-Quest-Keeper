const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function displayClass(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 'Fighter';
  return raw.slice(0, 1).toUpperCase() + raw.slice(1);
}

export function normaliseClassLevels(character = {}) {
  const saved = character?.class_levels || character?.multiclass_levels || {};
  const entries = Object.entries(saved).filter(([, level]) => Number(level) > 0);
  if (entries.length) {
    return Object.fromEntries(entries.map(([name, level]) => [displayClass(name), Number(level)]));
  }

  const fromClasses = (Array.isArray(character?.classes) ? character.classes : [])
    .map((entry) => [
      entry?.name || entry?.class_name || entry?.character_class || entry?.class,
      Number(entry?.level || entry?.class_level || 0),
    ])
    .filter(([name, level]) => name && level > 0);
  if (fromClasses.length) return Object.fromEntries(fromClasses.map(([name, level]) => [displayClass(name), level]));

  return { [displayClass(character?.character_class || 'Fighter')]: Math.max(1, Number(character?.level || 1)) };
}

export function subclassForClass(character = {}, className = '') {
  const key = normaliseName(className);
  const classEntry = (Array.isArray(character?.classes) ? character.classes : []).find((entry) => (
    normaliseName(entry?.name || entry?.class_name || entry?.character_class || entry?.class) === key
  ));
  if (classEntry?.subclass) return String(classEntry.subclass);

  const map = character?.class_subclasses && typeof character.class_subclasses === 'object'
    ? character.class_subclasses
    : {};
  const mapped = Object.entries(map).find(([name]) => normaliseName(name) === key)?.[1];
  if (mapped) return String(mapped);

  if (normaliseName(character?.character_class) === key) return String(character?.subclass || '');
  return '';
}

export function subclassUnlockLevel(className = '', edition = '2014') {
  if (String(edition).includes('2024')) return 3;
  const key = normaliseName(className);
  if (['cleric', 'sorcerer', 'warlock'].includes(key)) return 1;
  if (['druid', 'wizard'].includes(key)) return 2;
  return 3;
}

export function needsSubclassChoice({ character = {}, className = '', classLevelAfter = 1, edition = '2014' } = {}) {
  return !subclassForClass(character, className) && Number(classLevelAfter) >= subclassUnlockLevel(className, edition);
}

export function classLevelFor(character = {}, className = '') {
  const levels = normaliseClassLevels(character);
  const key = normaliseName(className);
  const match = Object.entries(levels).find(([name]) => normaliseName(name) === key);
  return match ? Number(match[1]) : 0;
}

export function resolveExistingClassName(character = {}, requested = '') {
  const levels = normaliseClassLevels(character);
  const key = normaliseName(requested || character?.character_class || '');
  return Object.keys(levels).find((name) => normaliseName(name) === key) || Object.keys(levels)[0] || 'Fighter';
}

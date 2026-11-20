import { CLASS_FEATURES, getClassFeatures } from './classFeatures';

const normalizeKey = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const SUBCLASS_ALIASES = {
  monk: {
    warrioroftheopenhand: 'wayoftheopenhand',
    wayofopenhand: 'wayoftheopenhand',
    openhand: 'wayoftheopenhand',
  },
  fighter: {
    battlemaster: 'battlemaster',
    championfighter: 'champion',
  },
};

function inferFeatureType(feature = {}) {
  if (feature.type) return feature.type;

  const text = `${feature.name || ''} ${feature.description || ''}`.toLowerCase();
  if (/reaction/.test(text)) return 'reaction';
  if (/bonus action/.test(text)) return 'bonus_action';
  if (/\baction\b|as an action|action:/.test(text)) return 'action';
  if (/when you hit|when you make|when you use|when you attack|after you hit|on hit|attack roll|damage roll/.test(text)) return 'action_modifier';
  return 'passive';
}

function findSubclassData(classData, className, subclassName) {
  if (!classData?.subclasses || !subclassName) return null;

  const classKey = normalizeKey(className);
  const wanted = normalizeKey(subclassName);
  const alias = SUBCLASS_ALIASES[classKey]?.[wanted] || wanted;

  return Object.entries(classData.subclasses).find(([key, subclass]) => {
    const keyName = normalizeKey(key);
    const displayName = normalizeKey(subclass?.name);
    return keyName === alias || displayName === alias || keyName === wanted || displayName === wanted;
  })?.[1] || null;
}

function subclassFeatureTypeOverride(className, subclassName, featureName) {
  const classKey = normalizeKey(className);
  const subclassKey = normalizeKey(subclassName);
  const featureKey = normalizeKey(featureName);

  if (classKey === 'monk' && /openhand|warrioroftheopenhand|wayoftheopenhand/.test(subclassKey)) {
    if (featureKey === 'openhandtechnique') return 'action_modifier';
    if (featureKey === 'wholenessofbody') return 'action';
    if (featureKey === 'tranquility') return 'passive';
    if (featureKey === 'quiveringpalm') return 'action_modifier';
  }

  return null;
}

function primaryClassName(character = {}) {
  return character.character_class || character.class_name || character.className || character.class;
}

/**
 * Each class the character has, with its own class level and subclass.
 * Multiclass saves use class_levels (or multiclass_levels) or a classes
 * array; a single-class save has neither and uses the total level.
 */
function classEntries(character = {}) {
  const primary = primaryClassName(character);
  const primaryKey = normalizeKey(primary);
  const subclassFor = (name) => {
    const entry = (character.classes || []).find((item) => normalizeKey(item?.name || item?.class_name || item?.character_class || item?.class) === normalizeKey(name));
    if (entry?.subclass) return entry.subclass;
    return normalizeKey(name) === primaryKey ? (character.subclass || character.subclass_name || character.subclassName || '') : '';
  };
  const positive = (value) => Math.max(0, Math.floor(Number(value) || 0));

  const map = character.class_levels || character.multiclass_levels || {};
  let entries = Object.entries(map).filter(([, level]) => positive(level) > 0).map(([name, level]) => [name, positive(level)]);
  if (!entries.length) {
    entries = (character.classes || [])
      .map((entry) => [entry?.name || entry?.class_name || entry?.character_class || entry?.class, positive(entry?.level || entry?.class_level)])
      .filter(([name, level]) => name && level > 0);
  }
  if (!entries.length) return primary ? [{ name: primary, level: Math.max(1, positive(character.level) || 1), subclass: subclassFor(primary) }] : [];
  // The primary class first, so a single-class list keeps its old order.
  entries.sort(([a], [b]) => Number(normalizeKey(b) === primaryKey) - Number(normalizeKey(a) === primaryKey));
  return entries.map(([name, level]) => ({ name, level, subclass: subclassFor(name) }));
}

/** One class's features at its own class level (and its subclass's). */
function featuresForClass(className, level, subclassName, edition) {
  const classData = CLASS_FEATURES[String(className || '').toLowerCase()];
  const baseFeatures = getClassFeatures(className, level, edition)
    .map(feature => ({ ...feature, source: feature.source || 'class', type: inferFeatureType(feature) }));

  const subclassData = findSubclassData(classData, className, subclassName);
  const subclassFeatures = (subclassData?.features || [])
    .filter(feature => Number(feature.level || 0) <= level)
    .map(feature => ({
      ...feature,
      type: subclassFeatureTypeOverride(className, subclassData.name, feature.name) || inferFeatureType(feature),
      source: 'subclass',
      subclass: subclassData.name,
    }));

  const visibleBaseFeatures = baseFeatures.filter(feature => feature?.name && !feature.isChoice);
  // Some older class tables only record the level-one subclass choice for a
  // full caster (notably Cleric) even though the class metadata already marks
  // spellcasting as active. Keep snapshots playable without inventing a new
  // rule by surfacing that existing spellcasting capability as a feature.
  if (!visibleBaseFeatures.length && classData?.spellcasting && level >= 1) {
    visibleBaseFeatures.push({
      level: 1,
      name: 'Spellcasting',
      type: 'spellcasting',
      source: 'class',
    });
  }
  return [...visibleBaseFeatures, ...subclassFeatures];
}

/**
 * Class and subclass features, each class at its own class level. A
 * Fighter 1 / Wizard 10 has Fighter level-1 features and Wizard level-10
 * features -- not Action Surge or Extra Attack from treating the total
 * level 11 as Fighter 11 (review finding 9). On a multiclass character
 * each feature carries `sourceClass`.
 */
export function getCharacterClassFeatures(character, editionOverride = null) {
  if (!character) return [];

  const edition = editionOverride || (String(character.rules_edition || character.edition || character.ruleset_id || '').includes('2024') ? '2024' : '2014');
  const classes = classEntries(character);
  const multiclass = classes.length > 1;

  const seen = new Set();
  return classes
    .flatMap(({ name, level, subclass }) => featuresForClass(name, level, subclass, edition)
      .map((feature) => (multiclass ? { ...feature, sourceClass: feature.sourceClass || name } : feature)))
    .filter(feature => feature?.name && !feature.isChoice)
    .filter(feature => {
      const key = `${normalizeKey(feature.sourceClass || '')}-${normalizeKey(feature.name)}-${feature.level || ''}-${feature.source || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
}

export function getCharacterActionFeatures(character, editionOverride = null) {
  return getCharacterClassFeatures(character, editionOverride).filter(feature => (
    feature.type === 'action'
    || feature.type === 'bonus_action'
    || feature.type === 'reaction'
    || feature.type === 'action_modifier'
    || feature.type === 'special'
  ));
}

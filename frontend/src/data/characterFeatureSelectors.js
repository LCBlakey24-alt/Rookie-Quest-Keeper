import { CLASS_FEATURES, getClassFeatures } from '@/data/classFeatures';

const normalizeKey = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const SUBCLASS_ALIASES = {
  monk: {
    warrioroftheopenhand: 'wayoftheopenhand',
    wayofopenhand: 'wayoftheopenhand',
    openhand: 'wayoftheopenhand',
    warriorofshadow: 'wayofshadow',
    shadow: 'wayofshadow',
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

  if (classKey === 'monk' && /shadow|wayofshadow|warriorofshadow/.test(subclassKey)) {
    if (featureKey === 'shadowarts') return 'action';
    if (featureKey === 'shadowstep') return 'bonus_action';
    if (featureKey === 'cloakofshadows') return 'action';
    if (featureKey === 'opportunist') return 'reaction';
  }

  return null;
}

export function getCharacterClassFeatures(character, editionOverride = null) {
  if (!character) return [];

  const className = character.character_class || character.class_name || character.className || character.class;
  const level = Number(character.level || 1);
  const edition = editionOverride || (String(character.rules_edition || character.edition || character.ruleset_id || '').includes('2024') ? '2024' : '2014');
  const classData = CLASS_FEATURES[String(className || '').toLowerCase()];
  const baseFeatures = getClassFeatures(className, level, edition)
    .map(feature => ({ ...feature, source: feature.source || 'class', type: inferFeatureType(feature) }));

  const subclassData = findSubclassData(classData, className, character.subclass || character.subclass_name || character.subclassName);
  const subclassFeatures = (subclassData?.features || [])
    .filter(feature => Number(feature.level || 0) <= level)
    .map(feature => ({
      ...feature,
      type: subclassFeatureTypeOverride(className, subclassData.name, feature.name) || inferFeatureType(feature),
      source: 'subclass',
      subclass: subclassData.name,
    }));

  const seen = new Set();
  return [...baseFeatures, ...subclassFeatures]
    .filter(feature => feature?.name && !feature.isChoice)
    .filter(feature => {
      const key = `${normalizeKey(feature.name)}-${feature.level || ''}-${feature.source || ''}`;
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

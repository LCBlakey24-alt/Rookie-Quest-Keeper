export const DRUID_SUBCLASS_FEATURE_LEVELS_2014 = [2, 6, 10, 14];
export const DRUID_SUBCLASS_FEATURE_LEVELS_2024 = [3, 6, 10, 14];
export const DRUID_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseDruidRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getDruidSpellcastingLevel(level = 1) {
  const druidLevel = Math.max(0, Number(level || 0));
  return Math.floor(druidLevel);
}

export function getDruidSubclassChoiceLevel(edition = '2014') {
  return normaliseDruidRulesEdition(edition) === '2024' ? 3 : 2;
}

export function getDruidSubclassFeatureLevels(edition = '2014') {
  return normaliseDruidRulesEdition(edition) === '2024'
    ? DRUID_SUBCLASS_FEATURE_LEVELS_2024
    : DRUID_SUBCLASS_FEATURE_LEVELS_2014;
}

export function getDruidWildShapeUses(level = 1) {
  const druidLevel = Math.max(0, Number(level || 0));
  return druidLevel >= 2 ? 2 : 0;
}

export function getDruidWildShapeLimit(level = 1, edition = '2014') {
  const druidLevel = Math.max(0, Number(level || 0));
  const ruleset = normaliseDruidRulesEdition(edition);

  if (druidLevel < 2) return null;
  if (ruleset === '2024') return '2024 Wild Shape forms online';
  if (druidLevel >= 8) return 'CR 1 beast forms';
  if (druidLevel >= 4) return 'CR 1/2 beast forms; no flying speed';
  return 'CR 1/4 beast forms; no swimming or flying speed';
}

function asiFeature(level) {
  return {
    level,
    key: level === 19 ? 'epic_boon_or_asi' : `ability_score_improvement_${level}`,
    name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat',
    type: 'choice',
    choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat',
  };
}

const DRUID_FEATURES_2014 = [
  { level: 1, key: 'druidic', name: 'Druidic', type: 'core' },
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 2, key: 'wild_shape', name: 'Wild Shape', type: 'resource', resource: 'wild_shape' },
  { level: 2, key: 'druid_circle', name: 'Druid Circle', type: 'choice', choiceType: 'subclass' },
  { level: 4, key: 'wild_shape_improvement_4', name: 'Wild Shape Improvement', type: 'resource' },
  { level: 6, key: 'druid_circle_feature_6', name: 'Druid Circle Feature', type: 'subclass' },
  { level: 8, key: 'wild_shape_improvement_8', name: 'Wild Shape Improvement', type: 'resource' },
  { level: 10, key: 'druid_circle_feature_10', name: 'Druid Circle Feature', type: 'subclass' },
  { level: 14, key: 'druid_circle_feature_14', name: 'Druid Circle Feature', type: 'subclass' },
  { level: 18, key: 'timeless_body', name: 'Timeless Body', type: 'core' },
  { level: 18, key: 'beast_spells', name: 'Beast Spells', type: 'spellcasting' },
  { level: 20, key: 'archdruid', name: 'Archdruid', type: 'capstone' },
  ...DRUID_ASI_LEVELS.map(asiFeature),
];

const DRUID_FEATURES_2024 = [
  { level: 1, key: 'druidic', name: 'Druidic', type: 'core' },
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 1, key: 'primal_order', name: 'Primal Order', type: 'choice', choiceType: 'primal_order' },
  { level: 2, key: 'wild_shape', name: 'Wild Shape', type: 'resource', resource: 'wild_shape' },
  { level: 2, key: 'wild_companion', name: 'Wild Companion', type: 'utility' },
  { level: 3, key: 'druid_subclass', name: 'Druid Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'wild_resurgence', name: 'Wild Resurgence', type: 'recovery' },
  { level: 6, key: 'subclass_feature_6', name: 'Druid Subclass Feature', type: 'subclass' },
  { level: 7, key: 'elemental_fury', name: 'Elemental Fury', type: 'choice', choiceType: 'elemental_fury' },
  { level: 10, key: 'subclass_feature_10', name: 'Druid Subclass Feature', type: 'subclass' },
  { level: 14, key: 'subclass_feature_14', name: 'Druid Subclass Feature', type: 'subclass' },
  { level: 15, key: 'improved_elemental_fury', name: 'Improved Elemental Fury', type: 'core' },
  { level: 18, key: 'beast_spells', name: 'Beast Spells', type: 'spellcasting' },
  { level: 20, key: 'archdruid', name: 'Archdruid', type: 'capstone' },
  ...DRUID_ASI_LEVELS.map(asiFeature),
];

export function getDruidProgression(edition = '2014') {
  return normaliseDruidRulesEdition(edition) === '2024' ? DRUID_FEATURES_2024 : DRUID_FEATURES_2014;
}

export function getDruidFeaturesForLevel(level = 1, edition = '2014') {
  const druidLevel = Math.max(1, Number(level || 1));
  return getDruidProgression(edition).filter(feature => feature.level === druidLevel);
}

export function getActiveDruidFeatures(level = 1, edition = '2014') {
  const druidLevel = Math.max(1, Number(level || 1));
  return getDruidProgression(edition).filter(feature => feature.level <= druidLevel);
}

export function getDruidChoicesForLevel(level = 1, edition = '2014') {
  return getDruidFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextDruidFeatures(level = 1, edition = '2014') {
  const druidLevel = Math.max(1, Number(level || 1));
  const nextLevel = getDruidProgression(edition).find(feature => feature.level > druidLevel)?.level;
  return nextLevel ? getDruidFeaturesForLevel(nextLevel, edition) : [];
}

export function getDruidProgressionSummary(level = 1, edition = '2014') {
  const druidLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseDruidRulesEdition(edition);

  return {
    className: 'Druid',
    edition: ruleset,
    level: druidLevel,
    spellcastingLevel: getDruidSpellcastingLevel(druidLevel),
    wildShapeUses: getDruidWildShapeUses(druidLevel, ruleset),
    wildShapeLimit: getDruidWildShapeLimit(druidLevel, ruleset),
    subclassChoiceLevel: getDruidSubclassChoiceLevel(ruleset),
    subclassFeatureLevels: getDruidSubclassFeatureLevels(ruleset),
    currentLevelFeatures: getDruidFeaturesForLevel(druidLevel, ruleset),
    activeFeatures: getActiveDruidFeatures(druidLevel, ruleset),
    nextFeatures: getNextDruidFeatures(druidLevel, ruleset),
    choices: getActiveDruidFeatures(druidLevel, ruleset).filter(feature => feature.type === 'choice'),
  };
}

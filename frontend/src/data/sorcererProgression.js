export const SORCERER_SUBCLASS_FEATURE_LEVELS_2014 = [1, 6, 14, 18];
export const SORCERER_SUBCLASS_FEATURE_LEVELS_2024 = [3, 6, 14, 18];
export const SORCERER_ASI_LEVELS = [4, 8, 12, 16, 19];
export const SORCERER_METAMAGIC_LEVELS = [3, 10, 17];

export function normaliseSorcererRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getSorcererSpellcastingLevel(level = 1) {
  return Math.max(0, Math.floor(Number(level || 0)));
}

export function getSorcererSubclassChoiceLevel(edition = '2014') {
  return normaliseSorcererRulesEdition(edition) === '2024' ? 3 : 1;
}

export function getSorcererSubclassFeatureLevels(edition = '2014') {
  return normaliseSorcererRulesEdition(edition) === '2024'
    ? SORCERER_SUBCLASS_FEATURE_LEVELS_2024
    : SORCERER_SUBCLASS_FEATURE_LEVELS_2014;
}

export function getSorceryPointMaximum(level = 1) {
  const sorcererLevel = Math.max(0, Number(level || 0));
  return sorcererLevel >= 2 ? sorcererLevel : 0;
}

export function getSorcererMetamagicCount(level = 1, edition = '2014') {
  const sorcererLevel = Math.max(0, Number(level || 0));
  const ruleset = normaliseSorcererRulesEdition(edition);
  if (sorcererLevel < 3) return 0;

  if (ruleset === '2024') {
    if (sorcererLevel >= 17) return 6;
    if (sorcererLevel >= 10) return 4;
    return 2;
  }

  if (sorcererLevel >= 17) return 4;
  if (sorcererLevel >= 10) return 3;
  return 2;
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

const SORCERER_FEATURES_2014 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 1, key: 'sorcerous_origin', name: 'Sorcerous Origin', type: 'choice', choiceType: 'subclass' },
  { level: 2, key: 'font_of_magic', name: 'Font of Magic', type: 'resource' },
  { level: 3, key: 'metamagic', name: 'Metamagic', type: 'choice', choiceType: 'metamagic' },
  { level: 6, key: 'origin_feature_6', name: 'Origin Feature', type: 'subclass' },
  { level: 14, key: 'origin_feature_14', name: 'Origin Feature', type: 'subclass' },
  { level: 18, key: 'origin_feature_18', name: 'Origin Feature', type: 'subclass' },
  { level: 20, key: 'sorcerous_restoration', name: 'Sorcerous Restoration', type: 'recovery' },
  ...SORCERER_ASI_LEVELS.map(asiFeature),
];

const SORCERER_FEATURES_2024 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 1, key: 'innate_sorcery', name: 'Innate Sorcery', type: 'resource' },
  { level: 2, key: 'font_of_magic', name: 'Font of Magic', type: 'resource' },
  { level: 2, key: 'metamagic', name: 'Metamagic', type: 'choice', choiceType: 'metamagic' },
  { level: 3, key: 'sorcerer_subclass', name: 'Sorcerer Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'sorcerous_restoration', name: 'Sorcerous Restoration', type: 'recovery' },
  { level: 6, key: 'subclass_feature_6', name: 'Sorcerer Subclass Feature', type: 'subclass' },
  { level: 7, key: 'sorcery_incarnate', name: 'Sorcery Incarnate', type: 'resource' },
  { level: 14, key: 'subclass_feature_14', name: 'Sorcerer Subclass Feature', type: 'subclass' },
  { level: 18, key: 'subclass_feature_18', name: 'Sorcerer Subclass Feature', type: 'subclass' },
  { level: 20, key: 'epic_boon_or_asi', name: 'Epic Boon / Ability Score Improvement', type: 'choice', choiceType: 'epic_boon_or_asi' },
  ...SORCERER_ASI_LEVELS.filter(level => level !== 19).map(asiFeature),
];

export function getSorcererProgression(edition = '2014') {
  return normaliseSorcererRulesEdition(edition) === '2024' ? SORCERER_FEATURES_2024 : SORCERER_FEATURES_2014;
}

export function getSorcererFeaturesForLevel(level = 1, edition = '2014') {
  const sorcererLevel = Math.max(1, Number(level || 1));
  return getSorcererProgression(edition).filter(feature => feature.level === sorcererLevel);
}

export function getActiveSorcererFeatures(level = 1, edition = '2014') {
  const sorcererLevel = Math.max(1, Number(level || 1));
  return getSorcererProgression(edition).filter(feature => feature.level <= sorcererLevel);
}

export function getSorcererChoicesForLevel(level = 1, edition = '2014') {
  return getSorcererFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextSorcererFeatures(level = 1, edition = '2014') {
  const sorcererLevel = Math.max(1, Number(level || 1));
  const nextLevel = getSorcererProgression(edition).find(feature => feature.level > sorcererLevel)?.level;
  return nextLevel ? getSorcererFeaturesForLevel(nextLevel, edition) : [];
}

export function getSorcererProgressionSummary(level = 1, edition = '2014') {
  const sorcererLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseSorcererRulesEdition(edition);

  return {
    className: 'Sorcerer',
    edition: ruleset,
    level: sorcererLevel,
    spellcastingLevel: getSorcererSpellcastingLevel(sorcererLevel),
    sorceryPointMaximum: getSorceryPointMaximum(sorcererLevel),
    metamagicCount: getSorcererMetamagicCount(sorcererLevel, ruleset),
    subclassChoiceLevel: getSorcererSubclassChoiceLevel(ruleset),
    subclassFeatureLevels: getSorcererSubclassFeatureLevels(ruleset),
    currentLevelFeatures: getSorcererFeaturesForLevel(sorcererLevel, ruleset),
    activeFeatures: getActiveSorcererFeatures(sorcererLevel, ruleset),
    nextFeatures: getNextSorcererFeatures(sorcererLevel, ruleset),
    choices: getActiveSorcererFeatures(sorcererLevel, ruleset).filter(feature => feature.type === 'choice'),
  };
}

export const BARD_SUBCLASS_FEATURE_LEVELS = [3, 6, 14];
export const BARD_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseBardRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getBardicInspirationDie(level = 1, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  const rules = normaliseBardRulesEdition(edition);

  if (rules === '2024') {
    if (bardLevel >= 15) return 'd12';
    if (bardLevel >= 10) return 'd10';
    if (bardLevel >= 5) return 'd8';
    return 'd6';
  }

  if (bardLevel >= 15) return 'd12';
  if (bardLevel >= 10) return 'd10';
  if (bardLevel >= 5) return 'd8';
  return 'd6';
}

export function getBardicInspirationUses(level = 1, charismaModifier = 0, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  const modifier = Number(charismaModifier || 0);
  const rules = normaliseBardRulesEdition(edition);

  if (rules === '2024') {
    return Math.max(1, modifier);
  }

  return bardLevel >= 1 ? Math.max(1, modifier) : 0;
}

export function getBardSpellcastingLevel(level = 1) {
  return Math.max(1, Number(level || 1));
}

function asiFeature(level) {
  return {
    level,
    key: level === 19 ? 'epic_boon_or_asi' : `asi_${level}`,
    name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat',
    type: 'choice',
    choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat',
  };
}

const BARD_FEATURES_2014 = [
  { level: 1, key: 'bardic_inspiration', name: 'Bardic Inspiration', type: 'resource', resource: 'bardic_inspiration' },
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 2, key: 'jack_of_all_trades', name: 'Jack of All Trades', type: 'skill' },
  { level: 2, key: 'song_of_rest', name: 'Song of Rest', type: 'recovery' },
  { level: 3, key: 'bard_college', name: 'Bard College', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'expertise', name: 'Expertise', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 5, key: 'font_of_inspiration', name: 'Font of Inspiration', type: 'resource' },
  { level: 6, key: 'countercharm', name: 'Countercharm', type: 'support' },
  { level: 10, key: 'expertise_improvement', name: 'Expertise Improvement', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 10, key: 'magical_secrets', name: 'Magical Secrets', type: 'choice', choiceType: 'magical_secrets', choices: 2 },
  { level: 18, key: 'greater_magical_secrets', name: 'Greater Magical Secrets', type: 'choice', choiceType: 'magical_secrets', choices: 2 },
  { level: 20, key: 'superior_inspiration', name: 'Superior Inspiration', type: 'capstone' },
  ...BARD_ASI_LEVELS.map(asiFeature),
];

const BARD_FEATURES_2024 = [
  { level: 1, key: 'bardic_inspiration', name: 'Bardic Inspiration', type: 'resource', resource: 'bardic_inspiration' },
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 2, key: 'expertise', name: 'Expertise', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 2, key: 'jack_of_all_trades', name: 'Jack of All Trades', type: 'skill' },
  { level: 3, key: 'bard_subclass', name: 'Bard Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'font_of_inspiration', name: 'Font of Inspiration', type: 'resource' },
  { level: 7, key: 'countercharm', name: 'Countercharm', type: 'support' },
  { level: 9, key: 'expertise_improvement', name: 'Expertise Improvement', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 10, key: 'magical_secrets', name: 'Magical Secrets', type: 'choice', choiceType: 'magical_secrets', choices: 2 },
  { level: 18, key: 'superior_inspiration', name: 'Superior Inspiration', type: 'capstone' },
  { level: 20, key: 'words_of_creation', name: 'Words of Creation', type: 'capstone' },
  ...BARD_ASI_LEVELS.map(asiFeature),
];

function getFeatureTable(edition = '2014') {
  return normaliseBardRulesEdition(edition) === '2024' ? BARD_FEATURES_2024 : BARD_FEATURES_2014;
}

export function getBardProgression(edition = '2014') {
  return getFeatureTable(edition).slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function getBardFeaturesForLevel(level = 1, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  return getBardProgression(edition).filter(feature => feature.level === bardLevel);
}

export function getActiveBardFeatures(level = 1, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  return getBardProgression(edition).filter(feature => feature.level <= bardLevel);
}

export function getBardChoicesForLevel(level = 1, edition = '2014') {
  return getBardFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextBardFeatures(level = 1, edition = '2014') {
  const bardLevel = Math.max(1, Number(level || 1));
  const nextLevel = getBardProgression(edition).find(feature => feature.level > bardLevel)?.level;
  return nextLevel ? getBardFeaturesForLevel(nextLevel, edition) : [];
}

export function getBardProgressionSummary(level = 1, edition = '2014', charismaModifier = 0) {
  const bardLevel = Math.max(1, Number(level || 1));
  const rules = normaliseBardRulesEdition(edition);

  return {
    edition: rules,
    level: bardLevel,
    bardicInspirationDie: getBardicInspirationDie(bardLevel, rules),
    bardicInspirationUses: getBardicInspirationUses(bardLevel, charismaModifier, rules),
    spellcastingLevel: getBardSpellcastingLevel(bardLevel),
    currentLevelFeatures: getBardFeaturesForLevel(bardLevel, rules),
    activeFeatures: getActiveBardFeatures(bardLevel, rules),
    choices: getBardChoicesForLevel(bardLevel, rules),
    nextFeatures: getNextBardFeatures(bardLevel, rules),
    subclassFeatureLevels: BARD_SUBCLASS_FEATURE_LEVELS,
  };
}

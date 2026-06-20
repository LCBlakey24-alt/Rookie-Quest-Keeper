export const WARLOCK_SUBCLASS_FEATURE_LEVELS_2014 = [1, 6, 10, 14];
export const WARLOCK_SUBCLASS_FEATURE_LEVELS_2024 = [3, 6, 10, 14];
export const WARLOCK_ASI_LEVELS = [4, 8, 12, 16, 19];
export const WARLOCK_MYSTIC_ARCANUM_LEVELS = [11, 13, 15, 17];

export function normaliseWarlockRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getWarlockSubclassChoiceLevel(edition = '2014') {
  return normaliseWarlockRulesEdition(edition) === '2024' ? 3 : 1;
}

export function getWarlockSubclassFeatureLevels(edition = '2014') {
  return normaliseWarlockRulesEdition(edition) === '2024'
    ? WARLOCK_SUBCLASS_FEATURE_LEVELS_2024
    : WARLOCK_SUBCLASS_FEATURE_LEVELS_2014;
}

export function getWarlockPactMagicSlotLevel(level = 1) {
  const warlockLevel = Math.max(0, Number(level || 0));
  if (warlockLevel < 1) return 0;
  if (warlockLevel >= 9) return 5;
  if (warlockLevel >= 7) return 4;
  if (warlockLevel >= 5) return 3;
  if (warlockLevel >= 3) return 2;
  return 1;
}

export function getWarlockPactMagicSlots(level = 1) {
  const warlockLevel = Math.max(0, Number(level || 0));
  if (warlockLevel < 1) return 0;
  if (warlockLevel >= 17) return 4;
  if (warlockLevel >= 11) return 3;
  if (warlockLevel >= 2) return 2;
  return 1;
}

export function getWarlockInvocationCount(level = 1, edition = '2014') {
  const warlockLevel = Math.max(0, Number(level || 0));
  const ruleset = normaliseWarlockRulesEdition(edition);
  if (warlockLevel < 1) return 0;

  if (ruleset === '2024') {
    if (warlockLevel >= 18) return 10;
    if (warlockLevel >= 15) return 9;
    if (warlockLevel >= 12) return 8;
    if (warlockLevel >= 9) return 7;
    if (warlockLevel >= 5) return 5;
    if (warlockLevel >= 2) return 3;
    return 1;
  }

  if (warlockLevel < 2) return 0;
  if (warlockLevel >= 18) return 8;
  if (warlockLevel >= 15) return 7;
  if (warlockLevel >= 12) return 6;
  if (warlockLevel >= 9) return 5;
  if (warlockLevel >= 7) return 4;
  if (warlockLevel >= 5) return 3;
  return 2;
}

export function getWarlockMysticArcanumLevels(level = 1) {
  const warlockLevel = Math.max(0, Number(level || 0));
  return WARLOCK_MYSTIC_ARCANUM_LEVELS.filter(featureLevel => featureLevel <= warlockLevel);
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

const WARLOCK_FEATURES_2014 = [
  { level: 1, key: 'otherworldly_patron', name: 'Otherworldly Patron', type: 'choice', choiceType: 'subclass' },
  { level: 1, key: 'pact_magic', name: 'Pact Magic', type: 'spellcasting' },
  { level: 2, key: 'eldritch_invocations', name: 'Eldritch Invocations', type: 'choice', choiceType: 'eldritch_invocations' },
  { level: 3, key: 'pact_boon', name: 'Pact Boon', type: 'choice', choiceType: 'pact_boon' },
  { level: 6, key: 'patron_feature_6', name: 'Patron Feature', type: 'subclass' },
  { level: 10, key: 'patron_feature_10', name: 'Patron Feature', type: 'subclass' },
  { level: 11, key: 'mystic_arcanum_6', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 13, key: 'mystic_arcanum_7', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 14, key: 'patron_feature_14', name: 'Patron Feature', type: 'subclass' },
  { level: 15, key: 'mystic_arcanum_8', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 17, key: 'mystic_arcanum_9', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 20, key: 'eldritch_master', name: 'Eldritch Master', type: 'recovery' },
  ...WARLOCK_ASI_LEVELS.map(asiFeature),
];

const WARLOCK_FEATURES_2024 = [
  { level: 1, key: 'pact_magic', name: 'Pact Magic', type: 'spellcasting' },
  { level: 1, key: 'eldritch_invocations', name: 'Eldritch Invocations', type: 'choice', choiceType: 'eldritch_invocations' },
  { level: 2, key: 'magical_cunning', name: 'Magical Cunning', type: 'recovery' },
  { level: 3, key: 'warlock_subclass', name: 'Warlock Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'pact_boon', name: 'Pact Boon', type: 'choice', choiceType: 'pact_boon' },
  { level: 6, key: 'subclass_feature_6', name: 'Warlock Subclass Feature', type: 'subclass' },
  { level: 10, key: 'subclass_feature_10', name: 'Warlock Subclass Feature', type: 'subclass' },
  { level: 11, key: 'mystic_arcanum_6', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 13, key: 'mystic_arcanum_7', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 14, key: 'subclass_feature_14', name: 'Warlock Subclass Feature', type: 'subclass' },
  { level: 15, key: 'mystic_arcanum_8', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 17, key: 'mystic_arcanum_9', name: 'Mystic Arcanum', type: 'spellcasting' },
  { level: 20, key: 'epic_boon_or_asi', name: 'Epic Boon / Ability Score Improvement', type: 'choice', choiceType: 'epic_boon_or_asi' },
  ...WARLOCK_ASI_LEVELS.filter(level => level !== 19).map(asiFeature),
];

export function getWarlockProgression(edition = '2014') {
  return normaliseWarlockRulesEdition(edition) === '2024' ? WARLOCK_FEATURES_2024 : WARLOCK_FEATURES_2014;
}

export function getWarlockFeaturesForLevel(level = 1, edition = '2014') {
  const warlockLevel = Math.max(1, Number(level || 1));
  return getWarlockProgression(edition).filter(feature => feature.level === warlockLevel);
}

export function getActiveWarlockFeatures(level = 1, edition = '2014') {
  const warlockLevel = Math.max(1, Number(level || 1));
  return getWarlockProgression(edition).filter(feature => feature.level <= warlockLevel);
}

export function getWarlockChoicesForLevel(level = 1, edition = '2014') {
  return getWarlockFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextWarlockFeatures(level = 1, edition = '2014') {
  const warlockLevel = Math.max(1, Number(level || 1));
  const nextLevel = getWarlockProgression(edition).find(feature => feature.level > warlockLevel)?.level;
  return nextLevel ? getWarlockFeaturesForLevel(nextLevel, edition) : [];
}

export function getWarlockProgressionSummary(level = 1, edition = '2014') {
  const warlockLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWarlockRulesEdition(edition);

  return {
    className: 'Warlock',
    edition: ruleset,
    level: warlockLevel,
    pactMagicSlots: getWarlockPactMagicSlots(warlockLevel),
    pactMagicSlotLevel: getWarlockPactMagicSlotLevel(warlockLevel),
    invocationCount: getWarlockInvocationCount(warlockLevel, ruleset),
    mysticArcanumLevels: getWarlockMysticArcanumLevels(warlockLevel),
    subclassChoiceLevel: getWarlockSubclassChoiceLevel(ruleset),
    subclassFeatureLevels: getWarlockSubclassFeatureLevels(ruleset),
    currentLevelFeatures: getWarlockFeaturesForLevel(warlockLevel, ruleset),
    activeFeatures: getActiveWarlockFeatures(warlockLevel, ruleset),
    nextFeatures: getNextWarlockFeatures(warlockLevel, ruleset),
    choices: getActiveWarlockFeatures(warlockLevel, ruleset).filter(feature => feature.type === 'choice'),
  };
}

export const BARBARIAN_SUBCLASS_FEATURE_LEVELS = [3, 6, 10, 14];

export function normaliseBarbarianRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getBarbarianRageUses(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseBarbarianRulesEdition(edition);

  if (ruleset === '2024') {
    if (barbarianLevel >= 17) return 6;
    if (barbarianLevel >= 12) return 5;
    if (barbarianLevel >= 6) return 4;
    if (barbarianLevel >= 3) return 3;
    return 2;
  }

  if (barbarianLevel >= 20) return Infinity;
  if (barbarianLevel >= 17) return 6;
  if (barbarianLevel >= 12) return 5;
  if (barbarianLevel >= 6) return 4;
  if (barbarianLevel >= 3) return 3;
  return 2;
}

export function getBarbarianRageDamageBonus(level = 1) {
  const barbarianLevel = Math.max(1, Number(level || 1));
  if (barbarianLevel >= 16) return 4;
  if (barbarianLevel >= 9) return 3;
  return 2;
}

export function getBarbarianBrutalCriticalDice(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseBarbarianRulesEdition(edition);

  if (ruleset === '2024') return barbarianLevel >= 9 ? 1 : 0;
  if (barbarianLevel >= 17) return 3;
  if (barbarianLevel >= 13) return 2;
  if (barbarianLevel >= 9) return 1;
  return 0;
}

const BARBARIAN_FEATURES_2014 = [
  { level: 1, key: 'rage', name: 'Rage', type: 'resource' },
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive' },
  { level: 2, key: 'reckless_attack', name: 'Reckless Attack', type: 'passive' },
  { level: 2, key: 'danger_sense', name: 'Danger Sense', type: 'passive' },
  { level: 3, key: 'primal_path', name: 'Primal Path', type: 'choice', choiceType: 'subclass' },
  { level: 4, key: 'asi_4', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' },
  { level: 5, key: 'fast_movement', name: 'Fast Movement', type: 'passive' },
  { level: 6, key: 'subclass_6', name: 'Subclass Feature', type: 'subclass' },
  { level: 7, key: 'feral_instinct', name: 'Feral Instinct', type: 'passive' },
  { level: 8, key: 'asi_8', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 9, key: 'brutal_critical_1', name: 'Brutal Critical', type: 'passive', dice: 1 },
  { level: 10, key: 'subclass_10', name: 'Subclass Feature', type: 'subclass' },
  { level: 11, key: 'relentless_rage', name: 'Relentless Rage', type: 'passive' },
  { level: 12, key: 'asi_12', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 13, key: 'brutal_critical_2', name: 'Brutal Critical (2 dice)', type: 'passive', dice: 2, replaces: 'brutal_critical_1' },
  { level: 14, key: 'subclass_14', name: 'Subclass Feature', type: 'subclass' },
  { level: 15, key: 'persistent_rage', name: 'Persistent Rage', type: 'passive' },
  { level: 16, key: 'asi_16', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'brutal_critical_3', name: 'Brutal Critical (3 dice)', type: 'passive', dice: 3, replaces: 'brutal_critical_2' },
  { level: 18, key: 'indomitable_might', name: 'Indomitable Might', type: 'passive' },
  { level: 19, key: 'asi_19', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 20, key: 'primal_champion', name: 'Primal Champion', type: 'capstone' },
];

const BARBARIAN_FEATURES_2024 = [
  { level: 1, key: 'rage', name: 'Rage', type: 'resource' },
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive' },
  { level: 1, key: 'weapon_mastery_2', name: 'Weapon Mastery', type: 'choice', choiceType: 'weapon_mastery', choices: 2 },
  { level: 2, key: 'danger_sense', name: 'Danger Sense', type: 'passive' },
  { level: 2, key: 'reckless_attack', name: 'Reckless Attack', type: 'passive' },
  { level: 3, key: 'barbarian_subclass', name: 'Barbarian Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'primal_knowledge', name: 'Primal Knowledge', type: 'passive' },
  { level: 4, key: 'asi_4', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' },
  { level: 5, key: 'fast_movement', name: 'Fast Movement', type: 'passive' },
  { level: 6, key: 'subclass_6', name: 'Subclass Feature', type: 'subclass' },
  { level: 7, key: 'feral_instinct', name: 'Feral Instinct', type: 'passive' },
  { level: 7, key: 'instinctive_pounce', name: 'Instinctive Pounce', type: 'passive' },
  { level: 8, key: 'asi_8', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 9, key: 'brutal_strike', name: 'Brutal Strike', type: 'passive' },
  { level: 10, key: 'subclass_10', name: 'Subclass Feature', type: 'subclass' },
  { level: 11, key: 'relentless_rage', name: 'Relentless Rage', type: 'passive' },
  { level: 12, key: 'asi_12', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 13, key: 'improved_brutal_strike', name: 'Improved Brutal Strike', type: 'passive' },
  { level: 14, key: 'subclass_14', name: 'Subclass Feature', type: 'subclass' },
  { level: 15, key: 'persistent_rage', name: 'Persistent Rage', type: 'passive' },
  { level: 16, key: 'asi_16', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'improved_brutal_strike_2', name: 'Improved Brutal Strike (2)', type: 'passive' },
  { level: 18, key: 'indomitable_might', name: 'Indomitable Might', type: 'passive' },
  { level: 19, key: 'epic_boon', name: 'Epic Boon / Ability Score Improvement', type: 'choice', choiceType: 'epic_boon_or_asi' },
  { level: 20, key: 'primal_champion', name: 'Primal Champion', type: 'capstone' },
];

export function getBarbarianProgression(edition = '2014') {
  return normaliseBarbarianRulesEdition(edition) === '2024' ? BARBARIAN_FEATURES_2024 : BARBARIAN_FEATURES_2014;
}

export function getBarbarianFeaturesForLevel(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  return getBarbarianProgression(edition).filter(feature => feature.level === barbarianLevel);
}

export function getActiveBarbarianFeatures(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  const unlocked = getBarbarianProgression(edition).filter(feature => feature.level <= barbarianLevel);
  const replacedKeys = new Set(unlocked.map(feature => feature.replaces).filter(Boolean));
  return unlocked.filter(feature => !replacedKeys.has(feature.key));
}

export function getBarbarianChoicesForLevel(level = 1, edition = '2014') {
  return getBarbarianFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextBarbarianFeatures(level = 1, edition = '2014') {
  const barbarianLevel = Math.max(1, Number(level || 1));
  return getBarbarianProgression(edition).filter(feature => feature.level > barbarianLevel).slice(0, 3);
}

export function getBarbarianProgressionSummary(level = 1, edition = '2014') {
  return {
    edition: normaliseBarbarianRulesEdition(edition),
    level: Math.max(1, Number(level || 1)),
    rageUses: getBarbarianRageUses(level, edition),
    rageDamageBonus: getBarbarianRageDamageBonus(level),
    brutalCriticalDice: getBarbarianBrutalCriticalDice(level, edition),
    currentLevelFeatures: getBarbarianFeaturesForLevel(level, edition),
    activeFeatures: getActiveBarbarianFeatures(level, edition),
    choicesThisLevel: getBarbarianChoicesForLevel(level, edition),
    nextFeatures: getNextBarbarianFeatures(level, edition),
  };
}

// Fighter progression helpers for 2014 and 2024 rules.
// This keeps Fighter level unlocks in one place so the builder, sheet, and tests can agree.

export const FIGHTER_ASI_LEVELS_2014 = [4, 6, 8, 12, 14, 16, 19];
export const FIGHTER_ASI_LEVELS_2024 = [4, 6, 8, 12, 14, 16];
export const FIGHTER_SUBCLASS_FEATURE_LEVELS = [3, 7, 10, 15, 18];

export function normaliseFighterRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getFighterAttacksPerAction(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  if (fighterLevel >= 20) return 4;
  if (fighterLevel >= 11) return 3;
  if (fighterLevel >= 5) return 2;
  return 1;
}

export function getFighterActionSurgeUses(level = 1) {
  return Number(level || 1) >= 17 ? 2 : Number(level || 1) >= 2 ? 1 : 0;
}

export function getFighterIndomitableUses(level = 1) {
  const fighterLevel = Number(level || 1);
  if (fighterLevel >= 17) return 3;
  if (fighterLevel >= 13) return 2;
  if (fighterLevel >= 9) return 1;
  return 0;
}

const FIGHTER_FEATURES_2014 = [
  { level: 1, key: 'fighting_style', name: 'Fighting Style', type: 'choice', choiceType: 'fighting_style' },
  { level: 1, key: 'second_wind', name: 'Second Wind', type: 'resource' },
  { level: 2, key: 'action_surge', name: 'Action Surge', type: 'resource' },
  { level: 3, key: 'martial_archetype', name: 'Martial Archetype', type: 'choice', choiceType: 'subclass' },
  { level: 4, key: 'asi_4', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 5, key: 'extra_attack_1', name: 'Extra Attack', type: 'passive', attacksPerAction: 2 },
  { level: 6, key: 'asi_6', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 7, key: 'subclass_7', name: 'Subclass Feature', type: 'subclass' },
  { level: 8, key: 'asi_8', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 9, key: 'indomitable_1', name: 'Indomitable', type: 'resource', uses: 1 },
  { level: 10, key: 'subclass_10', name: 'Subclass Feature', type: 'subclass' },
  { level: 11, key: 'extra_attack_2', name: 'Extra Attack (2)', type: 'passive', attacksPerAction: 3, replaces: 'extra_attack_1' },
  { level: 12, key: 'asi_12', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 13, key: 'indomitable_2', name: 'Indomitable (2 uses)', type: 'resource', uses: 2, replaces: 'indomitable_1' },
  { level: 14, key: 'asi_14', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 15, key: 'subclass_15', name: 'Subclass Feature', type: 'subclass' },
  { level: 16, key: 'asi_16', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'action_surge_2', name: 'Action Surge (2 uses)', type: 'resource', uses: 2, replaces: 'action_surge' },
  { level: 17, key: 'indomitable_3', name: 'Indomitable (3 uses)', type: 'resource', uses: 3, replaces: 'indomitable_2' },
  { level: 18, key: 'subclass_18', name: 'Subclass Feature', type: 'subclass' },
  { level: 19, key: 'asi_19', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 20, key: 'extra_attack_3', name: 'Extra Attack (3)', type: 'passive', attacksPerAction: 4, replaces: 'extra_attack_2' },
];

const FIGHTER_FEATURES_2024 = [
  { level: 1, key: 'fighting_style', name: 'Fighting Style Feat', type: 'choice', choiceType: 'fighting_style' },
  { level: 1, key: 'second_wind', name: 'Second Wind', type: 'resource' },
  { level: 1, key: 'weapon_mastery_3', name: 'Weapon Mastery', type: 'choice', choiceType: 'weapon_mastery', choices: 3 },
  { level: 2, key: 'action_surge', name: 'Action Surge', type: 'resource' },
  { level: 2, key: 'tactical_mind', name: 'Tactical Mind', type: 'passive' },
  { level: 3, key: 'martial_archetype', name: 'Fighter Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 4, key: 'asi_4', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 4, key: 'weapon_mastery_4', name: 'Weapon Mastery (4)', type: 'choice', choiceType: 'weapon_mastery', choices: 4, replaces: 'weapon_mastery_3' },
  { level: 5, key: 'extra_attack_1', name: 'Extra Attack', type: 'passive', attacksPerAction: 2 },
  { level: 5, key: 'tactical_shift', name: 'Tactical Shift', type: 'passive' },
  { level: 6, key: 'asi_6', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 7, key: 'subclass_7', name: 'Subclass Feature', type: 'subclass' },
  { level: 8, key: 'asi_8', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 9, key: 'indomitable_1', name: 'Indomitable', type: 'resource', uses: 1 },
  { level: 9, key: 'tactical_master', name: 'Tactical Master', type: 'passive' },
  { level: 10, key: 'subclass_10', name: 'Subclass Feature', type: 'subclass' },
  { level: 11, key: 'extra_attack_2', name: 'Extra Attack (2)', type: 'passive', attacksPerAction: 3, replaces: 'extra_attack_1' },
  { level: 12, key: 'asi_12', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 13, key: 'indomitable_2', name: 'Indomitable (2 uses)', type: 'resource', uses: 2, replaces: 'indomitable_1' },
  { level: 13, key: 'studied_attacks', name: 'Studied Attacks', type: 'passive' },
  { level: 14, key: 'asi_14', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 15, key: 'subclass_15', name: 'Subclass Feature', type: 'subclass' },
  { level: 16, key: 'asi_16', name: 'Ability Score Improvement / Feat', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'action_surge_2', name: 'Action Surge (2 uses)', type: 'resource', uses: 2, replaces: 'action_surge' },
  { level: 17, key: 'indomitable_3', name: 'Indomitable (3 uses)', type: 'resource', uses: 3, replaces: 'indomitable_2' },
  { level: 18, key: 'subclass_18', name: 'Subclass Feature', type: 'subclass' },
  { level: 19, key: 'epic_boon', name: 'Epic Boon / Ability Score Improvement', type: 'choice', choiceType: 'epic_boon_or_asi' },
  { level: 20, key: 'extra_attack_3', name: 'Extra Attack (3)', type: 'passive', attacksPerAction: 4, replaces: 'extra_attack_2' },
];

export function getFighterProgression(edition = '2014') {
  return normaliseFighterRulesEdition(edition) === '2024' ? FIGHTER_FEATURES_2024 : FIGHTER_FEATURES_2014;
}

export function getFighterFeaturesForLevel(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getFighterProgression(edition).filter(feature => feature.level === fighterLevel);
}

export function getActiveFighterFeatures(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  const unlocked = getFighterProgression(edition).filter(feature => feature.level <= fighterLevel);
  const replacedKeys = new Set(unlocked.map(feature => feature.replaces).filter(Boolean));
  return unlocked.filter(feature => !replacedKeys.has(feature.key));
}

export function getFighterChoicesForLevel(level = 1, edition = '2014') {
  return getFighterFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextFighterFeatures(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getFighterProgression(edition).filter(feature => feature.level > fighterLevel).slice(0, 3);
}

export function getFighterProgressionSummary(level = 1, edition = '2014') {
  return {
    edition: normaliseFighterRulesEdition(edition),
    level: Math.max(1, Number(level || 1)),
    attacksPerAction: getFighterAttacksPerAction(level),
    actionSurgeUses: getFighterActionSurgeUses(level),
    indomitableUses: getFighterIndomitableUses(level),
    currentLevelFeatures: getFighterFeaturesForLevel(level, edition),
    activeFeatures: getActiveFighterFeatures(level, edition),
    choicesThisLevel: getFighterChoicesForLevel(level, edition),
    nextFeatures: getNextFighterFeatures(level, edition),
  };
}

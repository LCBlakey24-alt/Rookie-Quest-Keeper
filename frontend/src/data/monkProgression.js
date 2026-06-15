export const MONK_SUBCLASS_FEATURE_LEVELS = [3, 6, 11, 17];
export const MONK_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseMonkRulesEdition(edition = '2014') { return String(edition || '').includes('2024') ? '2024' : '2014'; }
export function getMonkMartialArtsDie(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  if (normaliseMonkRulesEdition(edition) === '2024') {
    if (monkLevel >= 20) return 'd12';
    if (monkLevel >= 15) return 'd10';
    if (monkLevel >= 10) return 'd8';
    return 'd6';
  }
  if (monkLevel >= 17) return 'd10';
  if (monkLevel >= 11) return 'd8';
  if (monkLevel >= 5) return 'd6';
  return 'd4';
}
export function getMonkResourceName(edition = '2014') { return normaliseMonkRulesEdition(edition) === '2024' ? 'Discipline Points' : 'Ki'; }
export function getMonkResourceUses(level = 1) { return Math.max(0, Number(level || 1)); }
export function getMonkUnarmoredMovementBonus(level = 1) {
  const monkLevel = Math.max(1, Number(level || 1));
  if (monkLevel >= 18) return 30;
  if (monkLevel >= 14) return 25;
  if (monkLevel >= 10) return 20;
  if (monkLevel >= 6) return 15;
  if (monkLevel >= 2) return 10;
  return 0;
}

const asi = level => ({ level, key: `asi_${level}`, name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat', type: 'choice', choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat' });
const MONK_FEATURES_2014 = [
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive' },
  { level: 1, key: 'martial_arts', name: 'Martial Arts', type: 'bonus_action' },
  { level: 2, key: 'ki', name: 'Ki', type: 'resource' },
  { level: 2, key: 'flurry_of_blows', name: 'Flurry of Blows', type: 'bonus_action', cost: 1 },
  { level: 2, key: 'patient_defense', name: 'Patient Defense', type: 'bonus_action', cost: 1 },
  { level: 2, key: 'step_of_the_wind', name: 'Step of the Wind', type: 'bonus_action', cost: 1 },
  { level: 2, key: 'unarmored_movement', name: 'Unarmored Movement', type: 'passive' },
  { level: 3, key: 'monastic_tradition', name: 'Monastic Tradition', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'deflect_missiles', name: 'Deflect Missiles', type: 'reaction' },
  { level: 4, key: 'slow_fall', name: 'Slow Fall', type: 'reaction' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' },
  { level: 5, key: 'stunning_strike', name: 'Stunning Strike', type: 'action_modifier', cost: 1 },
  { level: 6, key: 'ki_empowered_strikes', name: 'Ki-Empowered Strikes', type: 'passive' },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 7, key: 'stillness_of_mind', name: 'Stillness of Mind', type: 'action' },
  { level: 10, key: 'purity_of_body', name: 'Purity of Body', type: 'passive' },
  { level: 14, key: 'diamond_soul', name: 'Diamond Soul', type: 'passive' },
  { level: 18, key: 'empty_body', name: 'Empty Body', type: 'action', cost: 4 },
  { level: 20, key: 'perfect_self', name: 'Perfect Self', type: 'capstone' },
  ...MONK_ASI_LEVELS.map(asi),
].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
const MONK_FEATURES_2024 = [
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive' },
  { level: 1, key: 'martial_arts', name: 'Martial Arts', type: 'bonus_action' },
  { level: 2, key: 'discipline_points', name: 'Discipline Points', type: 'resource' },
  { level: 2, key: 'unarmored_movement', name: 'Unarmored Movement', type: 'passive' },
  { level: 2, key: 'uncanny_metabolism', name: 'Uncanny Metabolism', type: 'passive' },
  { level: 3, key: 'monk_subclass', name: 'Monk Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'deflect_attacks', name: 'Deflect Attacks', type: 'reaction' },
  { level: 4, key: 'slow_fall', name: 'Slow Fall', type: 'reaction' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' },
  { level: 5, key: 'stunning_strike', name: 'Stunning Strike', type: 'action_modifier', cost: 1 },
  { level: 6, key: 'empowered_strikes', name: 'Empowered Strikes', type: 'passive' },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 10, key: 'heightened_discipline', name: 'Heightened Discipline', type: 'passive' },
  { level: 14, key: 'disciplined_survivor', name: 'Disciplined Survivor', type: 'passive' },
  { level: 15, key: 'perfect_discipline', name: 'Perfect Discipline', type: 'passive' },
  { level: 18, key: 'superior_defense', name: 'Superior Defense', type: 'bonus_action', cost: 3 },
  { level: 20, key: 'body_and_mind', name: 'Body and Mind', type: 'capstone' },
  ...MONK_ASI_LEVELS.map(asi),
].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

export function getMonkProgression(edition = '2014') { return normaliseMonkRulesEdition(edition) === '2024' ? MONK_FEATURES_2024 : MONK_FEATURES_2014; }
export function getMonkFeaturesForLevel(level = 1, edition = '2014') { return getMonkProgression(edition).filter(feature => feature.level === Math.max(1, Number(level || 1))); }
export function getActiveMonkFeatures(level = 1, edition = '2014') { return getMonkProgression(edition).filter(feature => feature.level <= Math.max(1, Number(level || 1))); }
export function getMonkChoicesForLevel(level = 1, edition = '2014') { return getMonkFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice'); }
export function getNextMonkFeatures(level = 1, edition = '2014') { return getMonkProgression(edition).filter(feature => feature.level > Math.max(1, Number(level || 1))).slice(0, 3); }
export function getMonkProgressionSummary(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  return { edition: normaliseMonkRulesEdition(edition), level: monkLevel, resourceName: getMonkResourceName(edition), resourceUses: monkLevel >= 2 ? getMonkResourceUses(monkLevel) : 0, martialArtsDie: getMonkMartialArtsDie(monkLevel, edition), unarmoredMovementBonus: getMonkUnarmoredMovementBonus(monkLevel), currentLevelFeatures: getMonkFeaturesForLevel(monkLevel, edition), activeFeatures: getActiveMonkFeatures(monkLevel, edition), choicesThisLevel: getMonkChoicesForLevel(monkLevel, edition), nextFeatures: getNextMonkFeatures(monkLevel, edition) };
}

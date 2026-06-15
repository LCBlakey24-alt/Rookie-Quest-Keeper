export const MONK_SUBCLASS_FEATURE_LEVELS_2014 = [3, 6, 11, 17];
export const MONK_SUBCLASS_FEATURE_LEVELS_2024 = [3, 6, 11, 17];

const MONK_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseMonkRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getMonkMartialArtsDie(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  const rules = normaliseMonkRulesEdition(edition);

  if (rules === '2024') {
    if (monkLevel >= 17) return 'd12';
    if (monkLevel >= 11) return 'd10';
    if (monkLevel >= 5) return 'd8';
    return 'd6';
  }

  if (monkLevel >= 17) return 'd10';
  if (monkLevel >= 11) return 'd8';
  if (monkLevel >= 5) return 'd6';
  return 'd4';
}

export function getMonkDisciplineName(edition = '2014') {
  return normaliseMonkRulesEdition(edition) === '2024' ? 'Discipline Points' : 'Ki Points';
}

export function getMonkDisciplinePoints(level = 1) {
  const monkLevel = Math.max(1, Number(level || 1));
  return monkLevel >= 2 ? monkLevel : 0;
}

export function getMonkUnarmoredMovementBonus(level = 1) {
  const monkLevel = Math.max(1, Number(level || 1));
  if (monkLevel >= 18) return 30;
  if (monkLevel >= 14) return 25;
  if (monkLevel >= 10) return 20;
  if (monkLevel >= 6) return 15;
  if (monkLevel >= 2) return 10;
  return 0;
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

const MONK_FEATURES_2014 = [
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive', summary: 'AC can use Dexterity and Wisdom while unarmored.' },
  { level: 1, key: 'martial_arts', name: 'Martial Arts', type: 'scaling_die', summary: 'Use Martial Arts die for monk attacks and bonus-action strikes.' },
  { level: 2, key: 'ki', name: 'Ki', type: 'resource', resource: 'ki', summary: 'Fuel Flurry of Blows, Patient Defense, and Step of the Wind.' },
  { level: 2, key: 'unarmored_movement', name: 'Unarmored Movement', type: 'movement', summary: 'Gain bonus speed while unarmored.' },
  { level: 3, key: 'monastic_tradition', name: 'Monastic Tradition', type: 'choice', choiceType: 'subclass', summary: 'Choose your Monk subclass.' },
  { level: 3, key: 'deflect_missiles', name: 'Deflect Missiles', type: 'reaction' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'combat' },
  { level: 5, key: 'stunning_strike', name: 'Stunning Strike', type: 'ki_feature' },
  { level: 6, key: 'ki_empowered_strikes', name: 'Ki-Empowered Strikes', type: 'passive' },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 7, key: 'stillness_of_mind', name: 'Stillness of Mind', type: 'defense' },
  { level: 10, key: 'purity_of_body', name: 'Purity of Body', type: 'defense' },
  { level: 13, key: 'tongue_of_sun_and_moon', name: 'Tongue of the Sun and Moon', type: 'utility' },
  { level: 14, key: 'diamond_soul', name: 'Diamond Soul', type: 'defense' },
  { level: 15, key: 'timeless_body', name: 'Timeless Body', type: 'utility' },
  { level: 18, key: 'empty_body', name: 'Empty Body', type: 'ki_feature' },
  { level: 20, key: 'perfect_self', name: 'Perfect Self', type: 'capstone' },
  ...MONK_ASI_LEVELS.map(asiFeature),
];

const MONK_FEATURES_2024 = [
  { level: 1, key: 'unarmored_defense', name: 'Unarmored Defense', type: 'passive', summary: 'AC can use Dexterity and Wisdom while unarmored.' },
  { level: 1, key: 'martial_arts', name: 'Martial Arts', type: 'scaling_die', summary: 'Use the Monk Martial Arts die for strikes.' },
  { level: 2, key: 'monks_focus', name: "Monk's Focus", type: 'resource', resource: 'discipline', summary: 'Spend Discipline Points on Flurry of Blows, Patient Defense, and Step of the Wind.' },
  { level: 2, key: 'unarmored_movement', name: 'Unarmored Movement', type: 'movement' },
  { level: 3, key: 'monk_subclass', name: 'Monk Subclass', type: 'choice', choiceType: 'subclass', summary: 'Choose your Monk subclass.' },
  { level: 3, key: 'deflect_attacks', name: 'Deflect Attacks', type: 'reaction' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'combat' },
  { level: 5, key: 'stunning_strike', name: 'Stunning Strike', type: 'discipline_feature' },
  { level: 6, key: 'empowered_strikes', name: 'Empowered Strikes', type: 'passive' },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 10, key: 'heightened_focus', name: 'Heightened Focus', type: 'discipline_feature' },
  { level: 13, key: 'deflect_energy', name: 'Deflect Energy', type: 'reaction' },
  { level: 14, key: 'disciplined_survivor', name: 'Disciplined Survivor', type: 'defense' },
  { level: 15, key: 'perfect_focus', name: 'Perfect Focus', type: 'resource_recovery' },
  { level: 18, key: 'superior_defense', name: 'Superior Defense', type: 'defense' },
  { level: 20, key: 'body_and_mind', name: 'Body and Mind', type: 'capstone' },
  ...MONK_ASI_LEVELS.map(asiFeature),
];

function getFeatureTable(edition = '2014') {
  return normaliseMonkRulesEdition(edition) === '2024' ? MONK_FEATURES_2024 : MONK_FEATURES_2014;
}

export function getMonkProgression(edition = '2014') {
  return getFeatureTable(edition).slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function getMonkFeaturesForLevel(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  return getMonkProgression(edition).filter(feature => feature.level === monkLevel);
}

export function getActiveMonkFeatures(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  return getMonkProgression(edition).filter(feature => feature.level <= monkLevel);
}

export function getMonkChoicesForLevel(level = 1, edition = '2014') {
  return getMonkFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextMonkFeatures(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  const nextLevel = getMonkProgression(edition).find(feature => feature.level > monkLevel)?.level;
  if (!nextLevel) return [];
  return getMonkFeaturesForLevel(nextLevel, edition);
}

export function getMonkProgressionSummary(level = 1, edition = '2014') {
  const monkLevel = Math.max(1, Number(level || 1));
  const rules = normaliseMonkRulesEdition(edition);
  return {
    edition: rules,
    level: monkLevel,
    disciplineName: getMonkDisciplineName(rules),
    disciplinePoints: getMonkDisciplinePoints(monkLevel),
    martialArtsDie: getMonkMartialArtsDie(monkLevel, rules),
    unarmoredMovementBonus: getMonkUnarmoredMovementBonus(monkLevel),
    currentLevelFeatures: getMonkFeaturesForLevel(monkLevel, rules),
    activeFeatures: getActiveMonkFeatures(monkLevel, rules),
    choices: getMonkChoicesForLevel(monkLevel, rules),
    nextFeatures: getNextMonkFeatures(monkLevel, rules),
    subclassFeatureLevels: rules === '2024' ? MONK_SUBCLASS_FEATURE_LEVELS_2024 : MONK_SUBCLASS_FEATURE_LEVELS_2014,
  };
}

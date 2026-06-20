export const RANGER_SUBCLASS_FEATURE_LEVELS = [3, 7, 11, 15];
export const RANGER_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseRangerRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getRangerFavoredEnemyUses(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  const rules = normaliseRangerRulesEdition(edition);

  if (rules === '2024') {
    return rangerLevel >= 1 ? Math.max(2, Math.ceil(rangerLevel / 2)) : 0;
  }

  return rangerLevel >= 1 ? 1 : 0;
}

export function getRangerSpellcastingLevel(level = 1) {
  const rangerLevel = Math.max(1, Number(level || 1));
  return rangerLevel >= 2 ? Math.ceil(rangerLevel / 2) : 0;
}

export function getRangerKnownSpellsHint(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  const rules = normaliseRangerRulesEdition(edition);

  if (rangerLevel < 2) return 'No Ranger spellcasting yet';
  return rules === '2024' ? 'Prepared Ranger spell list' : 'Known Ranger spells';
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

const RANGER_FEATURES_2014 = [
  { level: 1, key: 'favored_enemy', name: 'Favored Enemy', type: 'choice', choiceType: 'favored_enemy', summary: 'Choose creature types and gain tracking/knowledge benefits.' },
  { level: 1, key: 'natural_explorer', name: 'Natural Explorer', type: 'choice', choiceType: 'favored_terrain', summary: 'Choose favored terrain and gain exploration benefits.' },
  { level: 2, key: 'fighting_style', name: 'Fighting Style', type: 'choice', choiceType: 'fighting_style' },
  { level: 2, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 3, key: 'ranger_archetype', name: 'Ranger Archetype', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'primeval_awareness', name: 'Primeval Awareness', type: 'utility' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'combat' },
  { level: 6, key: 'favored_enemy_improvement', name: 'Favored Enemy Improvement', type: 'choice', choiceType: 'favored_enemy' },
  { level: 8, key: 'lands_stride', name: "Land's Stride", type: 'movement' },
  { level: 10, key: 'natural_explorer_improvement', name: 'Natural Explorer Improvement', type: 'choice', choiceType: 'favored_terrain' },
  { level: 10, key: 'hide_in_plain_sight', name: 'Hide in Plain Sight', type: 'stealth' },
  { level: 14, key: 'favored_enemy_greater_improvement', name: 'Favored Enemy Greater Improvement', type: 'choice', choiceType: 'favored_enemy' },
  { level: 14, key: 'vanish', name: 'Vanish', type: 'stealth' },
  { level: 18, key: 'feral_senses', name: 'Feral Senses', type: 'senses' },
  { level: 20, key: 'foe_slayer', name: 'Foe Slayer', type: 'capstone' },
  ...RANGER_ASI_LEVELS.map(asiFeature),
];

const RANGER_FEATURES_2024 = [
  { level: 1, key: 'favored_enemy', name: 'Favored Enemy', type: 'resource', resource: 'favored_enemy', summary: "Cast Hunter's Mark with Ranger support." },
  { level: 1, key: 'weapon_mastery', name: 'Weapon Mastery', type: 'choice', choiceType: 'weapon_mastery', choices: 2 },
  { level: 2, key: 'fighting_style', name: 'Fighting Style', type: 'choice', choiceType: 'fighting_style' },
  { level: 2, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 2, key: 'deft_explorer', name: 'Deft Explorer', type: 'expertise' },
  { level: 3, key: 'ranger_subclass', name: 'Ranger Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'combat' },
  { level: 6, key: 'roving', name: 'Roving', type: 'movement' },
  { level: 9, key: 'expertise', name: 'Expertise', type: 'expertise' },
  { level: 10, key: 'tireless', name: 'Tireless', type: 'recovery' },
  { level: 13, key: 'relentless_hunter', name: 'Relentless Hunter', type: 'combat' },
  { level: 14, key: 'natures_veil', name: "Nature's Veil", type: 'stealth' },
  { level: 17, key: 'precise_hunter', name: 'Precise Hunter', type: 'combat' },
  { level: 18, key: 'feral_senses', name: 'Feral Senses', type: 'senses' },
  { level: 20, key: 'foe_slayer', name: 'Foe Slayer', type: 'capstone' },
  ...RANGER_ASI_LEVELS.map(asiFeature),
];

function getFeatureTable(edition = '2014') {
  return normaliseRangerRulesEdition(edition) === '2024' ? RANGER_FEATURES_2024 : RANGER_FEATURES_2014;
}

export function getRangerProgression(edition = '2014') {
  return getFeatureTable(edition).slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function getRangerFeaturesForLevel(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  return getRangerProgression(edition).filter(feature => feature.level === rangerLevel);
}

export function getActiveRangerFeatures(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  return getRangerProgression(edition).filter(feature => feature.level <= rangerLevel);
}

export function getRangerChoicesForLevel(level = 1, edition = '2014') {
  return getRangerFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextRangerFeatures(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  const nextLevel = getRangerProgression(edition).find(feature => feature.level > rangerLevel)?.level;
  if (!nextLevel) return [];
  return getRangerFeaturesForLevel(nextLevel, edition);
}

export function getRangerProgressionSummary(level = 1, edition = '2014') {
  const rangerLevel = Math.max(1, Number(level || 1));
  const rules = normaliseRangerRulesEdition(edition);

  return {
    edition: rules,
    level: rangerLevel,
    favoredEnemyUses: getRangerFavoredEnemyUses(rangerLevel, rules),
    spellcastingLevel: getRangerSpellcastingLevel(rangerLevel),
    spellcastingHint: getRangerKnownSpellsHint(rangerLevel, rules),
    currentLevelFeatures: getRangerFeaturesForLevel(rangerLevel, rules),
    activeFeatures: getActiveRangerFeatures(rangerLevel, rules),
    choices: getRangerChoicesForLevel(rangerLevel, rules),
    nextFeatures: getNextRangerFeatures(rangerLevel, rules),
    subclassFeatureLevels: RANGER_SUBCLASS_FEATURE_LEVELS,
  };
}

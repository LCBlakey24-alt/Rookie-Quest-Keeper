export const CLERIC_SUBCLASS_FEATURE_LEVELS = [1, 2, 6, 8, 17];
export const CLERIC_ASI_LEVELS = [4, 8, 12, 16, 19];

const CLERIC_DESTROY_UNDEAD_THRESHOLDS_2014 = [
  { level: 5, cr: '1/2' },
  { level: 8, cr: '1' },
  { level: 11, cr: '2' },
  { level: 14, cr: '3' },
  { level: 17, cr: '4' },
];

export function normaliseClericRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getClericSpellcastingLevel(level = 1) {
  const clericLevel = Math.max(0, Number(level || 0));
  return Math.floor(clericLevel);
}

export function getClericChannelDivinityUses(level = 1, edition = '2014') {
  const clericLevel = Math.max(0, Number(level || 0));
  const ruleset = normaliseClericRulesEdition(edition);

  if (clericLevel < 2) return 0;
  if (ruleset === '2024') return Math.max(2, Math.ceil(clericLevel / 2));
  if (clericLevel >= 18) return 3;
  if (clericLevel >= 6) return 2;
  return 1;
}

export function getClericDestroyUndeadCR(level = 1, edition = '2014') {
  const clericLevel = Math.max(0, Number(level || 0));
  const ruleset = normaliseClericRulesEdition(edition);
  if (ruleset === '2024') return clericLevel >= 5 ? 'scales with Cleric level' : null;

  const threshold = [...CLERIC_DESTROY_UNDEAD_THRESHOLDS_2014]
    .reverse()
    .find(item => clericLevel >= item.level);

  return threshold?.cr || null;
}

export function getClericSubclassChoiceLevel(edition = '2014') {
  return normaliseClericRulesEdition(edition) === '2024' ? 3 : 1;
}

const CLERIC_FEATURES_2014 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'core' },
  { level: 1, key: 'divine_domain', name: 'Divine Domain', type: 'choice', choiceType: 'subclass' },
  { level: 2, key: 'channel_divinity', name: 'Channel Divinity', type: 'resource' },
  { level: 2, key: 'divine_domain_feature', name: 'Divine Domain Feature', type: 'subclass' },
  { level: 4, key: 'ability_score_improvement_4', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 5, key: 'destroy_undead', name: 'Destroy Undead', type: 'core' },
  { level: 6, key: 'channel_divinity_2', name: 'Channel Divinity Improvement', type: 'resource' },
  { level: 6, key: 'divine_domain_feature_6', name: 'Divine Domain Feature', type: 'subclass' },
  { level: 8, key: 'ability_score_improvement_8', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 8, key: 'destroy_undead_1', name: 'Destroy Undead Improvement', type: 'core' },
  { level: 8, key: 'divine_domain_feature_8', name: 'Divine Domain Feature', type: 'subclass' },
  { level: 10, key: 'divine_intervention', name: 'Divine Intervention', type: 'core' },
  { level: 11, key: 'destroy_undead_2', name: 'Destroy Undead Improvement', type: 'core' },
  { level: 12, key: 'ability_score_improvement_12', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 14, key: 'destroy_undead_3', name: 'Destroy Undead Improvement', type: 'core' },
  { level: 16, key: 'ability_score_improvement_16', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'destroy_undead_4', name: 'Destroy Undead Improvement', type: 'core' },
  { level: 17, key: 'divine_domain_feature_17', name: 'Divine Domain Feature', type: 'subclass' },
  { level: 18, key: 'channel_divinity_3', name: 'Channel Divinity Improvement', type: 'resource' },
  { level: 19, key: 'ability_score_improvement_19', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 20, key: 'divine_intervention_improvement', name: 'Divine Intervention Improvement', type: 'core' },
];

const CLERIC_FEATURES_2024 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'core' },
  { level: 1, key: 'divine_order', name: 'Divine Order', type: 'choice', choiceType: 'divine_order' },
  { level: 2, key: 'channel_divinity', name: 'Channel Divinity', type: 'resource' },
  { level: 3, key: 'cleric_subclass', name: 'Cleric Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 4, key: 'ability_score_improvement_4', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 5, key: 'sear_undead', name: 'Sear Undead', type: 'core' },
  { level: 6, key: 'subclass_feature_6', name: 'Cleric Subclass Feature', type: 'subclass' },
  { level: 7, key: 'blessed_strikes', name: 'Blessed Strikes', type: 'choice', choiceType: 'blessed_strikes' },
  { level: 8, key: 'ability_score_improvement_8', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 10, key: 'divine_intervention', name: 'Divine Intervention', type: 'core' },
  { level: 12, key: 'ability_score_improvement_12', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 14, key: 'improved_blessed_strikes', name: 'Improved Blessed Strikes', type: 'core' },
  { level: 16, key: 'ability_score_improvement_16', name: 'Ability Score Improvement', type: 'choice', choiceType: 'asi_or_feat' },
  { level: 17, key: 'subclass_feature_17', name: 'Cleric Subclass Feature', type: 'subclass' },
  { level: 19, key: 'epic_boon_or_asi', name: 'Epic Boon or Ability Score Improvement', type: 'choice', choiceType: 'epic_boon_or_asi' },
  { level: 20, key: 'greater_divine_intervention', name: 'Greater Divine Intervention', type: 'core' },
];

export function getClericProgression(edition = '2014') {
  return normaliseClericRulesEdition(edition) === '2024' ? CLERIC_FEATURES_2024 : CLERIC_FEATURES_2014;
}

export function getClericFeaturesForLevel(level = 1, edition = '2014') {
  const clericLevel = Math.max(1, Number(level || 1));
  return getClericProgression(edition).filter(feature => feature.level === clericLevel);
}

export function getActiveClericFeatures(level = 1, edition = '2014') {
  const clericLevel = Math.max(1, Number(level || 1));
  return getClericProgression(edition).filter(feature => feature.level <= clericLevel);
}

export function getClericChoicesForLevel(level = 1, edition = '2014') {
  return getClericFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextClericFeatures(level = 1, edition = '2014') {
  const clericLevel = Math.max(1, Number(level || 1));
  const nextLevel = getClericProgression(edition).find(feature => feature.level > clericLevel)?.level;
  return nextLevel ? getClericFeaturesForLevel(nextLevel, edition) : [];
}

export function getClericProgressionSummary(level = 1, edition = '2014') {
  const clericLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseClericRulesEdition(edition);

  return {
    className: 'Cleric',
    edition: ruleset,
    level: clericLevel,
    spellcastingLevel: getClericSpellcastingLevel(clericLevel),
    channelDivinityUses: getClericChannelDivinityUses(clericLevel, ruleset),
    destroyUndeadCR: getClericDestroyUndeadCR(clericLevel, ruleset),
    subclassChoiceLevel: getClericSubclassChoiceLevel(ruleset),
    currentLevelFeatures: getClericFeaturesForLevel(clericLevel, ruleset),
    activeFeatures: getActiveClericFeatures(clericLevel, ruleset),
    nextFeatures: getNextClericFeatures(clericLevel, ruleset),
    choices: getActiveClericFeatures(clericLevel, ruleset).filter(feature => feature.type === 'choice'),
  };
}

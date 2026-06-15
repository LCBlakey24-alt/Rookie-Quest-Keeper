export const ROGUE_SUBCLASS_FEATURE_LEVELS = [3, 9, 13, 17];

export function normaliseRogueRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getRogueSneakAttackDice(level = 1) {
  return Math.min(10, Math.max(1, Math.ceil((Number(level || 1)) / 2)));
}

const SHARED_ASI = [4, 8, 10, 12, 16, 19];
const asi = level => ({ level, key: `asi_${level}`, name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat', type: 'choice', choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat' });

const ROGUE_FEATURES_2014 = [
  { level: 1, key: 'expertise', name: 'Expertise', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 1, key: 'sneak_attack', name: 'Sneak Attack', type: 'scaling_damage' },
  { level: 1, key: 'thieves_cant', name: "Thieves' Cant", type: 'passive' },
  { level: 2, key: 'cunning_action', name: 'Cunning Action', type: 'bonus_action' },
  { level: 3, key: 'roguish_archetype', name: 'Roguish Archetype', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'uncanny_dodge', name: 'Uncanny Dodge', type: 'reaction' },
  { level: 6, key: 'expertise_2', name: 'Expertise (2 more)', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 11, key: 'reliable_talent', name: 'Reliable Talent', type: 'passive' },
  { level: 14, key: 'blindsense', name: 'Blindsense', type: 'passive' },
  { level: 15, key: 'slippery_mind', name: 'Slippery Mind', type: 'passive' },
  { level: 18, key: 'elusive', name: 'Elusive', type: 'passive' },
  { level: 20, key: 'stroke_of_luck', name: 'Stroke of Luck', type: 'capstone' },
  ...SHARED_ASI.map(asi),
].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

const ROGUE_FEATURES_2024 = [
  { level: 1, key: 'expertise', name: 'Expertise', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 1, key: 'sneak_attack', name: 'Sneak Attack', type: 'scaling_damage' },
  { level: 1, key: 'thieves_cant', name: "Thieves' Cant", type: 'passive' },
  { level: 1, key: 'weapon_mastery_2', name: 'Weapon Mastery', type: 'choice', choiceType: 'weapon_mastery', choices: 2 },
  { level: 2, key: 'cunning_action', name: 'Cunning Action', type: 'bonus_action' },
  { level: 3, key: 'rogue_subclass', name: 'Rogue Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 3, key: 'steady_aim', name: 'Steady Aim', type: 'bonus_action' },
  { level: 5, key: 'cunning_strike', name: 'Cunning Strike', type: 'choice', choiceType: 'sneak_attack_option' },
  { level: 5, key: 'uncanny_dodge', name: 'Uncanny Dodge', type: 'reaction' },
  { level: 7, key: 'evasion', name: 'Evasion', type: 'passive' },
  { level: 7, key: 'reliable_talent', name: 'Reliable Talent', type: 'passive' },
  { level: 9, key: 'expertise_2', name: 'Expertise (2 more)', type: 'choice', choiceType: 'expertise', choices: 2 },
  { level: 11, key: 'improved_cunning_strike', name: 'Improved Cunning Strike', type: 'passive' },
  { level: 13, key: 'subtle_strikes', name: 'Subtle Strikes', type: 'passive' },
  { level: 14, key: 'devious_strikes', name: 'Devious Strikes', type: 'passive' },
  { level: 15, key: 'slippery_mind', name: 'Slippery Mind', type: 'passive' },
  { level: 18, key: 'elusive', name: 'Elusive', type: 'passive' },
  { level: 20, key: 'stroke_of_luck', name: 'Stroke of Luck', type: 'capstone' },
  ...SHARED_ASI.map(asi),
].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

export function getRogueProgression(edition = '2014') { return normaliseRogueRulesEdition(edition) === '2024' ? ROGUE_FEATURES_2024 : ROGUE_FEATURES_2014; }
export function getRogueFeaturesForLevel(level = 1, edition = '2014') { return getRogueProgression(edition).filter(feature => feature.level === Math.max(1, Number(level || 1))); }
export function getActiveRogueFeatures(level = 1, edition = '2014') { return getRogueProgression(edition).filter(feature => feature.level <= Math.max(1, Number(level || 1))); }
export function getRogueChoicesForLevel(level = 1, edition = '2014') { return getRogueFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice'); }
export function getNextRogueFeatures(level = 1, edition = '2014') { return getRogueProgression(edition).filter(feature => feature.level > Math.max(1, Number(level || 1))).slice(0, 3); }
export function getRogueProgressionSummary(level = 1, edition = '2014') {
  const rogueLevel = Math.max(1, Number(level || 1));
  return { edition: normaliseRogueRulesEdition(edition), level: rogueLevel, sneakAttackDice: getRogueSneakAttackDice(rogueLevel), currentLevelFeatures: getRogueFeaturesForLevel(rogueLevel, edition), activeFeatures: getActiveRogueFeatures(rogueLevel, edition), choicesThisLevel: getRogueChoicesForLevel(rogueLevel, edition), nextFeatures: getNextRogueFeatures(rogueLevel, edition) };
}

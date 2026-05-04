/**
 * Class Resources Database
 * Tracks per-class resource pools (Ki, Rage, Sorcery Points, etc.)
 * and maps features to their resource costs + rest recovery.
 *
 * SRD 5.1 / Public Domain only.
 */

// Resource pools by class. "maxByLevel" can be:
//   - a number lookup { 1:2, 3:3, ... }
//   - the string "level" meaning max = character level
//   - the string "half_level" meaning max = floor(level/2)
//   - the string "ability:charisma" meaning max = ability modifier (min 1)
export const CLASS_RESOURCES = {
  Barbarian: [
    {
      key: 'rage',
      name: 'Rage',
      restoreOn: 'long',
      maxByLevel: { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: 99 },
    },
  ],
  Bard: [
    {
      key: 'bardic_inspiration',
      name: 'Bardic Inspiration',
      restoreOn: 'long', // becomes short rest at level 5
      restoreOnByLevel: { 5: 'short' },
      maxByLevel: 'ability:charisma',
    },
  ],
  Cleric: [
    {
      key: 'channel_divinity',
      name: 'Channel Divinity',
      restoreOn: 'short',
      maxByLevel: { 2: 1, 6: 2, 18: 3 },
    },
  ],
  Druid: [
    {
      key: 'wild_shape',
      name: 'Wild Shape',
      restoreOn: 'short',
      maxByLevel: { 2: 2 },
    },
  ],
  Fighter: [
    {
      key: 'second_wind',
      name: 'Second Wind',
      restoreOn: 'short',
      maxByLevel: { 1: 1 },
    },
    {
      key: 'action_surge',
      name: 'Action Surge',
      restoreOn: 'short',
      maxByLevel: { 2: 1, 17: 2 },
    },
    {
      key: 'indomitable',
      name: 'Indomitable',
      restoreOn: 'long',
      maxByLevel: { 9: 1, 13: 2, 17: 3 },
    },
    {
      key: 'superiority_dice',
      name: 'Superiority Dice',
      restoreOn: 'short',
      maxByLevel: { 3: 4, 7: 5, 15: 6 },
      subclass: 'battle_master',
    },
  ],
  Monk: [
    {
      key: 'ki_points',
      name: 'Ki Points',
      restoreOn: 'short',
      maxByLevel: 'level',
      minLevel: 2,
    },
  ],
  Paladin: [
    {
      key: 'lay_on_hands',
      name: 'Lay on Hands',
      restoreOn: 'long',
      maxByLevel: 'level_x5', // level * 5 HP pool
    },
    {
      key: 'channel_divinity',
      name: 'Channel Divinity',
      restoreOn: 'short',
      maxByLevel: { 3: 1 },
    },
  ],
  Ranger: [],
  Rogue: [],
  Sorcerer: [
    {
      key: 'sorcery_points',
      name: 'Sorcery Points',
      restoreOn: 'long',
      maxByLevel: 'level',
      minLevel: 2,
    },
  ],
  Warlock: [],
  Wizard: [
    {
      key: 'arcane_recovery',
      name: 'Arcane Recovery',
      restoreOn: 'long', // usable once per day on short rest
      maxByLevel: { 1: 1 },
    },
  ],
};

/**
 * Compute the max value for a resource at a given level.
 */
export function getResourceMax(resource, level, abilityScores = {}) {
  const m = resource.maxByLevel;
  if (m === 'level') return level;
  if (m === 'half_level') return Math.max(1, Math.floor(level / 2));
  if (m === 'level_x5') return level * 5;
  if (typeof m === 'string' && m.startsWith('ability:')) {
    const ability = m.split(':')[1];
    const score = abilityScores[ability] || 10;
    return Math.max(1, Math.floor((score - 10) / 2));
  }
  // Numeric lookup — find highest matching level
  let val = 0;
  for (const [lvl, v] of Object.entries(m)) {
    if (level >= parseInt(lvl)) val = v;
  }
  return val;
}

/**
 * Get the rest type that restores a resource at a given level.
 */
export function getRestoreType(resource, level) {
  if (resource.restoreOnByLevel) {
    let type = resource.restoreOn;
    for (const [lvl, t] of Object.entries(resource.restoreOnByLevel)) {
      if (level >= parseInt(lvl)) type = t;
    }
    return type;
  }
  return resource.restoreOn;
}

/**
 * Features that cost resources.
 * Maps feature name → { resource key, cost }.
 */
export const FEATURE_COSTS = {
  // Barbarian
  'Rage': { resource: 'rage', cost: 1 },
  // Bard
  'Bardic Inspiration': { resource: 'bardic_inspiration', cost: 1 },
  // Cleric
  'Channel Divinity': { resource: 'channel_divinity', cost: 1 },
  'Turn Undead': { resource: 'channel_divinity', cost: 1 },
  // Druid
  'Wild Shape': { resource: 'wild_shape', cost: 1 },
  // Fighter
  'Second Wind': { resource: 'second_wind', cost: 1 },
  'Action Surge': { resource: 'action_surge', cost: 1 },
  // Monk
  'Flurry of Blows': { resource: 'ki_points', cost: 1 },
  'Patient Defense': { resource: 'ki_points', cost: 1 },
  'Step of the Wind': { resource: 'ki_points', cost: 1 },
  'Stunning Strike': { resource: 'ki_points', cost: 1 },
  'Deflect Missiles (catch)': { resource: 'ki_points', cost: 1 },
  'Shadow Arts': { resource: 'ki_points', cost: 2 },
  'Quivering Palm': { resource: 'ki_points', cost: 3 },
  'Empty Body': { resource: 'ki_points', cost: 4 },
  'Slow Fall': { resource: 'ki_points', cost: 0 },
  'Stillness of Mind': { resource: 'ki_points', cost: 0 },
  'Ki-Empowered Strikes': { resource: 'ki_points', cost: 0 },
  'Focused Aim': { resource: 'ki_points', cost: 1 },
  // Paladin
  'Lay on Hands': { resource: 'lay_on_hands', cost: 'variable' },
  'Divine Smite': { resource: null, cost: 'spell_slot' },
  // Sorcerer
  'Flexible Casting': { resource: 'sorcery_points', cost: 'variable' },
  'Metamagic': { resource: 'sorcery_points', cost: 'variable' },
  // Wizard
  'Arcane Recovery': { resource: 'arcane_recovery', cost: 1 },
};

/**
 * What each rest type restores.
 */
export const REST_EFFECTS = {
  short: {
    label: 'Short Rest',
    description: '1+ hours. Spend hit dice to heal. Restores short-rest resources.',
    restoresHitDice: false,
    restoresHp: 'hit_dice', // player chooses how many to spend
    restoresSpellSlots: false, // except Warlock pact magic
  },
  long: {
    label: 'Long Rest',
    description: '8+ hours. Restore all HP, half hit dice (min 1), all long-rest resources, and spell slots.',
    restoresHitDice: 'half', // regain half your total (min 1)
    restoresHp: 'full',
    restoresSpellSlots: true,
  },
};

/**
 * Feature type labels and their colors.
 */
export const FEATURE_TYPE_CONFIG = {
  action: { label: 'Action', short: 'A', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  bonus_action: { label: 'Bonus', short: 'BA', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  reaction: { label: 'React', short: 'R', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  action_modifier: { label: 'Mod', short: 'M', color: '#EC4899', bg: 'rgba(236,72,153,0.15)' },
  passive: { label: 'Passive', short: 'P', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

// Class resource rules used by the clean character sheet and character builder.
// Keep feature/resource unlock levels here so the UI does not show resources
// before the class actually gains them.

const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const levelOf = (character) => Math.max(1, Number(character?.level || 1));
const classLevelOf = (character, className) => {
  const target = normalizeName(className);
  const classLevels = character?.multiclass_levels || character?.class_levels || {};
  const entry = Object.entries(classLevels).find(([name]) => normalizeName(name) === target);
  if (entry) return Math.max(0, Number(entry[1]) || 0);
  return normalizeName(character?.character_class || character?.className || '') === target ? levelOf(character) : 0;
};
const is2024Rules = (character) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024');
const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

export const CLASS_RESOURCE_RULES = {
  Barbarian: [
    {
      key: 'rage',
      label: 'Rage',
      minLevel: 1,
      restore: 'long-rest',
      max: (character) => {
        const level = levelOf(character);
        if (level >= 17) return 6;
        if (level >= 12) return 5;
        if (level >= 6) return 4;
        if (level >= 3) return 3;
        return 2;
      },
    },
  ],
  Bard: [
    {
      key: 'bardic_inspiration',
      label: 'Bardic Inspiration',
      minLevel: 1,
      restore: (character) => levelOf(character) >= 5 ? 'short-rest' : 'long-rest',
      max: (character) => Math.max(1, abilityMod(character?.charisma)),
    },
  ],
  Cleric: [
    {
      key: 'channel_divinity',
      label: 'Channel Divinity',
      minLevel: 2,
      restore: 'short-rest',
      max: (character) => {
        const level = levelOf(character);
        if (level >= 18) return 3;
        if (level >= 6) return 2;
        return 1;
      },
    },
  ],
  Druid: [
    { key: 'wild_shape', label: 'Wild Shape', minLevel: 2, restore: 'short-rest', max: () => 2 },
  ],
  Fighter: [
    { key: 'second_wind', label: 'Second Wind', minLevel: 1, restore: (character) => is2024Rules(character) ? 'long-rest' : 'short-rest', max: (character) => is2024Rules(character) ? Math.max(2, Number(character?.proficiency_bonus || 2)) : 1 },
    { key: 'action_surge', label: 'Action Surge', minLevel: 2, restore: 'short-rest', max: (character) => classLevelOf(character, 'Fighter') >= 17 ? 2 : 1 },
    { key: 'indomitable', label: 'Indomitable', minLevel: 9, restore: 'long-rest', max: (character) => classLevelOf(character, 'Fighter') >= 17 ? 3 : classLevelOf(character, 'Fighter') >= 13 ? 2 : 1 },
    { key: 'superiority_dice', label: 'Superiority Dice', minLevel: 3, restore: 'short-rest', max: (character) => { const subclass = normalizeName(character?.subclass); if (subclass !== 'battlemaster') return 0; const level = classLevelOf(character, 'Fighter'); if (level >= 15) return 6; if (level >= 7) return 5; return 4; } },
  ],
  Monk: [
    { key: 'ki', label: 'Ki', minLevel: 2, restore: 'short-rest', max: (character) => levelOf(character) },
  ],
  Paladin: [
    { key: 'lay_on_hands', label: 'Lay on Hands', minLevel: 1, restore: 'long-rest', max: (character) => levelOf(character) * 5 },
    { key: 'channel_divinity', label: 'Channel Divinity', minLevel: 3, restore: 'short-rest', max: () => 1 },
  ],
  Ranger: [],
  Rogue: [],
  Sorcerer: [
    { key: 'sorcery_points', label: 'Sorcery Points', minLevel: 2, restore: 'long-rest', max: (character) => levelOf(character) },
  ],
  Warlock: [
    { key: 'pact_magic', label: 'Pact Magic', minLevel: 1, restore: 'short-rest', max: (character) => levelOf(character) >= 2 ? 2 : 1 },
  ],
  Wizard: [
    { key: 'arcane_recovery', label: 'Arcane Recovery', minLevel: 1, restore: 'long-rest', max: () => 1 },
  ],
};

export function getClassResourceRules(character) {
  const className = character?.character_class || character?.className || '';
  const level = classLevelOf(character, className) || levelOf(character);
  return (CLASS_RESOURCE_RULES[className] || [])
    .filter(rule => level >= (rule.minLevel || 1))
    .map(rule => {
      const restore = typeof rule.restore === 'function' ? rule.restore(character) : rule.restore;
      return {
        ...rule,
        restore,
        maxValue: Math.max(0, Number(rule.max?.(character) || 0)),
      };
    })
    .filter(rule => rule.maxValue > 0);
}

export function buildInitialClassResources(character) {
  return getClassResourceRules(character).reduce((resources, rule) => {
    resources[rule.key] = {
      label: rule.label,
      current: rule.maxValue,
      remaining: rule.maxValue,
      max: rule.maxValue,
      restore: rule.restore || 'long-rest',
      min_level: rule.minLevel || 1,
    };
    return resources;
  }, {});
}

export function restoreClassResources(character, restType = 'long-rest') {
  const currentResources = character?.resources || {};
  const restored = { ...currentResources };
  getClassResourceRules(character).forEach(rule => {
    const existing = restored[rule.key] || {};
    const shouldRestore = restType === 'long-rest' || existing.restore === 'short-rest' || rule.restore === 'short-rest';
    if (!shouldRestore) return;
    restored[rule.key] = {
      ...existing,
      label: rule.label,
      current: rule.maxValue,
      remaining: rule.maxValue,
      max: rule.maxValue,
      restore: rule.restore || existing.restore || 'long-rest',
      min_level: rule.minLevel || existing.min_level || 1,
    };
  });
  return restored;
}

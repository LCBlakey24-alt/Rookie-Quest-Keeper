// Class resource rules used by the clean character sheet and character builder.
// Keep feature/resource unlock levels here so the UI does not show resources
// before the class actually gains them.

const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const levelOf = (character) => Math.max(1, Number(character?.level || 1));
const is2024Rules = (character) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024');
const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const ruleLabel = (rule, character) => (typeof rule.label === 'function' ? rule.label(character) : rule.label);

const classLevelOf = (character, className) => {
  const key = normalizeName(className);
  const directKey = `${key}_level`;
  const camelKey = `${key}Level`;
  const directLevel = Number(character?.[directKey] || character?.[camelKey] || 0);
  if (directLevel > 0) return directLevel;

  const classLevels = { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
  const mappedLevel = Number(classLevels[key] || classLevels[className] || classLevels[className?.charAt?.(0)?.toUpperCase?.() + className?.slice?.(1)] || 0);
  if (mappedLevel > 0) return mappedLevel;

  const entries = Array.isArray(character?.classes) ? character.classes : [];
  const entry = entries.find(item => normalizeName(item?.name || item?.class_name || item?.className || item?.class) === key);
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;

  return levelOf(character);
};

const fighterLevelOf = (character) => classLevelOf(character, 'fighter');
const barbarianLevelOf = (character) => classLevelOf(character, 'barbarian');
const bardLevelOf = (character) => classLevelOf(character, 'bard');
const clericLevelOf = (character) => classLevelOf(character, 'cleric');
const monkLevelOf = (character) => classLevelOf(character, 'monk');
const paladinLevelOf = (character) => classLevelOf(character, 'paladin');
const rangerLevelOf = (character) => classLevelOf(character, 'ranger');
const sorcererLevelOf = (character) => classLevelOf(character, 'sorcerer');
const warlockLevelOf = (character) => classLevelOf(character, 'warlock');

const proficiencyBonusOf = (character) => {
  const explicitBonus = Number(character?.proficiency_bonus || character?.proficiencyBonus || 0);
  if (explicitBonus > 0) return explicitBonus;
  const level = levelOf(character);
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

export const CLASS_RESOURCE_RULES = {
  Barbarian: [
    {
      key: 'rage',
      label: 'Rage',
      minLevel: 1,
      restore: 'long-rest',
      max: (character) => {
        const level = barbarianLevelOf(character);
        if (!is2024Rules(character) && level >= 20) return 99;
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
      restore: (character) => bardLevelOf(character) >= 5 ? 'short-rest' : 'long-rest',
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
        const level = clericLevelOf(character);
        if (is2024Rules(character)) return Math.max(2, Math.ceil(level / 2));
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
    { key: 'second_wind', label: 'Second Wind', minLevel: 1, restore: (character) => is2024Rules(character) ? 'long-rest' : 'short-rest', max: (character) => is2024Rules(character) ? proficiencyBonusOf(character) : 1 },
    { key: 'action_surge', label: 'Action Surge', minLevel: 2, restore: 'short-rest', max: (character) => fighterLevelOf(character) >= 17 ? 2 : 1 },
    { key: 'indomitable', label: 'Indomitable', minLevel: 9, restore: 'long-rest', max: (character) => fighterLevelOf(character) >= 17 ? 3 : fighterLevelOf(character) >= 13 ? 2 : 1 },
    { key: 'superiority_dice', label: 'Superiority Dice', minLevel: 3, restore: 'short-rest', max: (character) => { const subclass = normalizeName(character?.subclass); if (subclass !== 'battlemaster') return 0; const level = fighterLevelOf(character); if (level >= 15) return 6; if (level >= 7) return 5; return 4; } },
  ],
  Monk: [
    { key: 'ki', label: (character) => is2024Rules(character) ? 'Discipline Points' : 'Ki', minLevel: 2, restore: 'short-rest', max: (character) => monkLevelOf(character) },
  ],
  Paladin: [
    { key: 'lay_on_hands', label: 'Lay on Hands', minLevel: 1, restore: 'long-rest', max: (character) => paladinLevelOf(character) * 5 },
    { key: 'channel_divinity', label: 'Channel Divinity', minLevel: 3, restore: (character) => is2024Rules(character) ? 'long-rest' : 'short-rest', max: (character) => is2024Rules(character) ? proficiencyBonusOf(character) : 1 },
  ],
  Ranger: [
    {
      key: 'favored_enemy',
      label: 'Favored Enemy',
      minLevel: 1,
      restore: 'long-rest',
      max: (character) => {
        if (!is2024Rules(character)) return 0;
        return Math.max(2, Math.ceil(rangerLevelOf(character) / 2));
      },
    },
  ],
  Rogue: [],
  Sorcerer: [
    { key: 'sorcery_points', label: 'Sorcery Points', minLevel: 2, restore: 'long-rest', max: (character) => sorcererLevelOf(character) },
  ],
  Warlock: [
    { key: 'pact_magic', label: 'Pact Magic', minLevel: 1, restore: 'short-rest', max: (character) => warlockLevelOf(character) >= 2 ? 2 : 1 },
  ],
  Wizard: [
    { key: 'arcane_recovery', label: 'Arcane Recovery', minLevel: 1, restore: 'long-rest', max: () => 1 },
  ],
};


const canonicalResourceClassName = (className = '') => {
  const normalized = normalizeName(className);
  return Object.keys(CLASS_RESOURCE_RULES).find(name => normalizeName(name) === normalized) || className;
};

const hasExplicitClassLevel = (character, className) => {
  const key = normalizeName(className);
  const directKey = `${key}_level`;
  const camelKey = `${key}Level`;
  if (Number(character?.[directKey] || character?.[camelKey] || 0) > 0) return true;

  const classLevels = { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
  if (Number(classLevels[key] || classLevels[className] || classLevels[className?.charAt?.(0)?.toUpperCase?.() + className?.slice?.(1)] || 0) > 0) return true;

  const entries = Array.isArray(character?.classes) ? character.classes : [];
  return entries.some(item => normalizeName(item?.name || item?.class_name || item?.className || item?.class) === key && Number(item?.level || item?.class_level || item?.classLevel || 0) > 0);
};

const resourceClassNamesFor = (character) => {
  const primary = canonicalResourceClassName(character?.character_class || character?.className || '');
  const names = primary ? [primary] : [];
  const primaryKey = normalizeName(primary);

  Object.keys(CLASS_RESOURCE_RULES).forEach(className => {
    if (normalizeName(className) !== primaryKey && hasExplicitClassLevel(character, className)) {
      names.push(className);
    }
  });

  return Array.from(new Set(names));
};

const resourceLevelOf = (character, className) => {
  const normalizedClass = normalizeName(className);
  if (normalizedClass === 'fighter') return fighterLevelOf(character);
  if (normalizedClass === 'barbarian') return barbarianLevelOf(character);
  if (normalizedClass === 'bard') return bardLevelOf(character);
  if (normalizedClass === 'cleric') return clericLevelOf(character);
  if (normalizedClass === 'monk') return monkLevelOf(character);
  if (normalizedClass === 'paladin') return paladinLevelOf(character);
  if (normalizedClass === 'ranger') return rangerLevelOf(character);
  if (normalizedClass === 'sorcerer') return sorcererLevelOf(character);
  if (normalizedClass === 'warlock') return warlockLevelOf(character);
  return classLevelOf(character, className);
};

export function getClassResourceRules(character) {
  return resourceClassNamesFor(character).flatMap(className => {
    const level = resourceLevelOf(character, className);
    return (CLASS_RESOURCE_RULES[className] || [])
      .filter(rule => level >= (rule.minLevel || 1))
      .map(rule => {
        const restore = typeof rule.restore === 'function' ? rule.restore(character) : rule.restore;
        return {
          ...rule,
          className,
          restore,
          maxValue: Math.max(0, Number(rule.max?.(character) || 0)),
        };
      })
      .filter(rule => rule.maxValue > 0);
  });
}

export function buildInitialClassResources(character) {
  return getClassResourceRules(character).reduce((resources, rule) => {
    resources[rule.key] = {
      label: ruleLabel(rule, character),
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
      label: ruleLabel(rule, character),
      current: rule.maxValue,
      remaining: rule.maxValue,
      max: rule.maxValue,
      restore: rule.restore || existing.restore || 'long-rest',
      min_level: rule.minLevel || existing.min_level || 1,
    };
  });
  return restored;
}

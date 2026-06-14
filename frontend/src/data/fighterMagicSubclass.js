// Fighter magic-subclass helpers for app unlocks, sheet display, and builder wiring.

export const FIGHTER_MAGIC_FEATURES_2014 = [
  { level: 3, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting', description: 'Gain limited Wizard spellcasting as a Fighter subclass.' },
  { level: 3, key: 'weapon_bond', name: 'Weapon Bond', type: 'utility', description: 'Bond with weapons and call one back to hand.' },
  { level: 7, key: 'war_magic', name: 'War Magic', type: 'combat', description: 'Blend a cantrip with a weapon attack.' },
  { level: 10, key: 'eldritch_strike', name: 'Eldritch Strike', type: 'combat', description: 'Weapon hits can make later spell effects harder to resist.' },
  { level: 15, key: 'arcane_charge', name: 'Arcane Charge', type: 'mobility', description: 'Teleport when using Action Surge.' },
  { level: 18, key: 'improved_war_magic', name: 'Improved War Magic', type: 'combat', description: 'Blend a spell with a weapon attack.' },
];

export const FIGHTER_MAGIC_FEATURES_2024 = [
  { level: 3, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting', description: 'Gain limited Wizard spellcasting as a Fighter subclass.' },
  { level: 3, key: 'weapon_bond', name: 'Weapon Bond', type: 'utility', description: 'Bond with weapons and call one back to hand.' },
  { level: 7, key: 'war_magic', name: 'War Magic', type: 'combat', description: 'Blend magic and weapon attacks.' },
  { level: 10, key: 'eldritch_strike', name: 'Eldritch Strike', type: 'combat', description: 'Weapon hits can make later spell effects harder to resist.' },
  { level: 15, key: 'arcane_charge', name: 'Arcane Charge', type: 'mobility', description: 'Teleport when using Action Surge.' },
  { level: 18, key: 'improved_war_magic', name: 'Improved War Magic', type: 'combat', description: 'Blend stronger magic and weapon attacks.' },
];

export const FIGHTER_MAGIC_SPELL_SLOTS = {
  3: [2, 0, 0, 0],
  4: [3, 0, 0, 0],
  7: [4, 2, 0, 0],
  10: [4, 3, 0, 0],
  13: [4, 3, 2, 0],
  16: [4, 3, 3, 0],
  19: [4, 3, 3, 1],
};

export function normaliseMagicSubclassRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function normaliseMagicSubclassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function isFighterMagicSubclass(value = '') {
  return ['eldritch_knight', 'eldritchknight', 'fighter_eldritch_knight'].includes(normaliseMagicSubclassName(value));
}

export function getFighterMagicProgression(edition = '2014') {
  return normaliseMagicSubclassRuleset(edition) === '2024' ? FIGHTER_MAGIC_FEATURES_2024 : FIGHTER_MAGIC_FEATURES_2014;
}

export function getFighterMagicFeaturesForLevel(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getFighterMagicProgression(edition).filter(feature => feature.level === fighterLevel);
}

export function getActiveFighterMagicFeatures(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getFighterMagicProgression(edition).filter(feature => feature.level <= fighterLevel);
}

export function getFighterMagicSlotProgression(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  const knownLevel = Object.keys(FIGHTER_MAGIC_SPELL_SLOTS)
    .map(Number)
    .filter(slotLevel => slotLevel <= fighterLevel)
    .sort((a, b) => b - a)[0];
  return knownLevel ? FIGHTER_MAGIC_SPELL_SLOTS[knownLevel] : [0, 0, 0, 0];
}

export function getFighterMagicSummary(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return {
    edition: normaliseMagicSubclassRuleset(edition),
    level: fighterLevel,
    spellSlots: getFighterMagicSlotProgression(fighterLevel),
    currentLevelFeatures: getFighterMagicFeaturesForLevel(fighterLevel, edition),
    activeFeatures: getActiveFighterMagicFeatures(fighterLevel, edition),
  };
}

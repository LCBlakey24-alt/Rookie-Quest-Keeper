// Starting equipment option scaffolds for character creation.
// These are generic SRD/basic-compatible choices, designed for app logic/testing.
// They intentionally avoid copying full sourcebook wording.

export const STARTING_EQUIPMENT_RULES = {
  Barbarian: [
    { id: 'primary', label: 'Primary weapon', choose: 1, options: ['Greataxe', 'Battleaxe', 'Longsword', 'Maul', 'Greatsword'] },
    { id: 'secondary', label: 'Secondary weapon', choose: 1, options: ['Handaxe x2', 'Javelin x4', 'Spear', 'Mace'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Explorer's Pack"] },
  ],
  Bard: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Rapier', 'Longsword', 'Shortsword', 'Simple weapon'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Diplomat's Pack", "Entertainer's Pack"] },
    { id: 'instrument', label: 'Instrument', choose: 1, options: ['Lute', 'Flute', 'Drum', 'Lyre', 'Horn'] },
    { id: 'armor', label: 'Armour', choose: 1, options: ['Leather Armor'] },
    { id: 'utility', label: 'Utility', choose: 1, options: ['Dagger'] },
  ],
  Cleric: [
    { id: 'armor', label: 'Armour', choose: 1, options: ['Scale Mail', 'Leather Armor', 'Chain Mail if proficient'] },
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Mace', 'Warhammer if proficient'] },
    { id: 'ranged', label: 'Ranged/simple option', choose: 1, options: ['Light Crossbow + bolts', 'Simple weapon'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Priest's Pack", "Explorer's Pack"] },
    { id: 'shield', label: 'Shield / focus', choose: 1, options: ['Shield', 'Holy Symbol'] },
  ],
  Druid: [
    { id: 'shield_or_weapon', label: 'Shield or weapon', choose: 1, options: ['Shield', 'Simple weapon'] },
    { id: 'main_weapon', label: 'Main weapon', choose: 1, options: ['Scimitar', 'Simple melee weapon'] },
    { id: 'armor', label: 'Armour', choose: 1, options: ['Leather Armor'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Explorer's Pack"] },
    { id: 'focus', label: 'Focus', choose: 1, options: ['Druidic Focus'] },
  ],
  Fighter: [
    { id: 'armor', label: 'Armour', choose: 1, options: ['Chain Mail', 'Leather Armor + Longbow'] },
    { id: 'primary', label: 'Primary weapon set', choose: 1, options: ['Longsword + Shield', 'Battleaxe + Shield', 'Greatsword', 'Longbow', 'Two martial weapons'] },
    { id: 'secondary', label: 'Secondary weapon', choose: 1, options: ['Light Crossbow + bolts', 'Handaxe x2'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Dungeoneer's Pack", "Explorer's Pack"] },
  ],
  Monk: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Shortsword', 'Simple weapon'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Dungeoneer's Pack", "Explorer's Pack"] },
    { id: 'extra', label: 'Extra', choose: 1, options: ['Dart x10'] },
  ],
  Paladin: [
    { id: 'primary', label: 'Primary weapon set', choose: 1, options: ['Longsword + Shield', 'Warhammer + Shield', 'Greatsword', 'Two martial weapons'] },
    { id: 'secondary', label: 'Secondary weapon', choose: 1, options: ['Javelin x5', 'Simple melee weapon'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Priest's Pack", "Explorer's Pack"] },
    { id: 'armor', label: 'Armour', choose: 1, options: ['Chain Mail'] },
    { id: 'focus', label: 'Focus', choose: 1, options: ['Holy Symbol'] },
  ],
  Ranger: [
    { id: 'armor', label: 'Armour', choose: 1, options: ['Scale Mail', 'Leather Armor'] },
    { id: 'weapons', label: 'Weapon set', choose: 1, options: ['Shortsword x2', 'Simple melee weapon x2'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Dungeoneer's Pack", "Explorer's Pack"] },
    { id: 'ranged', label: 'Ranged weapon', choose: 1, options: ['Longbow + arrows'] },
  ],
  Rogue: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Rapier', 'Shortsword'] },
    { id: 'ranged', label: 'Ranged/secondary', choose: 1, options: ['Shortbow + arrows', 'Shortsword'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Burglar's Pack", "Dungeoneer's Pack", "Explorer's Pack"] },
    { id: 'armor', label: 'Armour', choose: 1, options: ['Leather Armor'] },
    { id: 'tools', label: 'Tools', choose: 1, options: ["Thieves' Tools"] },
  ],
  Sorcerer: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Light Crossbow + bolts', 'Simple weapon'] },
    { id: 'focus', label: 'Focus', choose: 1, options: ['Component Pouch', 'Arcane Focus'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Dungeoneer's Pack", "Explorer's Pack"] },
    { id: 'daggers', label: 'Daggers', choose: 1, options: ['Dagger x2'] },
  ],
  Warlock: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Light Crossbow + bolts', 'Simple weapon'] },
    { id: 'focus', label: 'Focus', choose: 1, options: ['Component Pouch', 'Arcane Focus'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Scholar's Pack", "Dungeoneer's Pack"] },
    { id: 'armor', label: 'Armour', choose: 1, options: ['Leather Armor'] },
    { id: 'simple', label: 'Simple weapons', choose: 1, options: ['Simple weapon x2'] },
  ],
  Wizard: [
    { id: 'weapon', label: 'Weapon', choose: 1, options: ['Quarterstaff', 'Dagger'] },
    { id: 'focus', label: 'Focus', choose: 1, options: ['Component Pouch', 'Arcane Focus'] },
    { id: 'pack', label: 'Pack', choose: 1, options: ["Scholar's Pack", "Explorer's Pack"] },
    { id: 'spellbook', label: 'Spellbook', choose: 1, options: ['Spellbook'] },
  ],
};

export function getStartingEquipmentGroups(className) {
  return STARTING_EQUIPMENT_RULES[className] || [];
}

export function flattenStartingEquipmentChoices(groups = [], selected = {}) {
  return groups.flatMap(group => {
    const chosen = selected[group.id] || group.options?.[0];
    if (!chosen) return [];
    return Array.isArray(chosen) ? chosen : [chosen];
  });
}

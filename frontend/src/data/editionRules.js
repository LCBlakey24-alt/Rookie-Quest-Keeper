/**
 * 5e-compatible edition rules - 2014 vs 2024
 * This file contains edition-specific data for character creation and level-up
 * Based on SRD (System Reference Document) - copyright-safe content
 */

// ==================== EDITION CONSTANTS ====================

export const EDITIONS = {
  '2014': {
    name: '2014 (Classic 5e)',
    description: 'Original 5th Edition rules from 2014 PHB',
    subclass_unlock_text: 'Choose archetype at level specified by class'
  },
  '2024': {
    name: '2024 (Revised 5e)',
    description: 'Revised 5th Edition rules from 2024 PHB',
    subclass_unlock_text: 'All classes choose subclass at level 3'
  }
};

// ==================== SUBCLASS UNLOCK LEVELS ====================

// 2014 Rules - Subclass unlock varies by class
export const SUBCLASS_LEVELS_2014 = {
  'Barbarian': 3,
  'Bard': 3,
  'Cleric': 1,
  'Druid': 2,
  'Fighter': 3,
  'Monk': 3,
  'Paladin': 3,
  'Ranger': 3,
  'Rogue': 3,
  'Sorcerer': 1,
  'Warlock': 1,
  'Wizard': 2
};

// 2024 Rules - All classes get subclass at level 3
export const SUBCLASS_LEVELS_2024 = {
  'Barbarian': 3,
  'Bard': 3,
  'Cleric': 3,
  'Druid': 3,
  'Fighter': 3,
  'Monk': 3,
  'Paladin': 3,
  'Ranger': 3,
  'Rogue': 3,
  'Sorcerer': 3,
  'Warlock': 3,
  'Wizard': 3
};

// ==================== SPELLCASTING RULES ====================

// Cantrips known by class and level
export const CANTRIPS_KNOWN = {
  'Bard': { 1: 2, 4: 3, 10: 4 },
  'Cleric': { 1: 3, 4: 4, 10: 5 },
  'Druid': { 1: 2, 4: 3, 10: 4 },
  'Sorcerer': { 1: 4, 4: 5, 10: 6 },
  'Warlock': { 1: 2, 4: 3, 10: 4 },
  'Wizard': { 1: 3, 4: 4, 10: 5 },
  // Half-casters and third-casters
  'Fighter': { 3: 2, 10: 3 }, // Eldritch Knight
  'Rogue': { 3: 3, 10: 4 },   // Arcane Trickster
};

// Spells known by class and level (for known-spell classes)
export const SPELLS_KNOWN = {
  'Bard': { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 13: 16, 14: 18, 15: 19, 17: 20, 18: 22 },
  'Ranger': { 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 11: 7, 13: 8, 15: 9, 17: 10, 19: 11 },
  'Sorcerer': { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 13: 13, 15: 14, 17: 15 },
  'Warlock': { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 11: 11, 13: 12, 15: 13, 17: 14, 19: 15 },
  // Half-casters
  'Fighter': { 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 }, // Eldritch Knight
  'Rogue': { 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 },  // Arcane Trickster
};

// Prepared spell classes - prepare WIS/INT/CHA modifier + class level spells
export const PREPARED_SPELL_CLASSES = ['Cleric', 'Druid', 'Paladin', 'Wizard'];

// Spell slot progression by class type
export const SPELL_SLOT_PROGRESSION = {
  full: {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  },
  half: { // Paladin, Ranger
    1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    6: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    8: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    9: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    10: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    11: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    12: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    13: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    14: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    15: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    16: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    17: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    18: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    19: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    20: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  },
  third: { // Eldritch Knight, Arcane Trickster
    1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    5: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    6: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    7: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    8: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    9: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    10: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    11: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    12: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    13: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    14: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    15: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    16: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    17: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    18: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    19: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    20: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  },
  pact: { // Warlock
    1: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [0, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [0, 2, 0, 0, 0, 0, 0, 0, 0],
    5: [0, 0, 2, 0, 0, 0, 0, 0, 0],
    6: [0, 0, 2, 0, 0, 0, 0, 0, 0],
    7: [0, 0, 0, 2, 0, 0, 0, 0, 0],
    8: [0, 0, 0, 2, 0, 0, 0, 0, 0],
    9: [0, 0, 0, 0, 2, 0, 0, 0, 0],
    10: [0, 0, 0, 0, 2, 0, 0, 0, 0],
    11: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    12: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    13: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    14: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    15: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    16: [0, 0, 0, 0, 3, 0, 0, 0, 0],
    17: [0, 0, 0, 0, 4, 0, 0, 0, 0],
    18: [0, 0, 0, 0, 4, 0, 0, 0, 0],
    19: [0, 0, 0, 0, 4, 0, 0, 0, 0],
    20: [0, 0, 0, 0, 4, 0, 0, 0, 0],
  }
};

// Class spellcasting type
export const CLASS_SPELLCASTING_TYPE = {
  'Bard': 'full',
  'Cleric': 'full',
  'Druid': 'full',
  'Sorcerer': 'full',
  'Wizard': 'full',
  'Paladin': 'half',
  'Ranger': 'half',
  'Warlock': 'pact',
  'Fighter': 'third', // Eldritch Knight only
  'Rogue': 'third',   // Arcane Trickster only
  'Barbarian': null,
  'Monk': null,
};

// Spellcasting ability by class
export const SPELLCASTING_ABILITY = {
  'Bard': 'charisma',
  'Cleric': 'wisdom',
  'Druid': 'wisdom',
  'Paladin': 'charisma',
  'Ranger': 'wisdom',
  'Sorcerer': 'charisma',
  'Warlock': 'charisma',
  'Wizard': 'intelligence',
  'Fighter': 'intelligence', // Eldritch Knight
  'Rogue': 'intelligence',   // Arcane Trickster
};

// ==================== HIT DICE ====================

export const HIT_DICE = {
  'Barbarian': 12,
  'Fighter': 10,
  'Paladin': 10,
  'Ranger': 10,
  'Bard': 8,
  'Cleric': 8,
  'Druid': 8,
  'Monk': 8,
  'Rogue': 8,
  'Warlock': 8,
  'Sorcerer': 6,
  'Wizard': 6
};

// ==================== ASI LEVELS ====================

// Standard ASI levels (same for both editions)
export const ASI_LEVELS = {
  'Barbarian': [4, 8, 12, 16, 19],
  'Bard': [4, 8, 12, 16, 19],
  'Cleric': [4, 8, 12, 16, 19],
  'Druid': [4, 8, 12, 16, 19],
  'Fighter': [4, 6, 8, 12, 14, 16, 19],
  'Monk': [4, 8, 12, 16, 19],
  'Paladin': [4, 8, 12, 16, 19],
  'Ranger': [4, 8, 12, 16, 19],
  'Rogue': [4, 8, 10, 12, 16, 19],
  'Sorcerer': [4, 8, 12, 16, 19],
  'Warlock': [4, 8, 12, 16, 19],
  'Wizard': [4, 8, 12, 16, 19]
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get subclass unlock level for a class based on edition
 */
export function getSubclassUnlockLevel(className, edition = '2014') {
  if (edition === '2024') {
    return SUBCLASS_LEVELS_2024[className] || 3;
  }
  return SUBCLASS_LEVELS_2014[className] || 3;
}

/**
 * Check if a character can select a subclass
 */
export function canSelectSubclass(className, characterLevel, edition = '2014') {
  const unlockLevel = getSubclassUnlockLevel(className, edition);
  return characterLevel >= unlockLevel;
}

/**
 * Get cantrips known for a class at a given level
 */
export function getCantripsKnown(className, level) {
  const classCantrips = CANTRIPS_KNOWN[className];
  if (!classCantrips) return 0;
  
  let known = 0;
  for (const [lvl, count] of Object.entries(classCantrips)) {
    if (level >= parseInt(lvl)) {
      known = count;
    }
  }
  return known;
}

/**
 * Get spells known for a class at a given level (for known-spell classes)
 */
export function getSpellsKnown(className, level) {
  const classSpells = SPELLS_KNOWN[className];
  if (!classSpells) return 0;
  
  let known = 0;
  for (const [lvl, count] of Object.entries(classSpells)) {
    if (level >= parseInt(lvl)) {
      known = count;
    }
  }
  return known;
}

/**
 * Check if a class is a spellcaster
 */
export function isSpellcaster(className) {
  return CLASS_SPELLCASTING_TYPE[className] !== null;
}

/**
 * Get spell slots for a class at a given level
 */
export function getSpellSlots(className, level) {
  const spellType = CLASS_SPELLCASTING_TYPE[className];
  if (!spellType) return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  
  const progression = SPELL_SLOT_PROGRESSION[spellType];
  return progression[level] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/**
 * Check if level is an ASI level for a class
 */
export function isASILevel(className, level) {
  const asiLevels = ASI_LEVELS[className] || [4, 8, 12, 16, 19];
  return asiLevels.includes(level);
}

/**
 * Get max HP at level 1
 */
export function getLevel1HP(className, constitutionModifier) {
  const hitDie = HIT_DICE[className] || 8;
  return hitDie + constitutionModifier;
}

/**
 * Calculate HP gain for level up (average + CON mod)
 */
export function getLevelUpHP(className, constitutionModifier) {
  const hitDie = HIT_DICE[className] || 8;
  const average = Math.floor(hitDie / 2) + 1;
  return average + constitutionModifier;
}

// ==================== JSON UPLOAD SCHEMA DOCUMENTATION ====================

export const JSON_UPLOAD_SCHEMAS = {
  classes: {
    description: 'Upload custom classes',
    required: ['name', 'hit_die'],
    optional: ['description', 'primary_ability', 'saving_throws', 'armor_proficiencies', 'weapon_proficiencies', 'tool_proficiencies', 'skills', 'starting_equipment', 'spellcasting_ability', 'features'],
    example: {
      name: 'Blood Hunter',
      hit_die: 10,
      description: 'Hunters who use blood magic to fight monsters',
      primary_ability: 'Strength or Dexterity',
      saving_throws: ['Dexterity', 'Intelligence'],
      armor_proficiencies: ['Light', 'Medium', 'Shields'],
      weapon_proficiencies: ['Simple', 'Martial'],
      spellcasting_ability: null,
      features: [
        { name: 'Hunter\'s Bane', level: 1, description: 'Advantage on tracking creatures' }
      ]
    }
  },
  subclasses: {
    description: 'Upload custom subclasses',
    required: ['name', 'parent_class', 'unlock_level'],
    optional: ['description', 'features', 'spells'],
    example: {
      name: 'Order of the Profane Soul',
      parent_class: 'Blood Hunter',
      unlock_level: 3,
      description: 'Blood hunters who make pacts with lesser evils',
      features: [
        { name: 'Rite Focus', level: 3, description: 'Use your rite as a spellcasting focus' }
      ]
    }
  },
  races: {
    description: 'Upload custom races/species',
    required: ['name'],
    optional: ['description', 'ability_bonuses', 'size', 'speed', 'traits', 'languages', 'subraces'],
    example: {
      name: 'Dhampir',
      description: 'Half-vampire beings',
      ability_bonuses: '+2 to one, +1 to another',
      size: 'Medium',
      speed: 35,
      traits: [
        { name: 'Vampiric Bite', description: 'Constitution-based bite attack' },
        { name: 'Deathless Nature', description: 'Don\'t need to breathe' }
      ]
    }
  },
  spells: {
    description: 'Upload custom spells',
    required: ['name', 'level', 'school'],
    optional: ['casting_time', 'range', 'components', 'duration', 'description', 'classes', 'ritual', 'concentration'],
    example: {
      name: 'Blood Curse',
      level: 3,
      school: 'Necromancy',
      casting_time: '1 action',
      range: '60 feet',
      components: 'V, S',
      duration: 'Concentration, up to 1 minute',
      description: 'Target takes 3d8 necrotic damage and is cursed',
      classes: ['Blood Hunter', 'Warlock'],
      concentration: true
    }
  },
  feats: {
    description: 'Upload custom feats',
    required: ['name'],
    optional: ['description', 'prerequisite', 'benefits'],
    example: {
      name: 'Grappler',
      prerequisite: 'Strength 13 or higher',
      description: 'You have developed the skills necessary to hold your own in close-quarters grappling.',
      benefits: [
        'Advantage on attack rolls against creatures you are grappling',
        'You can use your action to try to pin a creature grappled by you'
      ]
    }
  },
  items: {
    description: 'Upload custom items',
    required: ['name', 'type'],
    optional: ['description', 'rarity', 'attunement', 'properties', 'damage', 'weight', 'cost'],
    example: {
      name: 'Blood Vial',
      type: 'Wondrous Item',
      rarity: 'Uncommon',
      attunement: false,
      description: 'A vial that can store blood for rituals'
    }
  },
  monsters: {
    description: 'Upload custom monsters/creatures',
    required: ['name', 'type', 'challenge_rating'],
    optional: ['size', 'alignment', 'armor_class', 'hit_points', 'speed', 'abilities', 'skills', 'damage_resistances', 'damage_immunities', 'condition_immunities', 'senses', 'languages', 'actions', 'legendary_actions'],
    example: {
      name: 'Blood Elemental',
      type: 'Elemental',
      challenge_rating: 5,
      size: 'Large',
      armor_class: 14,
      hit_points: '102 (12d10 + 36)',
      speed: '30 ft.'
    }
  }
};

// ==================== EDITION-SPECIFIC DEFAULT CONTENT ====================

// SRD Races available in both editions (can be filtered/modified by edition)
export const SRD_RACES_2014 = [
  { name: 'Human', bonus: '+1 to all ability scores', source: 'SRD', traits: ['Extra Language', 'Extra Skill'] },
  { name: 'Elf', bonus: '+2 DEX', source: 'SRD', traits: ['Darkvision', 'Fey Ancestry', 'Trance'] },
  { name: 'Dwarf', bonus: '+2 CON', source: 'SRD', traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'] },
  { name: 'Halfling', bonus: '+2 DEX', source: 'SRD', traits: ['Lucky', 'Brave', 'Halfling Nimbleness'] },
  { name: 'Dragonborn', bonus: '+2 STR, +1 CHA', source: 'SRD', traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'] },
  { name: 'Gnome', bonus: '+2 INT', source: 'SRD', traits: ['Darkvision', 'Gnome Cunning'] },
  { name: 'Half-Elf', bonus: '+2 CHA, +1 to two others', source: 'SRD', traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'] },
  { name: 'Half-Orc', bonus: '+2 STR, +1 CON', source: 'SRD', traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'] },
  { name: 'Tiefling', bonus: '+2 CHA, +1 INT', source: 'SRD', traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'] },
];

export const SRD_RACES_2024 = [
  { name: 'Human', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Resourceful', 'Skillful', 'Versatile'] },
  { name: 'Elf', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Darkvision', 'Fey Ancestry', 'Keen Senses', 'Trance'] },
  { name: 'Dwarf', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness', 'Stonecunning'] },
  { name: 'Halfling', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Brave', 'Halfling Nimbleness', 'Luck', 'Naturally Stealthy'] },
  { name: 'Dragonborn', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance', 'Draconic Flight'] },
  { name: 'Gnome', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Darkvision', 'Gnomish Cunning', 'Gnomish Lineage'] },
  { name: 'Goliath', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Giant Ancestry', 'Large Form', 'Powerful Build'] },
  { name: 'Orc', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Adrenaline Rush', 'Darkvision', 'Relentless Endurance'] },
  { name: 'Tiefling', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Darkvision', 'Fiendish Legacy', 'Otherworldly Presence'] },
  { name: 'Aasimar', bonus: 'Choose +2/+1 or +1/+1/+1', source: 'SRD 2024', traits: ['Celestial Resistance', 'Darkvision', 'Healing Hands', 'Light Bearer'] },
];

// SRD Backgrounds (simplified - both editions have similar backgrounds)
export const SRD_BACKGROUNDS = [
  { name: 'Acolyte', skills: ['Insight', 'Religion'], feature: 'Shelter of the Faithful' },
  { name: 'Criminal', skills: ['Deception', 'Stealth'], feature: 'Criminal Contact' },
  { name: 'Folk Hero', skills: ['Animal Handling', 'Survival'], feature: 'Rustic Hospitality' },
  { name: 'Noble', skills: ['History', 'Persuasion'], feature: 'Position of Privilege' },
  { name: 'Sage', skills: ['Arcana', 'History'], feature: 'Researcher' },
  { name: 'Soldier', skills: ['Athletics', 'Intimidation'], feature: 'Military Rank' },
];

export default {
  EDITIONS,
  SUBCLASS_LEVELS_2014,
  SUBCLASS_LEVELS_2024,
  CANTRIPS_KNOWN,
  SPELLS_KNOWN,
  PREPARED_SPELL_CLASSES,
  SPELL_SLOT_PROGRESSION,
  CLASS_SPELLCASTING_TYPE,
  SPELLCASTING_ABILITY,
  HIT_DICE,
  ASI_LEVELS,
  getSubclassUnlockLevel,
  canSelectSubclass,
  getCantripsKnown,
  getSpellsKnown,
  isSpellcaster,
  getSpellSlots,
  isASILevel,
  getLevel1HP,
  getLevelUpHP,
  JSON_UPLOAD_SCHEMAS,
  SRD_RACES_2014,
  SRD_RACES_2024,
  SRD_BACKGROUNDS
};

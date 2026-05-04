// Spell data organized by class and level
// This provides the default spell lists for each spellcasting class

export const SPELLCASTING_CLASSES = {
  Wizard: { ability: 'intelligence', type: 'prepared', ritual: true },
  Cleric: { ability: 'wisdom', type: 'prepared', ritual: true },
  Druid: { ability: 'wisdom', type: 'prepared', ritual: true },
  Bard: { ability: 'charisma', type: 'known', ritual: false },
  Sorcerer: { ability: 'charisma', type: 'known', ritual: false },
  Warlock: { ability: 'charisma', type: 'known', ritual: false, pactMagic: true },
  Paladin: { ability: 'charisma', type: 'prepared', ritual: false, halfCaster: true },
  Ranger: { ability: 'wisdom', type: 'known', ritual: false, halfCaster: true },
  Fighter: { ability: 'intelligence', type: 'known', ritual: false, subclassOnly: 'Eldritch Knight', thirdCaster: true },
  Rogue: { ability: 'intelligence', type: 'known', ritual: false, subclassOnly: 'Arcane Trickster', thirdCaster: true }
};

const normalizeRuleName = (value = '') =>
  String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

export const getCanonicalSpellcastingClass = (className = '') =>
  Object.keys(SPELLCASTING_CLASSES).find(cls => normalizeRuleName(cls) === normalizeRuleName(className)) || className;

export const getCharacterClassLevel = (character = {}, className = '') => {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const classLevels = character?.multiclass_levels || character?.class_levels || {};
  const levelEntry = Object.entries(classLevels).find(([cls]) =>
    normalizeRuleName(cls) === normalizeRuleName(canonicalClass)
  );
  if (levelEntry) return Number(levelEntry[1]) || 0;

  const classEntry = (character?.classes || []).find(cls =>
    normalizeRuleName(cls?.name || cls?.class_name || cls?.character_class) === normalizeRuleName(canonicalClass)
  );
  if (classEntry) return Number(classEntry.level) || 0;

  return normalizeRuleName(character?.character_class) === normalizeRuleName(canonicalClass)
    ? Number(character?.level) || 1
    : 0;
};

export const getCharacterSubclassForClass = (character = {}, className = '') => {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const classEntry = (character?.classes || []).find(cls =>
    normalizeRuleName(cls?.name || cls?.class_name || cls?.character_class) === normalizeRuleName(canonicalClass)
  );

  if (classEntry?.subclass) return classEntry.subclass;
  return normalizeRuleName(character?.character_class) === normalizeRuleName(canonicalClass)
    ? character?.subclass
    : '';
};

export const classHasSpellcasting = (character = {}, className = '') => {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const classInfo = SPELLCASTING_CLASSES[canonicalClass];
  if (!classInfo) return false;

  const classLevel = getCharacterClassLevel(character, canonicalClass);
  if (classLevel <= 0) return false;
  if (classInfo.halfCaster && classLevel < 2) return false;

  if (classInfo.subclassOnly) {
    const subclass = getCharacterSubclassForClass(character, canonicalClass);
    return classLevel >= 3 && normalizeRuleName(subclass) === normalizeRuleName(classInfo.subclassOnly);
  }

  return true;
};

export const getCharacterSpellcastingClass = (character = {}) => {
  const primaryClass = getCanonicalSpellcastingClass(character?.character_class || '');
  if (classHasSpellcasting(character, primaryClass)) return primaryClass;

  const classNames = new Set([
    ...Object.keys(character?.multiclass_levels || {}),
    ...Object.keys(character?.class_levels || {}),
    ...(character?.classes || []).map(cls => cls?.name || cls?.class_name || cls?.character_class).filter(Boolean),
  ]);

  for (const className of classNames) {
    const canonicalClass = getCanonicalSpellcastingClass(className);
    if (classHasSpellcasting(character, canonicalClass)) return canonicalClass;
  }

  return null;
};

export const canCharacterCastSpells = (character = {}) =>
  Boolean(getCharacterSpellcastingClass(character));

export const getCharacterSpellcastingInfo = (character = {}) => {
  const className = getCharacterSpellcastingClass(character);
  if (!className) return null;

  return {
    className,
    classInfo: SPELLCASTING_CLASSES[className],
    level: getCharacterClassLevel(character, className),
  };
};

export const getSpellSlotsForCaster = (classInfo, casterLevel) => {
  if (!classInfo || casterLevel <= 0) return {};
  if (classInfo.pactMagic) return PACT_MAGIC_SLOTS[casterLevel] || {};
  if (classInfo.halfCaster) return SPELL_SLOTS[Math.floor(casterLevel / 2)] || {};
  if (classInfo.thirdCaster) return SPELL_SLOTS[Math.floor(casterLevel / 3)] || {};
  return SPELL_SLOTS[casterLevel] || {};
};

// Spell slots per level (full casters)
export const SPELL_SLOTS = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }
};

// Warlock pact magic slots
export const PACT_MAGIC_SLOTS = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  6: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 }
};

// Cantrips known by level
export const CANTRIPS_KNOWN = {
  Wizard: { 1: 3, 4: 4, 10: 5 },
  Cleric: { 1: 3, 4: 4, 10: 5 },
  Druid: { 1: 2, 4: 3, 10: 4 },
  Bard: { 1: 2, 4: 3, 10: 4 },
  Sorcerer: { 1: 4, 4: 5, 10: 6 },
  Warlock: { 1: 2, 4: 3, 10: 4 }
};

// Spells known for "known" casters
export const SPELLS_KNOWN = {
  Bard: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 12: 15, 13: 16, 14: 18, 15: 19, 16: 19, 17: 20, 18: 22, 19: 22, 20: 22 },
  Sorcerer: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 15, 20: 15 },
  Warlock: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10, 11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15 },
  Ranger: { 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 11: 7, 13: 8, 15: 9, 17: 10, 19: 11 }
};

// Standard D&D 5e Spell List
export const SPELL_DATABASE = {
  // CANTRIPS (Level 0)
  cantrips: [
    // Universal / Multi-class
    { name: 'Light', school: 'Evocation', classes: ['Wizard', 'Cleric', 'Bard', 'Sorcerer'], description: 'Touch object glows 20ft bright, 20ft dim for 1 hour' },
    { name: 'Mending', school: 'Transmutation', classes: ['Wizard', 'Cleric', 'Bard', 'Druid', 'Sorcerer'], description: 'Repair a single break or tear in an object' },
    { name: 'Prestidigitation', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Minor magical tricks' },
    
    // Wizard / Sorcerer
    { name: 'Fire Bolt', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '1d10', damageType: 'fire', description: 'Ranged spell attack, 120ft' },
    { name: 'Ray of Frost', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '1d8', damageType: 'cold', description: 'Ranged attack, -10ft speed on hit' },
    { name: 'Shocking Grasp', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '1d8', damageType: 'lightning', description: 'Melee spell attack, no reactions' },
    { name: 'Acid Splash', school: 'Conjuration', classes: ['Wizard', 'Sorcerer'], damage: '1d6', damageType: 'acid', description: 'DEX save, can hit 2 creatures within 5ft' },
    { name: 'Chill Touch', school: 'Necromancy', classes: ['Wizard', 'Sorcerer', 'Warlock'], damage: '1d8', damageType: 'necrotic', description: 'No healing until your next turn' },
    { name: 'Minor Illusion', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Create sound or image, lasts 1 minute' },
    { name: 'Mage Hand', school: 'Conjuration', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Spectral hand, 30ft range, 10 lbs' },
    { name: 'Message', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Whisper message to creature within 120ft' },
    { name: 'True Strike', school: 'Divination', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Advantage on next attack against target' },
    { name: 'Blade Ward', school: 'Abjuration', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Resistance to bludgeoning/piercing/slashing' },
    { name: 'Friends', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Advantage on CHA checks, target hostile after' },
    { name: 'Dancing Lights', school: 'Evocation', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Up to 4 lights, dim 10ft each' },
    
    // Cleric
    { name: 'Sacred Flame', school: 'Evocation', classes: ['Cleric'], damage: '1d8', damageType: 'radiant', description: 'DEX save, ignores cover' },
    { name: 'Guidance', school: 'Divination', classes: ['Cleric', 'Druid'], description: '+1d4 to one ability check' },
    { name: 'Resistance', school: 'Abjuration', classes: ['Cleric', 'Druid'], description: '+1d4 to one saving throw' },
    { name: 'Spare the Dying', school: 'Necromancy', classes: ['Cleric'], description: 'Stabilize creature at 0 HP' },
    { name: 'Thaumaturgy', school: 'Transmutation', classes: ['Cleric'], description: 'Minor divine manifestations' },
    { name: 'Toll the Dead', school: 'Necromancy', classes: ['Cleric', 'Warlock'], damage: '1d8/1d12', damageType: 'necrotic', description: 'WIS save, 1d12 if damaged' },
    { name: 'Word of Radiance', school: 'Evocation', classes: ['Cleric'], damage: '1d6', damageType: 'radiant', description: 'CON save, all within 5ft' },
    
    // Druid
    { name: 'Druidcraft', school: 'Transmutation', classes: ['Druid'], description: 'Minor nature effects' },
    { name: 'Produce Flame', school: 'Conjuration', classes: ['Druid'], damage: '1d8', damageType: 'fire', description: 'Light + ranged attack' },
    { name: 'Shillelagh', school: 'Transmutation', classes: ['Druid'], description: 'Club/quarterstaff uses WIS, 1d8 magical' },
    { name: 'Thorn Whip', school: 'Transmutation', classes: ['Druid'], damage: '1d6', damageType: 'piercing', description: 'Pull large or smaller 10ft toward you' },
    { name: 'Poison Spray', school: 'Conjuration', classes: ['Druid', 'Wizard', 'Sorcerer', 'Warlock'], damage: '1d12', damageType: 'poison', description: 'CON save, 10ft range' },
    
    // Warlock
    { name: 'Eldritch Blast', school: 'Evocation', classes: ['Warlock'], damage: '1d10', damageType: 'force', description: 'Best cantrip in game, multiple beams at higher levels' },
    
    // Bard
    { name: 'Vicious Mockery', school: 'Enchantment', classes: ['Bard'], damage: '1d4', damageType: 'psychic', description: 'WIS save, disadvantage on next attack' }
  ],

  // 1ST LEVEL SPELLS
  1: [
    // Damage
    { name: 'Magic Missile', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '3d4+3', damageType: 'force', description: 'Auto-hit, 3 darts' },
    { name: 'Burning Hands', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '3d6', damageType: 'fire', description: '15ft cone, DEX save' },
    { name: 'Thunderwave', school: 'Evocation', classes: ['Wizard', 'Bard', 'Druid', 'Sorcerer'], damage: '2d8', damageType: 'thunder', description: '15ft cube, CON save, pushes 10ft' },
    { name: 'Chromatic Orb', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '3d8', damageType: 'varies', description: 'Choose acid/cold/fire/lightning/poison/thunder' },
    { name: 'Witch Bolt', school: 'Evocation', classes: ['Wizard', 'Sorcerer', 'Warlock'], damage: '1d12', damageType: 'lightning', description: 'Sustained damage, concentration' },
    { name: 'Ice Knife', school: 'Conjuration', classes: ['Wizard', 'Druid', 'Sorcerer'], damage: '1d10+2d6', damageType: 'piercing/cold', description: 'Attack + area burst' },
    { name: 'Guiding Bolt', school: 'Evocation', classes: ['Cleric'], damage: '4d6', damageType: 'radiant', description: 'Next attack has advantage' },
    { name: 'Inflict Wounds', school: 'Necromancy', classes: ['Cleric'], damage: '3d10', damageType: 'necrotic', description: 'Melee spell attack' },
    { name: 'Hellish Rebuke', school: 'Evocation', classes: ['Warlock'], damage: '2d10', damageType: 'fire', description: 'Reaction when damaged' },
    { name: 'Arms of Hadar', school: 'Conjuration', classes: ['Warlock'], damage: '2d6', damageType: 'necrotic', description: '10ft radius, no reactions' },
    
    // Utility / Buff
    { name: 'Shield', school: 'Abjuration', classes: ['Wizard', 'Sorcerer'], description: 'Reaction: +5 AC until next turn' },
    { name: 'Mage Armor', school: 'Abjuration', classes: ['Wizard', 'Sorcerer'], description: 'AC = 13 + DEX, 8 hours' },
    { name: 'Detect Magic', school: 'Divination', classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Paladin', 'Ranger'], ritual: true, description: 'Sense magic within 30ft' },
    { name: 'Identify', school: 'Divination', classes: ['Wizard', 'Bard'], ritual: true, description: 'Learn properties of magic item' },
    { name: 'Find Familiar', school: 'Conjuration', classes: ['Wizard'], ritual: true, description: 'Summon spirit familiar' },
    { name: 'Feather Fall', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Reaction: slow fall for up to 5 creatures' },
    { name: 'Comprehend Languages', school: 'Divination', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], ritual: true, description: 'Understand all languages' },
    { name: 'Disguise Self', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Change appearance for 1 hour' },
    { name: 'Silent Image', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Create 15ft cube visual illusion' },
    { name: 'Sleep', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer'], description: '5d8 HP of creatures fall asleep' },
    { name: 'Charm Person', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Druid', 'Sorcerer', 'Warlock'], description: 'WIS save or charmed' },
    { name: 'Unseen Servant', school: 'Conjuration', classes: ['Wizard', 'Bard', 'Warlock'], ritual: true, description: 'Invisible force to do simple tasks' },
    { name: 'Expeditious Retreat', school: 'Transmutation', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: 'Dash as bonus action' },
    { name: 'Jump', school: 'Transmutation', classes: ['Wizard', 'Druid', 'Ranger', 'Sorcerer'], description: 'Triple jump distance' },
    { name: 'Longstrider', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Druid', 'Ranger'], description: '+10ft speed for 1 hour' },
    { name: 'Fog Cloud', school: 'Conjuration', classes: ['Wizard', 'Druid', 'Ranger', 'Sorcerer'], description: '20ft radius heavily obscured' },
    { name: 'Grease', school: 'Conjuration', classes: ['Wizard'], description: '10ft square difficult terrain, DEX or fall prone' },
    
    // Healing
    { name: 'Cure Wounds', school: 'Evocation', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'], healing: '1d8+mod', description: 'Touch healing' },
    { name: 'Healing Word', school: 'Evocation', classes: ['Bard', 'Cleric', 'Druid'], healing: '1d4+mod', description: 'Bonus action, 60ft range' },
    { name: 'Goodberry', school: 'Transmutation', classes: ['Druid', 'Ranger'], healing: '10', description: '10 berries, each heals 1 HP' },
    
    // Cleric Specific
    { name: 'Bless', school: 'Enchantment', classes: ['Cleric', 'Paladin'], description: '+1d4 to attacks and saves for 3 creatures' },
    { name: 'Bane', school: 'Enchantment', classes: ['Bard', 'Cleric'], description: '-1d4 to attacks and saves for 3 creatures' },
    { name: 'Shield of Faith', school: 'Abjuration', classes: ['Cleric', 'Paladin'], description: '+2 AC for 10 minutes' },
    { name: 'Sanctuary', school: 'Abjuration', classes: ['Cleric'], description: 'WIS save to target protected creature' },
    { name: 'Command', school: 'Enchantment', classes: ['Cleric', 'Paladin'], description: 'One-word command, WIS save' },
    { name: 'Detect Evil and Good', school: 'Divination', classes: ['Cleric', 'Paladin'], description: 'Sense aberrations, celestials, etc.' },
    
    // Druid Specific
    { name: 'Entangle', school: 'Conjuration', classes: ['Druid'], description: '20ft square restrains, difficult terrain' },
    { name: 'Faerie Fire', school: 'Evocation', classes: ['Bard', 'Druid'], description: '20ft cube, outlines creatures, grants advantage' },
    { name: 'Speak with Animals', school: 'Divination', classes: ['Bard', 'Druid', 'Ranger'], ritual: true, description: 'Communicate with beasts' },
    { name: 'Animal Friendship', school: 'Enchantment', classes: ['Bard', 'Druid', 'Ranger'], description: 'Charm beast for 24 hours' },
    { name: 'Create or Destroy Water', school: 'Transmutation', classes: ['Cleric', 'Druid'], description: 'Create 10 gallons or destroy 30ft cube fog' },
    
    // Bard Specific
    { name: 'Dissonant Whispers', school: 'Enchantment', classes: ['Bard'], damage: '3d6', damageType: 'psychic', description: 'WIS save, must use reaction to move away' },
    { name: 'Heroism', school: 'Enchantment', classes: ['Bard', 'Paladin'], description: 'Immune to frightened, temp HP each turn' },
    { name: 'Tasha\'s Hideous Laughter', school: 'Enchantment', classes: ['Bard', 'Wizard'], description: 'WIS save or incapacitated laughing' },
    
    // Warlock Specific
    { name: 'Hex', school: 'Enchantment', classes: ['Warlock'], damage: '+1d6', damageType: 'necrotic', description: 'Extra damage + disadvantage on one ability' },
    { name: 'Armor of Agathys', school: 'Abjuration', classes: ['Warlock'], description: '5 temp HP, 5 cold damage to melee attackers' },
    
    // Paladin Specific
    { name: 'Divine Favor', school: 'Evocation', classes: ['Paladin'], damage: '+1d4', damageType: 'radiant', description: 'Extra damage on weapon attacks' },
    { name: 'Compelled Duel', school: 'Enchantment', classes: ['Paladin'], description: 'Target has disadvantage attacking others' },
    { name: 'Searing Smite', school: 'Evocation', classes: ['Paladin'], damage: '1d6', damageType: 'fire', description: 'On hit, ongoing fire damage' },
    { name: 'Thunderous Smite', school: 'Evocation', classes: ['Paladin'], damage: '2d6', damageType: 'thunder', description: 'On hit, STR save or pushed 10ft + prone' },
    { name: 'Wrathful Smite', school: 'Evocation', classes: ['Paladin'], damage: '1d6', damageType: 'psychic', description: 'On hit, WIS save or frightened' },
    
    // Ranger Specific
    { name: 'Hunter\'s Mark', school: 'Divination', classes: ['Ranger'], damage: '+1d6', description: 'Extra damage, track marked creature' },
    { name: 'Ensnaring Strike', school: 'Conjuration', classes: ['Ranger'], description: 'On hit, STR save or restrained' },
    { name: 'Hail of Thorns', school: 'Conjuration', classes: ['Ranger'], damage: '1d10', damageType: 'piercing', description: 'On hit, area thorns' },
    { name: 'Absorb Elements', school: 'Abjuration', classes: ['Druid', 'Ranger', 'Wizard', 'Sorcerer'], description: 'Reaction: resist element, next melee +1d6' }
  ],

  // 2ND LEVEL SPELLS
  2: [
    { name: 'Scorching Ray', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '6d6', damageType: 'fire', description: '3 rays, ranged spell attacks' },
    { name: 'Shatter', school: 'Evocation', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], damage: '3d8', damageType: 'thunder', description: '10ft radius, CON save' },
    { name: 'Misty Step', school: 'Conjuration', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: 'Bonus action teleport 30ft' },
    { name: 'Hold Person', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock'], description: 'WIS save or paralyzed' },
    { name: 'Invisibility', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Invisible until attack/spell' },
    { name: 'Suggestion', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'WIS save, suggest course of action' },
    { name: 'Mirror Image', school: 'Illusion', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: '3 duplicates, AC 10+DEX' },
    { name: 'Blur', school: 'Illusion', classes: ['Wizard', 'Sorcerer'], description: 'Attacks against you have disadvantage' },
    { name: 'Web', school: 'Conjuration', classes: ['Wizard', 'Sorcerer'], description: '20ft cube restrains, difficult terrain' },
    { name: 'Darkness', school: 'Evocation', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: '15ft magical darkness' },
    { name: 'Levitate', school: 'Transmutation', classes: ['Wizard', 'Sorcerer'], description: 'Rise 20ft, can move along surfaces' },
    { name: 'Spider Climb', school: 'Transmutation', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: 'Walk on walls and ceilings' },
    { name: 'Knock', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Open locks, loud knock' },
    { name: 'See Invisibility', school: 'Divination', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'See invisible creatures' },
    { name: 'Enlarge/Reduce', school: 'Transmutation', classes: ['Wizard', 'Sorcerer'], description: 'Double or halve size' },
    { name: 'Spiritual Weapon', school: 'Evocation', classes: ['Cleric'], damage: '1d8+mod', damageType: 'force', description: 'Bonus action attacks' },
    { name: 'Aid', school: 'Abjuration', classes: ['Cleric', 'Paladin'], description: '+5 max HP for 3 creatures' },
    { name: 'Lesser Restoration', school: 'Abjuration', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'], description: 'End disease or condition' },
    { name: 'Prayer of Healing', school: 'Evocation', classes: ['Cleric'], healing: '2d8+mod', description: 'Heal 6 creatures, 10 minutes' },
    { name: 'Silence', school: 'Illusion', classes: ['Bard', 'Cleric', 'Ranger'], ritual: true, description: '20ft radius no sound' },
    { name: 'Zone of Truth', school: 'Enchantment', classes: ['Bard', 'Cleric', 'Paladin'], description: 'CHA save or cannot lie' },
    { name: 'Moonbeam', school: 'Evocation', classes: ['Druid'], damage: '2d10', damageType: 'radiant', description: '5ft cylinder, CON save' },
    { name: 'Spike Growth', school: 'Transmutation', classes: ['Druid', 'Ranger'], damage: '2d4/5ft', damageType: 'piercing', description: '20ft radius difficult terrain' },
    { name: 'Heat Metal', school: 'Transmutation', classes: ['Bard', 'Druid'], damage: '2d8', damageType: 'fire', description: 'CON save or drop object' },
    { name: 'Pass without Trace', school: 'Abjuration', classes: ['Druid', 'Ranger'], description: '+10 to stealth for group' },
    { name: 'Find Steed', school: 'Conjuration', classes: ['Paladin'], description: 'Summon spirit mount' },
    { name: 'Branding Smite', school: 'Evocation', classes: ['Paladin'], damage: '2d6', damageType: 'radiant', description: 'On hit, visible if invisible' },
    { name: 'Crown of Madness', school: 'Enchantment', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], description: 'WIS save, target attacks ally' }
  ],

  // 3RD LEVEL SPELLS
  3: [
    { name: 'Fireball', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '8d6', damageType: 'fire', description: '20ft radius, DEX save' },
    { name: 'Lightning Bolt', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '8d6', damageType: 'lightning', description: '100ft line, DEX save' },
    { name: 'Counterspell', school: 'Abjuration', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: 'Reaction: negate spell of 3rd or lower' },
    { name: 'Dispel Magic', school: 'Abjuration', classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock'], description: 'End spell of 3rd or lower' },
    { name: 'Fly', school: 'Transmutation', classes: ['Wizard', 'Sorcerer', 'Warlock'], description: '60ft flying speed' },
    { name: 'Haste', school: 'Transmutation', classes: ['Wizard', 'Sorcerer'], description: 'Double speed, +2 AC, extra action' },
    { name: 'Slow', school: 'Transmutation', classes: ['Wizard', 'Sorcerer'], description: 'Half speed, -2 AC, WIS save' },
    { name: 'Hypnotic Pattern', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'WIS save or charmed, incapacitated' },
    { name: 'Major Image', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: '20ft cube illusion with sound' },
    { name: 'Fear', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'WIS save or frightened, must flee' },
    { name: 'Tongues', school: 'Divination', classes: ['Wizard', 'Bard', 'Cleric', 'Sorcerer', 'Warlock'], description: 'Speak and understand any language' },
    { name: 'Sending', school: 'Evocation', classes: ['Wizard', 'Bard', 'Cleric'], description: '25-word message to anyone' },
    { name: 'Spirit Guardians', school: 'Conjuration', classes: ['Cleric'], damage: '3d8', damageType: 'radiant/necrotic', description: '15ft radius, halves speed' },
    { name: 'Revivify', school: 'Necromancy', classes: ['Cleric', 'Paladin'], description: 'Return dead creature to life (1 minute)' },
    { name: 'Mass Healing Word', school: 'Evocation', classes: ['Cleric'], healing: '1d4+mod', description: 'Heal 6 creatures, bonus action' },
    { name: 'Bestow Curse', school: 'Necromancy', classes: ['Bard', 'Cleric', 'Wizard'], description: 'Various curse effects' },
    { name: 'Remove Curse', school: 'Abjuration', classes: ['Cleric', 'Paladin', 'Warlock', 'Wizard'], description: 'End curses on creature' },
    { name: 'Call Lightning', school: 'Conjuration', classes: ['Druid'], damage: '3d10', damageType: 'lightning', description: 'Action each turn, DEX save' },
    { name: 'Conjure Animals', school: 'Conjuration', classes: ['Druid', 'Ranger'], description: 'Summon beast spirits' },
    { name: 'Plant Growth', school: 'Transmutation', classes: ['Bard', 'Druid', 'Ranger'], description: 'Overgrowth or enrich land' },
    { name: 'Hunger of Hadar', school: 'Conjuration', classes: ['Warlock'], damage: '2d6', damageType: 'cold', description: '20ft void sphere' },
    { name: 'Vampiric Touch', school: 'Necromancy', classes: ['Warlock', 'Wizard'], damage: '3d6', damageType: 'necrotic', description: 'Heal half damage dealt' },
    { name: 'Elemental Weapon', school: 'Transmutation', classes: ['Paladin'], damage: '+1d4', description: '+1 attack and damage' },
    { name: 'Aura of Vitality', school: 'Evocation', classes: ['Paladin'], healing: '2d6', description: 'Bonus action healing each turn' }
  ],

  // 4TH LEVEL SPELLS
  4: [
    { name: 'Banishment', school: 'Abjuration', classes: ['Wizard', 'Cleric', 'Paladin', 'Sorcerer', 'Warlock'], description: 'CHA save or banished to another plane' },
    { name: 'Dimension Door', school: 'Conjuration', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'Teleport 500ft' },
    { name: 'Greater Invisibility', school: 'Illusion', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Invisible even when attacking' },
    { name: 'Polymorph', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Druid', 'Sorcerer'], description: 'Transform into beast' },
    { name: 'Wall of Fire', school: 'Evocation', classes: ['Wizard', 'Druid', 'Sorcerer'], damage: '5d8', damageType: 'fire', description: '60ft wall, DEX save' },
    { name: 'Ice Storm', school: 'Evocation', classes: ['Wizard', 'Druid', 'Sorcerer'], damage: '2d8+4d6', damageType: 'bludgeoning/cold', description: '20ft radius, difficult terrain' },
    { name: 'Death Ward', school: 'Abjuration', classes: ['Cleric', 'Paladin'], description: 'Drop to 1 HP instead of 0 once' },
    { name: 'Freedom of Movement', school: 'Abjuration', classes: ['Bard', 'Cleric', 'Druid', 'Ranger'], description: 'Ignore difficult terrain, can\'t be restrained' },
    { name: 'Stoneskin', school: 'Abjuration', classes: ['Wizard', 'Druid', 'Ranger', 'Sorcerer'], description: 'Resistance to nonmagical physical' },
    { name: 'Confusion', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Druid', 'Sorcerer'], description: 'WIS save or random behavior' },
    { name: 'Locate Creature', school: 'Divination', classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'], description: 'Sense direction to creature' },
    { name: 'Guardian of Faith', school: 'Conjuration', classes: ['Cleric'], damage: '20', damageType: 'radiant', description: 'Spectral guardian, DEX save' },
    { name: 'Blight', school: 'Necromancy', classes: ['Wizard', 'Druid', 'Sorcerer', 'Warlock'], damage: '8d8', damageType: 'necrotic', description: 'CON save' },
    { name: 'Staggering Smite', school: 'Evocation', classes: ['Paladin'], damage: '4d6', damageType: 'psychic', description: 'On hit, WIS save or disadvantage' },
    { name: 'Find Greater Steed', school: 'Conjuration', classes: ['Paladin'], description: 'Summon powerful spirit mount' }
  ],

  // 5TH LEVEL SPELLS
  5: [
    { name: 'Cone of Cold', school: 'Evocation', classes: ['Wizard', 'Sorcerer'], damage: '8d8', damageType: 'cold', description: '60ft cone, CON save' },
    { name: 'Hold Monster', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], description: 'WIS save or paralyzed (any creature)' },
    { name: 'Teleportation Circle', school: 'Conjuration', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Portal to known sigil sequence' },
    { name: 'Wall of Force', school: 'Evocation', classes: ['Wizard'], description: 'Invisible, indestructible wall' },
    { name: 'Telekinesis', school: 'Transmutation', classes: ['Wizard', 'Sorcerer'], description: 'Move objects/creatures with mind' },
    { name: 'Dominate Person', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'WIS save or charmed and controlled' },
    { name: 'Animate Objects', school: 'Transmutation', classes: ['Wizard', 'Bard', 'Sorcerer'], description: 'Up to 10 objects attack' },
    { name: 'Cloudkill', school: 'Conjuration', classes: ['Wizard', 'Sorcerer'], damage: '5d8', damageType: 'poison', description: '20ft sphere, CON save' },
    { name: 'Scrying', school: 'Divination', classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Warlock'], description: 'Spy on creature, WIS save' },
    { name: 'Raise Dead', school: 'Necromancy', classes: ['Bard', 'Cleric', 'Paladin'], description: 'Return dead to life (10 days)' },
    { name: 'Greater Restoration', school: 'Abjuration', classes: ['Bard', 'Cleric', 'Druid'], description: 'End charm, petrify, curse, stat reduction' },
    { name: 'Mass Cure Wounds', school: 'Evocation', classes: ['Bard', 'Cleric', 'Druid'], healing: '3d8+mod', description: 'Heal 6 creatures' },
    { name: 'Flame Strike', school: 'Evocation', classes: ['Cleric'], damage: '4d6+4d6', damageType: 'fire/radiant', description: '10ft radius, DEX save' },
    { name: 'Holy Weapon', school: 'Evocation', classes: ['Cleric', 'Paladin'], damage: '+2d8', damageType: 'radiant', description: 'Weapon deals extra radiant' },
    { name: 'Destructive Wave', school: 'Evocation', classes: ['Paladin'], damage: '5d6+5d6', damageType: 'thunder/radiant', description: '30ft radius, CON save, prone' },
    { name: 'Banishing Smite', school: 'Abjuration', classes: ['Paladin'], damage: '5d10', damageType: 'force', description: 'On hit, banish if under 50 HP' },
    { name: 'Synaptic Static', school: 'Enchantment', classes: ['Wizard', 'Bard', 'Sorcerer', 'Warlock'], damage: '8d6', damageType: 'psychic', description: 'INT save, -1d6 to attacks/checks' }
  ]
};

// Helper function to get spells available for a class at a certain level
export const getSpellsForClass = (className, spellLevel = null) => {
  const classSpells = {};
  
  // Add cantrips
  if (spellLevel === null || spellLevel === 0) {
    classSpells.cantrips = SPELL_DATABASE.cantrips.filter(spell => 
      spell.classes.includes(className)
    );
  }
  
  // Add leveled spells
  for (let level = 1; level <= 9; level++) {
    if (spellLevel !== null && spellLevel !== level) continue;
    if (SPELL_DATABASE[level]) {
      const spells = SPELL_DATABASE[level].filter(spell => 
        spell.classes.includes(className)
      );
      if (spells.length > 0) {
        classSpells[level] = spells;
      }
    }
  }
  
  return classSpells;
};

// Get max spell level for a class at a given character level
export const getMaxSpellLevel = (className, characterLevel) => {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const classInfo = SPELLCASTING_CLASSES[canonicalClass];
  if (!classInfo) return 0;
  
  if (classInfo.pactMagic) {
    return PACT_MAGIC_SLOTS[characterLevel]?.level || 0;
  }
  
  if (classInfo.halfCaster) {
    const effectiveLevel = Math.floor(characterLevel / 2);
    for (let i = 9; i >= 1; i--) {
      if (SPELL_SLOTS[effectiveLevel]?.[i]) return i;
    }
    return 0;
  }

  if (classInfo.thirdCaster) {
    const effectiveLevel = Math.floor(characterLevel / 3);
    for (let i = 9; i >= 1; i--) {
      if (SPELL_SLOTS[effectiveLevel]?.[i]) return i;
    }
    return 0;
  }
  
  // Full caster
  for (let i = 9; i >= 1; i--) {
    if (SPELL_SLOTS[characterLevel]?.[i]) return i;
  }
  return 0;
};

/**
 * Multiclass spell slot calculation per SRD 5e:
 *   - Full casters (Bard, Cleric, Druid, Sorcerer, Wizard) contribute their full level
 *   - Half casters (Paladin, Ranger) contribute floor(level/2)
 *   - Third casters (Eldritch Knight, Arcane Trickster) contribute floor(level/3) — not modeled
 *   - Warlock Pact Magic is SEPARATE and uses PACT_MAGIC_SLOTS based on Warlock level only
 *
 * Returns the slot row from SPELL_SLOTS matching the multiclass caster level (1–20),
 * plus separate pact magic slots when Warlock levels exist.
 *
 * @param {Object} classLevels  e.g. { Wizard: 5, Cleric: 3 }
 * @returns {{ multiclassLevel, slots, pactMagic }}
 */
export const getMulticlassSpellSlots = (classLevels = {}, character = null) => {
  let multiclassLevel = 0;
  let warlockLevel = 0;

  Object.entries(classLevels).forEach(([cls, lvl]) => {
    const canonicalClass = getCanonicalSpellcastingClass(cls);
    const info = SPELLCASTING_CLASSES[canonicalClass];
    if (!info) return;
    const n = Number(lvl) || 0;
    if (info.pactMagic) {
      warlockLevel += n;
    } else if (info.subclassOnly) {
      if (character && classHasSpellcasting(character, canonicalClass)) {
        multiclassLevel += Math.floor(n / 3);
      }
    } else if (info.halfCaster) {
      multiclassLevel += Math.floor(n / 2);
    } else {
      multiclassLevel += n;
    }
  });

  return {
    multiclassLevel,
    slots: SPELL_SLOTS[multiclassLevel] || {},
    pactMagic: warlockLevel > 0 ? (PACT_MAGIC_SLOTS[warlockLevel] || null) : null
  };
};

export default SPELL_DATABASE;

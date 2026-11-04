// Static D&D 5e Level-Up Data
// Extracted from LevelUpWizard.js for maintainability

export const HIT_DICE = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6
};

export const ASI_LEVELS = {
  default: [4, 8, 12, 16, 19],
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19]
};

export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const ABILITY_SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

// =====================================================================
// FEATS — tagged by edition. Most original SRD feats are valid in both.
// 2024 PHB introduced 4 categories: Origin / General / Fighting Style / Epic Boon.
// =====================================================================

// 2014 SRD-style General Feats — also valid in 2024 General category
export const FEATS = [
  // Origin feats (SRD 5.2). These are 2024 feats: the 2014 SRD (5.1) licenses
  // only Grappler, so the 2014 list here is deliberately short. Everything the
  // PHB adds on top is the table's own homebrew -- see
  // docs/licensing/SRD_FEATS.md.
  { name: 'Alert', description: 'Add your proficiency bonus to initiative, and swap initiative with a willing ally', prereq: null, editions: ['2024'], category: 'origin', source: 'srd-5.2',
    aliases: ['Alert (Origin)'] },
  { name: 'Magic Initiate', description: 'Two cantrips and one level 1 spell from the Cleric, Druid, or Wizard list; repeatable with a different list', prereq: null, editions: ['2024'], category: 'origin', source: 'srd-5.2' },
  { name: 'Savage Attacker', description: 'Once per turn, roll a weapon\'s damage dice twice and use either roll', prereq: null, editions: ['2024'], category: 'origin', source: 'srd-5.2',
    aliases: ['Savage Attacker (Origin)'] },
  { name: 'Skilled', description: 'Proficiency in any combination of three skills or tools; repeatable', prereq: null, editions: ['2024'], category: 'origin', source: 'srd-5.2' },

  // General feats (SRD 5.2). Grappler is also in SRD 5.1, so it is the one
  // feat the 2014 rules can offer, with its 2014 wording kept separately.
  { name: 'Ability Score Improvement', description: 'Increase one ability score by 2, or two scores by 1 each (maximum 20); repeatable', prereq: 'Level 4+', editions: ['2014', '2024'], category: 'general', source: 'srd-5.2' },
  { name: 'Grappler', description: '+1 Strength or Dexterity; grapple as part of an Unarmed Strike, attack grappled targets with advantage, and drag them without extra movement', prereq: 'Level 4+, Strength or Dexterity 13+', editions: ['2014', '2024'], category: 'general', source: 'srd-5.2',
    descriptionByEdition: { '2014': 'Advantage on attacks against creatures you are grappling, and you can pin a grappled creature' } },

  // Epic boon feats (SRD 5.2), level 19+.
  { name: 'Boon of Combat Prowess', description: 'When you miss with a melee attack, you can turn it into a hit instead (once per turn)', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Combat Prowess (Epic)'] },
  { name: 'Boon of Dimensional Travel', description: 'As a bonus action, teleport up to 30 feet to a space you can see', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Dimensional Travel (Epic)'] },
  { name: 'Boon of Fate', description: 'Add 2d4 to another creature\'s or your own d20 test, once per short or long rest', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Fate (Epic)'] },
  { name: 'Boon of Irresistible Offense', description: 'A d20 roll of 20 on an attack adds your ability modifier to the damage, and your attacks ignore damage resistance', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Irresistible Offense (Epic)'] },
  { name: 'Boon of Spell Recall', description: 'Casting a level 1-4 spell can leave the slot unspent', prereq: 'Level 19+, Spellcasting feature', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Spell Recall (Epic)'] },
  { name: 'Boon of the Night Spirit', description: 'In Dim Light or Darkness you can become Invisible and move through creatures\' spaces', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of the Night Spirit (Epic)'] },
  { name: 'Boon of Truesight', description: 'You gain Truesight out to 60 feet', prereq: 'Level 19+', editions: ['2024'], category: 'epic', source: 'srd-5.2',
    aliases: ['Boon of Truesight (Epic)'] },
];


/**
 * A feat's category in a given edition.
 *
 * Several feats changed category between editions: Alert, Healer, Lucky,
 * Magic Initiate, Savage Attacker, Skilled, Tavern Brawler and Tough are
 * 2014 General feats but 2024 Origin feats. 2014 has no Origin category at
 * all, so a single `category` value cannot describe both editions -- tagging
 * them 'origin' hid them from 2014 characters, and tagging them 'general'
 * offered them to 2024 characters at ASI levels, where only General feats
 * are legal.
 *
 * @param {object} feat
 * @param {string} edition - "2014" or "2024"
 * @returns {string} "origin", "general" or "epic"
 */
export const featCategoryForEdition = (feat = {}, edition = '2014') =>
  (feat.categoryByEdition && feat.categoryByEdition[edition]) || feat.category;

/**
 * A feat's description in a given edition, where the two differ.
 * @param {object} feat
 * @param {string} edition - "2014" or "2024"
 */
export const featDescriptionForEdition = (feat = {}, edition = '2014') =>
  (feat.descriptionByEdition && feat.descriptionByEdition[edition]) || feat.description;

/**
 * Every name a feat has been saved under, so characters created before the
 * duplicate "(Origin)" entries were merged still resolve.
 * @param {object} feat
 */
export const featNameAliases = (feat = {}) =>
  [feat.name, ...(Array.isArray(feat.aliases) ? feat.aliases : [])].filter(Boolean);

/**
 * Get feats filtered by edition (and optionally by category).
 * @param {string} edition - "2014" or "2024"
 * @param {string} [category] - "origin", "general", "epic", or undefined for all
 */
export const getFeatsByEdition = (edition = '2014', category = null) => {
  return FEATS.filter(f => {
    if (!f.editions || !f.editions.includes(edition)) return false;
    if (category && featCategoryForEdition(f, edition) !== category) return false;
    return true;
  });
};

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
  { name: 'Alert', description: '+5 initiative, can\'t be surprised, no advantage for hidden attackers', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' },
    descriptionByEdition: { '2024': 'Add proficiency to initiative, swap initiative with a willing ally' },
    aliases: ['Alert (Origin)'] },
  { name: 'Athlete', description: '+1 STR/DEX, standing from prone costs 5ft, running jump +5ft', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Actor', description: '+1 CHA, advantage on deception/performance to impersonate', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Charger', description: 'Dash action lets you attack with +5 damage or shove', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Crossbow Expert', description: 'Ignore loading, no disadvantage in melee, bonus attack', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Defensive Duelist', description: 'Reaction to add proficiency to AC vs melee', prereq: 'DEX 13+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Dual Wielder', description: '+1 AC with two weapons, dual wield non-light weapons', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Dungeon Delver', description: 'Advantage on trap detection, resistance to trap damage', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Durable', description: '+1 CON, minimum hit dice healing = 2x CON mod', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Elemental Adept', description: 'Ignore resistance, treat 1s as 2s for chosen element', prereq: 'Spellcasting', editions: ['2014', '2024'], category: 'general' },
  { name: 'Grappler', description: 'Advantage on attacks vs grappled, can pin creatures', prereq: 'STR 13+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Great Weapon Master', description: 'Bonus attack on crit/kill, -5 to hit for +10 damage', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Healer', description: 'Stabilize + 1HP, healer\'s kit restores 1d6+4+HD HP', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' },
    descriptionByEdition: { '2024': 'Stabilize + heal 2d6+PB, restore 1 HP with bonus action via healer\'s kit' },
    aliases: ['Healer (Origin)'] },
  { name: 'Heavily Armored', description: '+1 STR, gain heavy armor proficiency', prereq: 'Medium armor proficiency', editions: ['2014'], category: 'general' },
  { name: 'Heavy Armor Master', description: '+1 STR, reduce nonmagical bludg/pierce/slash by 3', prereq: 'Heavy armor proficiency', editions: ['2014', '2024'], category: 'general' },
  { name: 'Inspiring Leader', description: '10min speech grants level+CHA temp HP to 6 creatures', prereq: 'CHA 13+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Keen Mind', description: '+1 INT, always know north and hours until sunrise/set', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Lightly Armored', description: '+1 STR/DEX, gain light armor proficiency', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Linguist', description: '+1 INT, learn 3 languages, create ciphers', prereq: null, editions: ['2014'], category: 'general' },
  { name: 'Lucky', description: '3 luck points per day to reroll any d20', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' },
    descriptionByEdition: { '2024': 'PB-many luck points/day, reroll any d20 (including others\') ' },
    aliases: ['Lucky (Origin)'] },
  { name: 'Mage Slayer', description: 'Reaction attack on casters, advantage on saves, conc. disadvantage', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Magic Initiate', description: '2 cantrips + 1 1st-level spell from any class', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' } },
  { name: 'Martial Adept', description: 'Learn 2 maneuvers, gain 1 superiority die (d6)', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Medium Armor Master', description: 'No stealth disadvantage, +3 DEX to AC in medium armor', prereq: 'Medium armor proficiency', editions: ['2014'], category: 'general' },
  { name: 'Mobile', description: '+10 speed, no opportunity attacks from attacked targets', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Moderately Armored', description: '+1 STR/DEX, gain medium armor and shield proficiency', prereq: 'Light armor proficiency', editions: ['2014'], category: 'general' },
  { name: 'Mounted Combatant', description: 'Advantage vs smaller unmounted, redirect attacks to you', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Observant', description: '+1 INT/WIS, +5 passive perception and investigation', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Polearm Master', description: 'Bonus d4 attack, opportunity attack when entering reach', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Resilient', description: '+1 to ability, gain saving throw proficiency in it', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Ritual Caster', description: 'Learn 2 ritual spells, can cast them as rituals', prereq: 'INT or WIS 13+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Savage Attacker', description: 'Reroll melee weapon damage once per turn', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' },
    descriptionByEdition: { '2024': 'Reroll a melee damage roll once per turn' },
    aliases: ['Savage Attacker (Origin)'] },
  { name: 'Sentinel', description: 'Opportunity attack stops movement, attack on ally attacks', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Sharpshooter', description: 'No disadvantage at long range, -5 to hit for +10 damage', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Shield Master', description: 'Bonus shove, add shield AC to DEX saves, evasion with shield', prereq: null, editions: ['2014', '2024'], category: 'general' },
  { name: 'Skilled', description: 'Gain 3 skill or tool proficiencies', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' } },
  { name: 'Skulker', description: 'Hide when lightly obscured, miss doesn\'t reveal position', prereq: 'DEX 13+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Spell Sniper', description: 'Double spell range, ignore cover, learn 1 cantrip', prereq: 'Spellcasting', editions: ['2014', '2024'], category: 'general' },
  { name: 'Tavern Brawler', description: '+1 STR/CON, proficient with improvised, grapple on hit', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' } },
  { name: 'Tough', description: '+2 HP per level', prereq: null, editions: ['2014', '2024'], category: 'general',
    categoryByEdition: { '2024': 'origin' } },
  { name: 'War Caster', description: 'Advantage on concentration, cast with hands full, spell as OA', prereq: 'Spellcasting', editions: ['2014', '2024'], category: 'general' },
  { name: 'Weapon Master', description: '+1 STR/DEX, proficiency with 4 weapons', prereq: null, editions: ['2014'], category: 'general' },

  // ============== 2024-EXCLUSIVE ORIGIN FEATS (PHB 2024) ==============
  { name: 'Crafter', description: 'Proficiency with three artisan\'s tools, faster crafting, 20% gear discount', prereq: null, editions: ['2024'], category: 'origin' },
  { name: 'Musician', description: 'Inspiration to PB allies after 10-minute performance', prereq: null, editions: ['2024'], category: 'origin' },

  // ============== 2024 GENERAL FEATS (level 4+ replacement for ASI) ==============
  { name: 'Ability Score Improvement', description: 'Increase one ability score by 2, or two by 1 each (max 20)', prereq: 'Level 4+', editions: ['2014', '2024'], category: 'general' },
  { name: 'Boon of Combat Prowess (Epic)', description: 'When you miss with a melee attack you can hit instead (1/round)', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Dimensional Travel (Epic)', description: 'Bonus action: misty step 30ft, no concentration', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Fate (Epic)', description: 'PB-many bonus dice per long rest to add to any d20 roll', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Fortitude (Epic)', description: '+40 HP, regain 1d10+CON when reduced to 0 HP (1/long rest)', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Irresistible Offense (Epic)', description: 'Crits on rolls of 19 or 20 with weapons, ignore weapon resistance', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Spell Recall (Epic)', description: 'Cast a 5th-level-or-lower spell without a slot 1/day', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of the Night Spirit (Epic)', description: 'Hide in dim light/dark even while observed; resistance vs psychic', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
  { name: 'Boon of Truesight (Epic)', description: 'Truesight 60ft permanently', prereq: 'Level 19', editions: ['2024'], category: 'epic' },
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

/**
 * Which built-in options Rookie Quest Keeper may offer.
 *
 * Built-in rules content must come from the open System Reference Documents
 * (SRD 5.1 and SRD 5.2.1, CC BY 4.0). The app's data still names many
 * subclasses from paid books (the Player's Handbook, Xanathar's, Tasha's
 * and others) because earlier versions offered them. Those names are listed
 * here so pickers can stop offering them, while:
 *   - a character that already has one keeps it (the current value is
 *     always kept in its picker, and saved data is never rewritten), and
 *   - homebrew and campaign content, which is the table's own, is untouched:
 *     only these specific built-in names are hidden, so a GM's homebrew
 *     subclass still appears.
 *
 * Every name here was checked against the official SRD PDFs; see
 * docs/licensing/CONTENT_INVENTORY.md.
 */

/**
 * Shown in place of built-in feature text for a paid-book subclass a saved
 * character already has. The name stays (so the character still loads); the
 * features are the player's to add as notes or homebrew.
 */
export const NON_SRD_SUBCLASS_NOTE = "Not part of the open rules. Add this subclass's features from your own book as notes or homebrew.";

const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Subclasses named in the built-in data that are in neither SRD. */
export const NON_SRD_BUILTIN_SUBCLASSES = Object.freeze([
  // Barbarian
  'Path of the Totem Warrior', 'Path of the Ancestral Guardian', 'Path of the Storm Herald', 'Path of the Zealot',
  'Path of the Beast', 'Path of Wild Magic', 'Path of the Wild Heart', 'Path of the World Tree',
  // Bard
  'College of Valor', 'College of Glamour', 'College of Swords', 'College of Whispers', 'College of Creation',
  'College of Eloquence', 'College of Dance',
  // Cleric
  'Knowledge Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain',
  'Death Domain', 'Forge Domain', 'Grave Domain', 'Order Domain', 'Peace Domain', 'Twilight Domain',
  // Druid
  'Circle of the Moon', 'Circle of Dreams', 'Circle of the Shepherd', 'Circle of Spores', 'Circle of Stars',
  'Circle of the Stars', 'Circle of Wildfire', 'Circle of the Sea',
  // Fighter
  'Battle Master', 'Eldritch Knight', 'Arcane Archer', 'Cavalier', 'Samurai', 'Echo Knight', 'Psi Warrior', 'Rune Knight',
  // Monk
  'Way of Shadow', 'Way of the Four Elements', 'Way of the Drunken Master', 'Way of the Kensei', 'Way of the Sun Soul',
  'Way of Mercy', 'Way of the Astral Self', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of Mercy',
  // Paladin
  'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Conquest', 'Oath of Redemption', 'Oath of Glory',
  'Oath of the Watchers', 'Oathbreaker',
  // Ranger
  'Beast Master', 'Gloom Stalker', 'Horizon Walker', 'Monster Slayer', 'Fey Wanderer', 'Swarmkeeper', 'Drakewarden',
  // Rogue
  'Assassin', 'Arcane Trickster', 'Inquisitive', 'Mastermind', 'Scout', 'Swashbuckler', 'Phantom', 'Soulknife',
  // Sorcerer
  'Wild Magic', 'Divine Soul', 'Shadow Magic', 'Storm Sorcery', 'Aberrant Mind', 'Clockwork Soul',
  'Aberrant Sorcery', 'Clockwork Sorcery', 'Wild Magic Sorcery',
  // Warlock
  'The Archfey', 'The Great Old One', 'The Celestial', 'The Hexblade', 'The Fathomless', 'The Genie', 'The Undead',
  'Archfey Patron', 'Great Old One Patron', 'Celestial Patron', 'Hexblade Patron', 'Fathomless Patron',
  'Genie Patron', 'Undead Patron',
  // Wizard
  'School of Abjuration', 'School of Conjuration', 'School of Divination', 'School of Enchantment',
  'School of Illusion', 'School of Necromancy', 'School of Transmutation', 'Bladesinging', 'War Magic',
  'Chronurgy Magic', 'Graviturgy Magic', 'Order of Scribes', 'Abjurer', 'Diviner', 'Illusionist',
]);

const NON_SRD_SUBCLASS_KEYS = new Set(NON_SRD_BUILTIN_SUBCLASSES.map(normalise));

/** Is this a built-in subclass from a paid book (not in either SRD)? */
export function isNonSrdBuiltInSubclass(name) {
  return NON_SRD_SUBCLASS_KEYS.has(normalise(name));
}

const optionName = (option) => (option && typeof option === 'object'
  ? (option.label || option.name || option.value || '')
  : option);

/**
 * The subclass options a picker may offer: everything except the paid-book
 * built-ins, plus whatever the character already has (so editing a saved
 * character never loses its subclass). Works on plain names or option objects.
 */
export function offerableSubclasses(options = [], current = '') {
  const currentKey = normalise(optionName(current));
  return (Array.isArray(options) ? options : []).filter((option) => {
    const key = normalise(optionName(option));
    return !NON_SRD_SUBCLASS_KEYS.has(key) || (currentKey && key === currentKey);
  });
}

/*
 * Species and backgrounds, per edition. The built-in lists hold the Player's
 * Handbook options; only those licensed by the SRD for the character's edition
 * are offered. Original starter origins (data/starterOrigins5e.js), homebrew
 * and the character's current choice are never hidden.
 */
const BUILTIN_SPECIES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Aasimar', 'Goliath', 'Orc'];
const SRD_SPECIES = {
  2014: ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Tiefling'],
  2024: ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'],
};
const BUILTIN_BACKGROUNDS = [
  'Acolyte', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage',
  'Sailor', 'Soldier', 'Urchin',
  // The development-only "test" backgrounds (data/testBackgrounds5e.js).
  'Anthropologist', 'Archaeologist', 'Athlete', 'Courtier', 'Faction Agent', 'Far Traveler', 'Gambler', 'Gladiator',
  'Investigator', 'Mercenary', 'City Watch', 'Urban Bounty Hunter', 'Smuggler', 'Pirate', 'Haunted One',
  'Clan Crafter', 'Inheritor', 'Knight of the Order', 'Spy',
];
const SRD_BACKGROUNDS = { 2014: ['Acolyte'], 2024: ['Acolyte', 'Criminal', 'Sage', 'Soldier'] };

const editionKey = (edition) => (String(edition || '').includes('2024') ? 2024 : 2014);
const keySet = (list) => new Set(list.map(normalise));
const BUILTIN_SPECIES_KEYS = keySet(BUILTIN_SPECIES);
const BUILTIN_BACKGROUND_KEYS = keySet(BUILTIN_BACKGROUNDS);
const SRD_SPECIES_KEYS = { 2014: keySet(SRD_SPECIES[2014]), 2024: keySet(SRD_SPECIES[2024]) };
const SRD_BACKGROUND_KEYS = { 2014: keySet(SRD_BACKGROUNDS[2014]), 2024: keySet(SRD_BACKGROUNDS[2024]) };

function offerable(names, builtInKeys, srdKeys, current) {
  const currentKey = normalise(optionName(current));
  return (Array.isArray(names) ? names : []).filter((name) => {
    const key = normalise(optionName(name));
    if (currentKey && key === currentKey) return true;
    return !builtInKeys.has(key) || srdKeys.has(key);
  });
}

/** Species a picker may offer for this edition (see the note above). */
export function offerableSpecies(names = [], edition = '2014', current = '') {
  return offerable(names, BUILTIN_SPECIES_KEYS, SRD_SPECIES_KEYS[editionKey(edition)], current);
}

/** Backgrounds a picker may offer for this edition (see the note above). */
export function offerableBackgrounds(names = [], edition = '2014', current = '') {
  return offerable(names, BUILTIN_BACKGROUND_KEYS, SRD_BACKGROUND_KEYS[editionKey(edition)], current);
}

/*
 * Fighting styles. SRD 5.1 licenses Archery, Defense, Dueling, Great Weapon
 * Fighting, Protection and Two-Weapon Fighting; SRD 5.2.1 licenses Archery,
 * Defense, Great Weapon Fighting and Two-Weapon Fighting. The built-in lists
 * also name four styles from paid books, which are not offered.
 */
export const NON_SRD_FIGHTING_STYLES = Object.freeze([
  'Blind Fighting', 'Interception', 'Thrown Weapon Fighting', 'Unarmed Fighting',
]);
const NON_SRD_FIGHTING_STYLE_KEYS = keySet(NON_SRD_FIGHTING_STYLES);

const currentKeySet = (current) => new Set((Array.isArray(current) ? current : [current])
  .map((value) => normalise(optionName(value))).filter(Boolean));

/** Fighting styles a picker may offer, keeping the character's current one(s). */
export function offerableFightingStyles(options = [], current = []) {
  const currentKeys = currentKeySet(current);
  return (Array.isArray(options) ? options : []).filter((option) => {
    const key = normalise(optionName(option));
    return !NON_SRD_FIGHTING_STYLE_KEYS.has(key) || currentKeys.has(key);
  });
}

/*
 * Spells in the built-in spell list that are in neither SRD (checked against
 * the official SRD 5.1 and 5.2.1 PDFs). "Tasha's Hideous Laughter" is the
 * paid-book name of the SRD spell Hideous Laughter, which is offered instead. They stay in the reference data so a
 * character who already has one still sees its details; pickers stop offering
 * them.
 */
export const NON_SRD_BUILTIN_SPELLS = Object.freeze([
  'Blade Ward', 'Friends', 'Thorn Whip', 'Toll the Dead', 'Word of Radiance',
  'Absorb Elements', 'Armor of Agathys', 'Arms of Hadar', 'Compelled Duel', 'Hail of Thorns',
  "Tasha's Hideous Laughter", 'Thunderous Smite', 'Witch Bolt', 'Wrathful Smite',
  'Crown of Madness',
  'Aura of Vitality', 'Elemental Weapon', 'Hunger of Hadar',
  'Staggering Smite',
  'Banishing Smite', 'Destructive Wave', 'Synaptic Static',
  'Find Greater Steed', 'Holy Weapon',
]);
const NON_SRD_SPELL_KEYS = keySet(NON_SRD_BUILTIN_SPELLS);

export function isNonSrdBuiltInSpell(name) {
  return NON_SRD_SPELL_KEYS.has(normalise(optionName(name)));
}

/**
 * Spells a picker may offer: everything except the paid-book built-ins, plus
 * any the character already has (`current` is a list of names or spells).
 */
export function offerableSpells(spells = [], current = []) {
  const currentKeys = currentKeySet(current);
  return (Array.isArray(spells) ? spells : []).filter((spell) => {
    const key = normalise(optionName(spell));
    return !NON_SRD_SPELL_KEYS.has(key) || currentKeys.has(key);
  });
}

/** A getSpellsForClass() result with the paid-book spells taken out of every level. */
export function offerableSpellLists(lists = {}, current = []) {
  return Object.fromEntries(Object.entries(lists || {}).map(([level, spells]) => [level, offerableSpells(spells, current)]));
}

/** Every spell a saved character already has, from the fields the sheet reads. */
export function characterSpellNames(character = {}) {
  const fields = ['cantrips_known', 'cantrips', 'spells_known', 'known_spells', 'spellbook', 'spells_prepared', 'prepared_spells', 'preparedSpells'];
  return fields.flatMap((field) => (Array.isArray(character?.[field]) ? character[field] : []))
    .map((spell) => optionName(spell)).filter(Boolean);
}

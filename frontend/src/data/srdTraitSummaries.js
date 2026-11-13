/*
 * Short, plain-English summaries of the race and species traits in the
 * System Reference Document (SRD 5.1 and SRD 5.2, © Wizards of the Coast,
 * CC BY 4.0), for the character sheet's Traits page. The built-in race data
 * stores only trait names; a trait saved on a character with its own
 * description always wins over these. Where the 2014 and 2024 rules differ,
 * `2024` holds the newer wording.
 */
export const SRD_TRAIT_SUMMARIES = {
  darkvision: 'You see in dim light within range as if it were bright light, and in darkness as if it were dim light (in shades of grey).',
  'superior darkvision': 'Darkvision out to 120 feet: dim light is bright and darkness is dim for you, in shades of grey.',
  'fey ancestry': 'You have advantage on saving throws against being charmed.',
  trance: { 2014: 'You don\'t sleep. Four hours of meditation gives you the same benefit a human gets from eight hours of sleep.', 2024: 'You don\'t need to sleep, and magic can\'t put you to sleep. You can finish a long rest in 4 hours in a trance-like meditation.' },
  'keen senses': { 2014: 'You are proficient in Perception.', 2024: 'You are proficient in your choice of Insight, Perception or Survival.' },
  'elf weapon training': 'You are proficient with the longsword, shortsword, shortbow and longbow.',
  'mask of the wild': 'You can try to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist or similar natural cover.',
  'fleet of foot': 'Your base walking speed is 35 feet.',
  cantrip: 'You know one cantrip of your choice from the Wizard spell list, using Intelligence to cast it.',
  'sunlight sensitivity': 'You have disadvantage on attack rolls and on sight-based Perception checks when you, your target or what you are looking at is in direct sunlight.',
  'drow magic': 'You know the Dancing Lights cantrip. From 3rd level you can cast Faerie Fire, and from 5th level Darkness, each once per long rest, using Charisma.',
  'dwarven resilience': 'You have advantage on saving throws against poison and resistance to poison damage.',
  'dwarven toughness': 'Your hit point maximum increases by 1, and by 1 more every time you gain a level.',
  'dwarven combat training': 'You are proficient with the battleaxe, handaxe, light hammer and warhammer.',
  'dwarven armor training': 'You are proficient with light and medium armour.',
  'tool proficiency': 'You are proficient with one set of artisan\'s tools of your choice: smith\'s, brewer\'s or mason\'s tools.',
  stonecunning: { 2014: 'When you make a History check about the origin of stonework, you add double your proficiency bonus.', 2024: 'As a bonus action, gain tremorsense out to 60 feet for 10 minutes while on or touching stone. You can do this a number of times equal to your proficiency bonus per long rest.' },
  lucky: 'When you roll a 1 on the d20 for an attack roll, ability check or saving throw, you can reroll the die and must use the new roll.',
  luck: 'When you roll a 1 on the d20 of a D20 Test, you can reroll the die and must use the new roll.',
  brave: 'You have advantage on saving throws against being frightened.',
  'halfling nimbleness': 'You can move through the space of any creature that is a size larger than you.',
  'naturally stealthy': 'You can try to hide even when you are obscured only by a creature that is at least one size larger than you.',
  'draconic ancestry': 'Your dragon ancestor sets the damage type of your Breath Weapon and of your Damage Resistance.',
  'breath weapon': 'You exhale energy of your ancestry\'s damage type in a cone or a line. Each creature in the area makes a saving throw (DC 8 + Constitution modifier + proficiency bonus), taking full damage on a failure and half on a success. The damage grows as you gain levels, and uses come back when you rest.',
  'damage resistance': 'You have resistance to the damage type of your draconic ancestry.',
  'draconic flight': 'From 5th level, as a bonus action you sprout spectral wings and gain a flying speed equal to your speed for 10 minutes, once per long rest.',
  'gnome cunning': 'You have advantage on Intelligence, Wisdom and Charisma saving throws against magic.',
  "artificer's lore": 'When you make a History check about magic items, alchemical objects or technological devices, you add double your proficiency bonus.',
  tinker: 'With tinker\'s tools you can spend an hour building a Tiny clockwork device: a toy, a fire starter or a music box.',
  'skill versatility': 'You gain proficiency in two skills of your choice.',
  menacing: 'You are proficient in Intimidation.',
  'relentless endurance': 'When you drop to 0 hit points but are not killed outright, you can drop to 1 hit point instead, once per long rest.',
  'savage attacks': 'When you score a critical hit with a melee weapon attack, roll one of the weapon\'s damage dice one more time and add it to the extra damage.',
  'hellish resistance': 'You have resistance to fire damage.',
  'infernal legacy': 'You know the Thaumaturgy cantrip. From 3rd level you can cast Hellish Rebuke, and from 5th level Darkness, each once per long rest, using Charisma.',
  'extra language': 'You can speak, read and write one extra language of your choice.',
  'extra skill': 'You gain proficiency in one skill of your choice.',
  resourceful: 'You gain Heroic Inspiration whenever you finish a long rest.',
  skillful: 'You gain proficiency in one skill of your choice.',
  versatile: 'You gain an Origin feat of your choice.',
};

/** The name a trait is filed under: lower case, without notes in brackets or ranges. */
export function traitKey(name = '') {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\d+\s*(ft|feet)\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The SRD summary for a trait name, in the character's rules edition, or ''. */
export function srdTraitSummary(name, edition = '2014') {
  const entry = SRD_TRAIT_SUMMARIES[traitKey(name)];
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return String(edition).includes('2024') ? entry[2024] : entry[2014];
}

import { buildCharacterCreationPayloadFromTemplate } from './characterCreationPayload';

export const KIDS_HERO_TYPES = [
  {
    id: 'brave-fighter',
    label: 'Brave Fighter',
    className: 'Fighter',
    tagline: 'Stands in front, protects friends, and wins with a trusty weapon.',
    ability_scores: { strength: 15, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 11, charisma: 10 },
    skills: ['Athletics', 'Intimidation'],
    equipment_pick: 'chain_mail',
    fighting_style: 'Defense',
  },
  {
    id: 'sneaky-scout',
    label: 'Sneaky Scout',
    className: 'Rogue',
    tagline: 'Moves quietly, spots trouble, and helps the group find a safer way.',
    ability_scores: { strength: 8, dexterity: 15, constitution: 13, intelligence: 12, wisdom: 13, charisma: 10 },
    skills: ['Stealth', 'Perception', 'Sleight of Hand'],
    equipment_pick: 'studded_leather',
    expertise: ['Stealth'],
  },
  {
    id: 'magic-user',
    label: 'Magic User',
    className: 'Wizard',
    tagline: 'Solves problems with clever spells and a big book of ideas.',
    ability_scores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 },
    skills: ['Arcana', 'Investigation'],
    cantrips_known: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
    spells_known: ['Magic Missile', 'Shield', 'Mage Armor', 'Detect Magic', 'Sleep', 'Burning Hands'],
  },
  {
    id: 'helpful-healer',
    label: 'Helpful Healer',
    className: 'Cleric',
    tagline: 'Keeps friends safe with healing, courage, and bright magic.',
    ability_scores: { strength: 12, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 15, charisma: 13 },
    skills: ['Medicine', 'Religion'],
    cantrips_known: ['Sacred Flame', 'Guidance', 'Thaumaturgy'],
    spells_prepared: ['Cure Wounds', 'Healing Word', 'Bless'],
  },
  {
    id: 'nature-friend',
    label: 'Nature Friend',
    className: 'Druid',
    tagline: 'Talks to nature, helps animals, and calls on wild magic.',
    ability_scores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 15, charisma: 10 },
    skills: ['Nature', 'Animal Handling'],
    cantrips_known: ['Druidcraft', 'Produce Flame'],
    spells_prepared: ['Cure Wounds', 'Entangle', 'Faerie Fire'],
  },
  {
    id: 'holy-protector',
    label: 'Holy Protector',
    className: 'Paladin',
    tagline: 'A shining guardian who protects people and stands for hope.',
    ability_scores: { strength: 15, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 12, charisma: 15 },
    skills: ['Persuasion', 'Religion'],
    equipment_pick: 'chain_mail',
    fighting_style: 'Protection',
  },
  {
    id: 'wild-warrior',
    label: 'Wild Warrior',
    className: 'Barbarian',
    tagline: 'Charges into danger with courage, strength, and a mighty roar.',
    ability_scores: { strength: 15, dexterity: 13, constitution: 15, intelligence: 8, wisdom: 12, charisma: 10 },
    skills: ['Athletics', 'Survival'],
  },
];

export const KIDS_SPECIES = [
  { id: 'human', label: 'Human', race: 'Human', note: 'Brave, flexible, and ready for anything.' },
  { id: 'elf', label: 'Elf', race: 'Elf', subrace: 'High Elf', note: 'Graceful, sharp-eyed, and touched by magic.' },
  { id: 'dwarf', label: 'Dwarf', race: 'Dwarf', subrace: 'Hill Dwarf', note: 'Sturdy, loyal, and hard to knock down.' },
  { id: 'halfling', label: 'Halfling', race: 'Halfling', subrace: 'Lightfoot', note: 'Small, lucky, and surprisingly brave.' },
  { id: 'tiefling', label: 'Tiefling', race: 'Tiefling', note: 'Dramatic, magical, and hard to forget.' },
];

export const KIDS_BACKGROUNDS = [
  { id: 'soldier', label: 'Soldier', background: 'Soldier', note: 'You learned courage and teamwork.' },
  { id: 'sage', label: 'Sage', background: 'Sage', note: 'You love books, clues, and clever answers.' },
  { id: 'outlander', label: 'Outlander', background: 'Outlander', note: 'You know trails, weather, and wild places.' },
  { id: 'urchin', label: 'Urchin', background: 'Urchin', note: 'You grew up quick, quiet, and clever.' },
  { id: 'acolyte', label: 'Acolyte', background: 'Acolyte', note: 'You learned kindness, faith, and old stories.' },
  { id: 'entertainer', label: 'Entertainer', background: 'Entertainer', note: 'You know how to make people smile.' },
];

export const KIDS_FAVORITES = [
  { id: 'strong', label: 'Being strong', skill: 'Athletics' },
  { id: 'quick', label: 'Being quick', skill: 'Acrobatics' },
  { id: 'clever', label: 'Solving clues', skill: 'Investigation' },
  { id: 'kind', label: 'Helping friends', skill: 'Medicine' },
  { id: 'wild', label: 'Knowing nature', skill: 'Nature' },
  { id: 'brave', label: 'Talking bravely', skill: 'Persuasion' },
];

export const KIDS_GEAR = [
  { id: 'sturdy', label: 'Sturdy gear', equipment_pick: 'chain_mail', note: 'Strong armour and a shield when your class can use it.' },
  { id: 'light', label: 'Light gear', equipment_pick: 'studded_leather', note: 'Easy-to-carry gear for sneaking and moving.' },
  { id: 'adventurer', label: 'Adventurer pack', equipment_pick: '', note: 'Useful everyday gear from your class and story.' },
];

const findById = (items, id, fallbackIndex = 0) => items.find(item => item.id === id) || items[fallbackIndex];

export function buildKidsCharacterTemplate({ heroTypeId, speciesId, backgroundId, favoriteId, gearId }) {
  const hero = findById(KIDS_HERO_TYPES, heroTypeId);
  const species = findById(KIDS_SPECIES, speciesId);
  const background = findById(KIDS_BACKGROUNDS, backgroundId);
  const favorite = findById(KIDS_FAVORITES, favoriteId);
  const gear = findById(KIDS_GEAR, gearId, 2);
  const skill_proficiencies = Array.from(new Set([...(hero.skills || []), favorite.skill].filter(Boolean)));
  const gearPick = gear.id === 'sturdy' && ['Fighter', 'Paladin'].includes(hero.className)
    ? 'chain_mail'
    : gear.id === 'light' && ['Rogue', 'Ranger'].includes(hero.className)
      ? 'studded_leather'
      : (hero.equipment_pick || '');

  return {
    character_class: hero.className,
    race: species.race,
    subrace: species.subrace || '',
    background: background.background,
    alignment: 'Neutral Good',
    level: 1,
    ability_scores: hero.ability_scores,
    skill_proficiencies,
    fighting_style: hero.fighting_style || '',
    equipment_pick: gearPick,
    expertise: hero.expertise || [],
    cantrips_known: hero.cantrips_known || [],
    spells_known: hero.spells_known || [],
    spells_prepared: hero.spells_prepared || [],
    kids_summary: {
      hero: hero.label,
      species: species.label,
      background: background.label,
      favorite: favorite.label,
      gear: gear.label,
      tagline: hero.tagline,
    },
  };
}

export function buildKidsCharacterPayload({ name, heroTypeId, speciesId, backgroundId, favoriteId, gearId, edition = '2014' }) {
  const template = buildKidsCharacterTemplate({ heroTypeId, speciesId, backgroundId, favoriteId, gearId });
  const payload = buildCharacterCreationPayloadFromTemplate(template, {
    name,
    edition,
    rulesetId: edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
    spellLoadoutId: 'rook-balanced',
  });

  return {
    ...payload,
    creation_mode: 'kids',
    backstory: `${template.kids_summary.hero}: ${template.kids_summary.tagline}`,
    notes: `Kids Mode choices: ${template.kids_summary.species}, ${template.kids_summary.background}, ${template.kids_summary.favorite}, ${template.kids_summary.gear}.`,
  };
}

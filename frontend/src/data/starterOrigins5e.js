// SRD-safe / generic starter origin expansion for the character builder.
// Keep this file to compact, reusable origin data that does not depend on
// protected sourcebook text. Builder-specific choice UX should still live in
// CharacterBuilder or dedicated builder components.

export const STARTER_SPECIES = {
  Dragonborn: {
    name: 'Dragonborn',
    description: 'Draconic ancestry with elemental breath and resistance.',
    speed: 30,
    size: 'Medium',
    asi2014: { strength: 2, charisma: 1 },
    asi2024: null,
    traits: [
      'Draconic Ancestry',
      'Breath Weapon',
      'Damage Resistance from ancestry',
    ],
    languages: ['Common', 'Draconic'],
    source: 'starter-origin-data',
  },
  'Custom Lineage': {
    name: 'Custom Lineage',
    description: 'Flexible custom ancestry for homebrew worlds and unusual heroes.',
    speed: 30,
    size: 'Medium or Small',
    asi2014: { choice: 1 },
    asi2024: null,
    traits: [
      'Custom appearance and origin',
      'One flexible ability increase',
      'Work with your GM to add a signature trait, feat, or proficiency',
    ],
    languages: ['Common', 'One of choice'],
    source: 'starter-origin-data',
    custom: true,
  },
};

export const STARTER_BACKGROUNDS = {
  Adventurer: {
    name: 'Adventurer',
    description: 'A practical traveller already used to danger, ruins, roads, and odd jobs.',
    skillProficiencies: ['Athletics', 'Perception'],
    toolProficiencies: ['Gaming set'],
    equipment: ['Bedroll', 'Travel clothes', 'Lucky charm', '10 gp'],
    feature: 'Roadwise',
    asi2024: { constitution: 2, dexterity: 1 },
    originFeat2024: 'Tough',
    source: 'starter-origin-data',
  },
  Apprentice: {
    name: 'Apprentice',
    description: 'A trainee, assistant, or promising student from a craft, guild, temple, or mentor.',
    skillProficiencies: ['Insight', 'Investigation'],
    toolProficiencies: ['Artisan tools'],
    equipment: ['Notebook', 'Simple tool set', 'Letter from a mentor', '10 gp'],
    feature: 'Old Mentor',
    asi2024: { intelligence: 2, wisdom: 1 },
    originFeat2024: 'Crafter',
    source: 'starter-origin-data',
  },
  Wanderer: {
    name: 'Wanderer',
    description: 'A restless traveller who has learned to survive between settlements.',
    skillProficiencies: ['Survival', 'Nature'],
    toolProficiencies: ['Navigator tools'],
    equipment: ['Walking staff', 'Weathered map', 'Travel clothes', '10 gp'],
    feature: 'Never Fully Lost',
    asi2024: { wisdom: 2, constitution: 1 },
    originFeat2024: 'Alert',
    source: 'starter-origin-data',
  },
  'Custom Background': {
    name: 'Custom Background',
    description: 'A flexible origin for homebrew campaigns. Use this as a placeholder, then edit the sheet or add a proper homebrew background later.',
    skillProficiencies: [],
    toolProficiencies: [],
    equipment: ['Personal keepsake', 'Common clothes', '10 gp'],
    feature: 'Custom Origin',
    asi2024: { choice: 3 },
    originFeat2024: 'Skilled',
    source: 'starter-origin-data',
    custom: true,
  },
};

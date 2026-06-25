export const PROTOTYPE_MOBILE_CHARACTER_ID = 'prototype-mobile';
export const PROTOTYPE_MOBILE_STORAGE_KEY = 'rq.prototype.mobile.character';

const now = () => new Date().toISOString();

const CLASS_PROTOTYPES = [
  {
    id: 'prototype-barbarian',
    className: 'Barbarian',
    name: 'Brakka Stone-Roar',
    race: 'Goliath',
    subclass: 'Path of the Berserker',
    level: 5,
    hitDie: '5d12',
    hp: [48, 60, 4],
    stats: [18, 13, 16, 9, 12, 10],
    resources: { rage: { label: 'Rage', remaining: 2, current: 2, max: 3, restore: 'long-rest' } },
    skills: ['Athletics', 'Intimidation', 'Survival'],
    saves: ['strength', 'constitution'],
    attacks: ['Greataxe', 'Javelin'],
  },
  {
    id: 'prototype-bard',
    className: 'Bard',
    name: 'Lyra Silvernote',
    race: 'Half-Elf',
    subclass: 'College of Lore',
    level: 5,
    hitDie: '5d8',
    hp: [28, 34, 0],
    stats: [8, 14, 12, 13, 12, 18],
    resources: { bardic_inspiration: { label: 'Bardic Inspiration', remaining: 2, current: 2, max: 4, restore: 'short-rest' } },
    skills: ['Persuasion', 'Performance', 'Arcana', 'Insight'],
    saves: ['dexterity', 'charisma'],
    spellcasting: 'charisma',
    slots: { '1': 4, '2': 3, '3': 2 },
    remaining: { '1': 2, '2': 1, '3': 1 },
    cantrips: ['Vicious Mockery', 'Mage Hand'],
    spells: ['Healing Word', 'Dissonant Whispers', 'Faerie Fire', 'Suggestion', 'Hypnotic Pattern'],
  },
  {
    id: 'prototype-cleric',
    className: 'Cleric',
    name: 'Seren Dawnward',
    race: 'Dwarf',
    subclass: 'Life Domain',
    level: 5,
    hitDie: '5d8',
    hp: [36, 42, 0],
    stats: [12, 10, 16, 11, 18, 12],
    resources: { channel_divinity: { label: 'Channel Divinity', remaining: 0, current: 0, max: 1, restore: 'short-rest' } },
    skills: ['Medicine', 'Religion', 'Insight'],
    saves: ['wisdom', 'charisma'],
    spellcasting: 'wisdom',
    slots: { '1': 4, '2': 3, '3': 2 },
    remaining: { '1': 1, '2': 2, '3': 0 },
    cantrips: ['Guidance', 'Sacred Flame'],
    prepared: ['Bless', 'Cure Wounds', 'Lesser Restoration', 'Spiritual Weapon', 'Revivify'],
  },
  {
    id: 'prototype-druid',
    className: 'Druid',
    name: 'Mira Mossvale',
    race: 'Wood Elf',
    subclass: 'Circle of the Moon',
    level: 5,
    hitDie: '5d8',
    hp: [31, 38, 6],
    stats: [10, 14, 14, 12, 18, 10],
    resources: { wild_shape: { label: 'Wild Shape', remaining: 1, current: 1, max: 2, restore: 'short-rest' } },
    skills: ['Nature', 'Animal Handling', 'Perception'],
    saves: ['intelligence', 'wisdom'],
    spellcasting: 'wisdom',
    slots: { '1': 4, '2': 3, '3': 2 },
    remaining: { '1': 3, '2': 0, '3': 1 },
    cantrips: ['Produce Flame', 'Shillelagh'],
    prepared: ['Entangle', 'Goodberry', 'Moonbeam', 'Pass without Trace', 'Call Lightning'],
  },
  {
    id: 'prototype-fighter',
    className: 'Fighter',
    name: 'Garrick Ironhand',
    race: 'Human',
    subclass: 'Battle Master',
    level: 5,
    hitDie: '5d10',
    hp: [41, 49, 0],
    stats: [18, 13, 16, 10, 12, 10],
    resources: {
      second_wind: { label: 'Second Wind', remaining: 0, current: 0, max: 1, restore: 'short-rest' },
      action_surge: { label: 'Action Surge', remaining: 0, current: 0, max: 1, restore: 'short-rest' },
      superiority_dice: { label: 'Superiority Dice', remaining: 2, current: 2, max: 4, restore: 'short-rest' },
    },
    skills: ['Athletics', 'Perception', 'History'],
    saves: ['strength', 'constitution'],
    attacks: ['Longsword', 'Heavy Crossbow'],
  },
  {
    id: 'prototype-monk',
    className: 'Monk',
    name: 'Tavi Quickstep',
    race: 'Halfling',
    subclass: 'Way of the Open Hand',
    level: 5,
    hitDie: '5d8',
    hp: [28, 36, 0],
    stats: [10, 18, 14, 10, 16, 10],
    resources: { ki: { label: 'Ki', remaining: 1, current: 1, max: 5, restore: 'short-rest' } },
    skills: ['Acrobatics', 'Stealth', 'Insight'],
    saves: ['strength', 'dexterity'],
    attacks: ['Quarterstaff', 'Unarmed Strike'],
  },
  {
    id: 'prototype-paladin',
    className: 'Paladin',
    name: 'Sir Caldus Brightshield',
    race: 'Aasimar',
    subclass: 'Oath of Devotion',
    level: 5,
    hitDie: '5d10',
    hp: [44, 52, 0],
    stats: [17, 10, 15, 10, 12, 16],
    resources: {
      lay_on_hands: { label: 'Lay on Hands', remaining: 9, current: 9, max: 25, restore: 'long-rest' },
      channel_divinity: { label: 'Channel Divinity', remaining: 0, current: 0, max: 1, restore: 'short-rest' },
    },
    skills: ['Athletics', 'Religion', 'Persuasion'],
    saves: ['wisdom', 'charisma'],
    spellcasting: 'charisma',
    slots: { '1': 4, '2': 2 },
    remaining: { '1': 2, '2': 0 },
    prepared: ['Bless', 'Command', 'Shield of Faith', 'Lesser Restoration', 'Find Steed'],
  },
  {
    id: 'prototype-ranger',
    className: 'Ranger',
    name: 'Nyra Thornwatch',
    race: 'Elf',
    subclass: 'Hunter',
    level: 5,
    hitDie: '5d10',
    hp: [38, 46, 0],
    stats: [12, 18, 14, 11, 16, 10],
    resources: {},
    skills: ['Survival', 'Perception', 'Stealth', 'Nature'],
    saves: ['strength', 'dexterity'],
    spellcasting: 'wisdom',
    slots: { '1': 4, '2': 2 },
    remaining: { '1': 1, '2': 1 },
    spells: ['Hunter\'s Mark', 'Cure Wounds', 'Absorb Elements', 'Pass without Trace'],
    attacks: ['Longbow', 'Shortsword'],
  },
  {
    id: 'prototype-rogue',
    className: 'Rogue',
    name: 'Silas Lockwhisper',
    race: 'Tiefling',
    subclass: 'Thief',
    level: 5,
    hitDie: '5d8',
    hp: [30, 36, 0],
    stats: [8, 18, 14, 14, 12, 12],
    resources: {},
    skills: ['Stealth', 'Sleight of Hand', 'Investigation', 'Deception', 'Acrobatics'],
    saves: ['dexterity', 'intelligence'],
    attacks: ['Rapier', 'Shortbow', 'Sneak Attack'],
  },
  {
    id: 'prototype-sorcerer',
    className: 'Sorcerer',
    name: 'Vexa Embervein',
    race: 'Dragonborn',
    subclass: 'Draconic Bloodline',
    level: 5,
    hitDie: '5d6',
    hp: [23, 29, 0],
    stats: [8, 14, 14, 10, 12, 18],
    resources: { sorcery_points: { label: 'Sorcery Points', remaining: 2, current: 2, max: 5, restore: 'long-rest' } },
    skills: ['Arcana', 'Deception', 'Persuasion'],
    saves: ['constitution', 'charisma'],
    spellcasting: 'charisma',
    slots: { '1': 4, '2': 3, '3': 2 },
    remaining: { '1': 0, '2': 2, '3': 1 },
    cantrips: ['Fire Bolt', 'Minor Illusion'],
    spells: ['Shield', 'Magic Missile', 'Scorching Ray', 'Misty Step', 'Fireball'],
  },
  {
    id: 'prototype-warlock',
    className: 'Warlock',
    name: 'Javen Crow',
    race: 'Human',
    subclass: 'The Celestial',
    level: 8,
    hitDie: '8d8',
    hp: [42, 58, 8],
    stats: [11, 16, 12, 9, 14, 16],
    resources: {
      healing_light: { label: 'Healing Light', remaining: 5, current: 5, max: 5, restore: 'long-rest' },
      pact_magic: { label: 'Pact Magic', remaining: 1, current: 1, max: 2, restore: 'short-rest' },
    },
    skills: ['Acrobatics', 'Arcana', 'Insight', 'Persuasion'],
    saves: ['wisdom', 'charisma'],
    spellcasting: 'charisma',
    slots: { '4': 2 },
    remaining: { '4': 1 },
    cantrips: ['Eldritch Blast', 'Booming Blade'],
    spells: ['Hex', 'Darkness', 'Counterspell', 'Shadow of Moil'],
    attacks: ['Eldritch Blast', 'Pact Handaxe'],
  },
  {
    id: 'prototype-wizard',
    className: 'Wizard',
    name: 'Orin Starquill',
    race: 'High Elf',
    subclass: 'School of Evocation',
    level: 5,
    hitDie: '5d6',
    hp: [20, 27, 0],
    stats: [8, 14, 13, 18, 12, 10],
    resources: { arcane_recovery: { label: 'Arcane Recovery', remaining: 0, current: 0, max: 1, restore: 'long-rest' } },
    skills: ['Arcana', 'History', 'Investigation'],
    saves: ['intelligence', 'wisdom'],
    spellcasting: 'intelligence',
    slots: { '1': 4, '2': 3, '3': 2 },
    remaining: { '1': 1, '2': 0, '3': 1 },
    cantrips: ['Fire Bolt', 'Prestidigitation'],
    spells: ['Mage Armor', 'Shield', 'Magic Missile', 'Misty Step', 'Fireball', 'Counterspell'],
    prepared: ['Mage Armor', 'Shield', 'Magic Missile', 'Misty Step', 'Fireball'],
  },
];

export const PROTOTYPE_CLASS_IDS = CLASS_PROTOTYPES.map(item => item.id);

export function getPrototypeClassOptions() {
  return CLASS_PROTOTYPES.map(({ id, className, name, subclass }) => ({ id, className, name, subclass }));
}

function spellList(names = [], level = null) {
  return names.map(name => ({ name, level, school: '', description: `Prototype ${name} entry for local testing.` }));
}

function buildCharacter(config) {
  const [str, dex, con, int, wis, cha] = config.stats;
  const [currentHp, maxHp, tempHp] = config.hp;
  const hasSpells = Boolean(config.spellcasting);
  return {
    id: config.id,
    user_id: 'local-prototype',
    campaign_id: 'prototype-tia-karta',
    name: config.name,
    race: config.race,
    subrace: '',
    character_class: config.className,
    subclass: config.subclass,
    background: config.background || 'Prototype Adventurer',
    level: config.level,
    edition: '2014',
    rules_edition: '2014',
    ruleset_id: 'dnd5e_2014',

    strength: str,
    dexterity: dex,
    constitution: con,
    intelligence: int,
    wisdom: wis,
    charisma: cha,

    armor_class: 10 + Math.floor((dex - 10) / 2),
    speed: 30,
    max_hit_points: maxHp,
    current_hit_points: currentHp,
    temporary_hit_points: tempHp,
    temp_hp: tempHp,
    hit_dice: config.hitDie,
    hit_dice_remaining: Math.max(0, config.level - 1),
    death_saves_successes: 0,
    death_saves_failures: 0,
    exhaustion_level: 0,
    proficiency_bonus: 2 + Math.floor((config.level - 1) / 4),

    skill_proficiencies: config.skills || [],
    saving_throw_proficiencies: config.saves || [],
    weapon_proficiencies: ['Simple weapons'],
    armor_proficiencies: [],
    tool_proficiencies: [],
    languages: ['Common'],

    features: [
      ...(config.attacks || []).map(name => ({ name, type: 'action', description: `Prototype ${name} action.` })),
      ...Object.values(config.resources || {}).map(resource => ({ name: resource.label, type: 'special', description: `${resource.label} restores on ${resource.restore}.` })),
    ],
    class_features: [],
    racial_traits: [],
    feats: [],

    spellcasting_ability: hasSpells ? config.spellcasting : '',
    spell_save_dc: hasSpells ? 8 + (2 + Math.floor((config.level - 1) / 4)) + Math.floor(((config.spellcasting === 'wisdom' ? wis : config.spellcasting === 'intelligence' ? int : cha) - 10) / 2) : 0,
    spell_attack_bonus: hasSpells ? (2 + Math.floor((config.level - 1) / 4)) + Math.floor(((config.spellcasting === 'wisdom' ? wis : config.spellcasting === 'intelligence' ? int : cha) - 10) / 2) : 0,
    spell_slots: config.slots || {},
    spell_slots_remaining: config.remaining || config.slots || {},
    used_spell_slots: {},
    cantrips_known: spellList(config.cantrips || [], 0),
    spells_known: spellList(config.spells || [], null),
    spells_prepared: spellList(config.prepared || [], null),

    resources: config.resources || {},

    equipment: (config.attacks || ['Adventuring gear']).map(name => ({ name, equipped: true, quantity: 1 })),
    inventory: [
      { name: 'Healing Potion', quantity: 2 },
      { name: 'Rope', quantity: 1 },
      { name: 'Rations', quantity: 5 },
    ],
    equipped: { armor: null, shield: null, mainHand: config.attacks?.[0] || null, offHand: null },
    currency: { copper: 0, silver: 12, electrum: 0, gold: 50, platinum: 0 },
    gold: 50,

    conditions: [],
    inspiration: false,
    has_inspiration: false,
    concentrating_on: hasSpells ? (config.spells?.[0] || config.prepared?.[0] || '') : '',
    concentration: hasSpells ? (config.spells?.[0] || config.prepared?.[0] || '') : '',

    alignment: 'Neutral',
    personality_traits: 'Prototype test character.',
    ideals: 'Built to test class behaviour quickly.',
    bonds: 'Linked to the Tia-Karta prototype campaign.',
    flaws: 'May reveal bugs. That is their sacred purpose.',
    backstory: `${config.name} is a local-only ${config.className} prototype for mobile testing.`,
    appearance: 'Prototype adventurer.',
    notes: 'Saved only in this browser while using prototype mode.',

    created_at: now(),
    updated_at: now(),
    isPrototype: true,
  };
}

export function getPrototypeConfig(characterId = PROTOTYPE_MOBILE_CHARACTER_ID) {
  if (characterId === PROTOTYPE_MOBILE_CHARACTER_ID) {
    return CLASS_PROTOTYPES.find(item => item.id === 'prototype-warlock');
  }
  return CLASS_PROTOTYPES.find(item => item.id === characterId) || CLASS_PROTOTYPES[0];
}

export function createPrototypeCharacter(characterId = PROTOTYPE_MOBILE_CHARACTER_ID) {
  return buildCharacter(getPrototypeConfig(characterId));
}

export function createPrototypeMobileCharacter() {
  return createPrototypeCharacter(PROTOTYPE_MOBILE_CHARACTER_ID);
}

export function isPrototypeCharacterId(characterId = '') {
  return characterId === PROTOTYPE_MOBILE_CHARACTER_ID || PROTOTYPE_CLASS_IDS.includes(characterId) || String(characterId).startsWith('prototype-');
}

export function prototypeStorageKey(characterId = PROTOTYPE_MOBILE_CHARACTER_ID) {
  return `rq.prototype.character.${characterId}`;
}

export function loadPrototypeCharacter(characterId = PROTOTYPE_MOBILE_CHARACTER_ID) {
  const key = prototypeStorageKey(characterId);
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return createPrototypeCharacter(characterId);
    const parsed = JSON.parse(saved);
    return { ...createPrototypeCharacter(characterId), ...parsed, id: characterId, isPrototype: true };
  } catch {
    return createPrototypeCharacter(characterId);
  }
}

export function savePrototypeCharacter(characterId = PROTOTYPE_MOBILE_CHARACTER_ID, character) {
  const next = {
    ...character,
    id: characterId,
    isPrototype: true,
    updated_at: now(),
  };
  localStorage.setItem(prototypeStorageKey(characterId), JSON.stringify(next));
  return next;
}

export function resetPrototypeCharacter(characterId = PROTOTYPE_MOBILE_CHARACTER_ID) {
  const fresh = createPrototypeCharacter(characterId);
  localStorage.setItem(prototypeStorageKey(characterId), JSON.stringify(fresh));
  return fresh;
}

export function loadPrototypeMobileCharacter() {
  return loadPrototypeCharacter(PROTOTYPE_MOBILE_CHARACTER_ID);
}

export function savePrototypeMobileCharacter(character) {
  return savePrototypeCharacter(PROTOTYPE_MOBILE_CHARACTER_ID, character);
}

export function resetPrototypeMobileCharacter() {
  return resetPrototypeCharacter(PROTOTYPE_MOBILE_CHARACTER_ID);
}

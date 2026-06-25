export const PROTOTYPE_MOBILE_CHARACTER_ID = 'prototype-mobile';
export const PROTOTYPE_MOBILE_STORAGE_KEY = 'rq.prototype.mobile.character';

export function createPrototypeMobileCharacter() {
  return {
    id: PROTOTYPE_MOBILE_CHARACTER_ID,
    user_id: 'local-prototype',
    name: 'Javen Crow',
    race: 'Human',
    subrace: '',
    character_class: 'Warlock',
    subclass: 'The Celestial',
    background: 'Knight of the Order',
    level: 8,
    edition: '2014',
    rules_edition: '2014',
    ruleset_id: 'dnd5e_2014',

    strength: 11,
    dexterity: 16,
    constitution: 12,
    intelligence: 9,
    wisdom: 14,
    charisma: 16,

    armor_class: 13,
    speed: 30,
    max_hit_points: 58,
    current_hit_points: 42,
    temporary_hit_points: 8,
    temp_hp: 8,
    hit_dice: '8d8',
    hit_dice_remaining: 6,
    death_saves_successes: 0,
    death_saves_failures: 0,
    exhaustion_level: 0,
    proficiency_bonus: 3,

    skill_proficiencies: ['Acrobatics', 'Arcana', 'Insight', 'Persuasion'],
    saving_throw_proficiencies: ['wisdom', 'charisma'],
    weapon_proficiencies: ['Simple weapons', 'Pact weapon'],
    armor_proficiencies: ['Light armor'],
    tool_proficiencies: ['Flute'],
    languages: ['Common', 'Dwarvish'],

    features: [
      { name: 'Pact Magic', type: 'passive', description: 'Warlock spellcasting that recovers on a short rest.' },
      { name: 'Healing Light', type: 'bonus_action', description: 'A pool of d6s used to heal creatures.' },
      { name: 'Pact of the Blade', type: 'passive', description: 'Summon or bind a pact weapon.' },
      { name: 'Eldritch Invocations', type: 'passive', description: 'Agonizing Blast and Devil\'s Sight.' },
    ],
    class_features: [],
    racial_traits: [],
    feats: [{ name: 'Alert', description: '+5 initiative and cannot be surprised.' }],

    spellcasting_ability: 'charisma',
    spell_save_dc: 14,
    spell_attack_bonus: 6,
    spell_slots: { '4': 2 },
    spell_slots_remaining: { '4': 1 },
    used_spell_slots: {},
    cantrips_known: [
      { name: 'Eldritch Blast', level: 0, school: 'Evocation', description: 'A beam of crackling energy.' },
      { name: 'Booming Blade', level: 0, school: 'Evocation', description: 'A weapon strike wrapped in thunderous energy.' },
    ],
    spells_known: [
      { name: 'Hex', level: 1, school: 'Enchantment', description: 'Curse a target and deal extra necrotic damage.' },
      { name: 'Darkness', level: 2, school: 'Evocation', description: 'Create magical darkness.' },
      { name: 'Counterspell', level: 3, school: 'Abjuration', description: 'Interrupt a creature casting a spell.' },
      { name: 'Shadow of Moil', level: 4, school: 'Necromancy', description: 'Wreathe yourself in flame-like shadow.' },
    ],
    spells_prepared: [],

    resources: {
      healing_light: {
        label: 'Healing Light',
        current: 5,
        remaining: 5,
        max: 5,
        restore: 'long-rest',
        min_level: 1,
      },
      pact_magic: {
        label: 'Pact Magic',
        current: 1,
        remaining: 1,
        max: 2,
        restore: 'short-rest',
        min_level: 1,
      },
    },

    equipment: [
      { name: 'Pact Handaxe', equipped: true, quantity: 1 },
      { name: 'Leather coat', equipped: true, quantity: 1 },
    ],
    inventory: [
      { name: 'Old bottle', quantity: 1, notes: 'Definitely medicinal.' },
      { name: 'Rope', quantity: 1 },
      { name: 'Healing Potion', quantity: 2 },
    ],
    equipped: { armor: 'Leather coat', shield: null, mainHand: 'Pact Handaxe', offHand: null },
    currency: { copper: 0, silver: 12, electrum: 0, gold: 48, platinum: 1 },
    gold: 48,

    conditions: [],
    inspiration: true,
    has_inspiration: true,
    concentrating_on: 'Hex',
    concentration: 'Hex',

    alignment: 'Chaotic Good',
    personality_traits: 'Dry humour, stubborn, protective.',
    ideals: 'People deserve a second chance.',
    bonds: 'Daliah and Tristan.',
    flaws: 'Does not know when to stop pushing himself.',
    backstory: 'Prototype mobile character used for fast local testing.',
    appearance: 'Dark coat, hat, orange warlock glow around the eyes.',
    notes: 'This character is saved only in this browser when using prototype mode.',

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isPrototype: true,
  };
}

export function isPrototypeCharacterId(characterId) {
  return characterId === PROTOTYPE_MOBILE_CHARACTER_ID;
}

export function loadPrototypeMobileCharacter() {
  try {
    const saved = localStorage.getItem(PROTOTYPE_MOBILE_STORAGE_KEY);
    if (!saved) return createPrototypeMobileCharacter();
    const parsed = JSON.parse(saved);
    return { ...createPrototypeMobileCharacter(), ...parsed, id: PROTOTYPE_MOBILE_CHARACTER_ID, isPrototype: true };
  } catch {
    return createPrototypeMobileCharacter();
  }
}

export function savePrototypeMobileCharacter(character) {
  const next = {
    ...character,
    id: PROTOTYPE_MOBILE_CHARACTER_ID,
    isPrototype: true,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(PROTOTYPE_MOBILE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetPrototypeMobileCharacter() {
  const fresh = createPrototypeMobileCharacter();
  localStorage.setItem(PROTOTYPE_MOBILE_STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

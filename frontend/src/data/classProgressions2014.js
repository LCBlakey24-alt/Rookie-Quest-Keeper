export const CLASS_NAMES_2014 = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
];

export const PROFICIENCY_BY_LEVEL_2014 = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

export const SHARED_ASI_LEVELS_2014 = [4, 8, 12, 16, 19];

export const FULL_CASTER_SLOTS_2014 = {
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
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

export const HALF_CASTER_SLOTS_2014 = {
  1: {},
  2: { 1: 2 },
  3: { 1: 3 },
  4: { 1: 3 },
  5: { 1: 4, 2: 2 },
  6: { 1: 4, 2: 2 },
  7: { 1: 4, 2: 3 },
  8: { 1: 4, 2: 3 },
  9: { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

export const WARLOCK_PACT_SLOTS_2014 = {
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
  20: { slots: 4, level: 5 },
};

const fighterAsi = [4, 6, 8, 12, 14, 16, 19];
const rogueAsi = [4, 8, 10, 12, 16, 19];

export const CLASS_PROGRESSION_2014 = {
  Barbarian: {
    hitDie: 'd12', primaryAbilities: ['Strength', 'Constitution'], savingThrows: ['Strength', 'Constitution'], subclassLevel: 3,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'none',
    resources: [{ key: 'rage', label: 'Rage', restore: 'long-rest', byLevel: { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: 'Unlimited' } }],
    featuresByLevel: {
      1: ['Rage', 'Unarmored Defense'], 2: ['Reckless Attack', 'Danger Sense'], 3: ['Primal Path'], 4: ['Ability Score Improvement'],
      5: ['Extra Attack', 'Fast Movement'], 6: ['Path feature'], 7: ['Feral Instinct'], 8: ['Ability Score Improvement'], 9: ['Brutal Critical'],
      10: ['Path feature'], 11: ['Relentless Rage'], 12: ['Ability Score Improvement'], 13: ['Brutal Critical improvement'], 14: ['Path feature'],
      15: ['Persistent Rage'], 16: ['Ability Score Improvement'], 17: ['Brutal Critical improvement'], 18: ['Indomitable Might'], 19: ['Ability Score Improvement'], 20: ['Primal Champion'],
    },
  },
  Bard: {
    hitDie: 'd8', primaryAbilities: ['Charisma', 'Dexterity'], savingThrows: ['Dexterity', 'Charisma'], subclassLevel: 3,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'full', spellAbility: 'Charisma',
    resources: [{ key: 'bardic_inspiration', label: 'Bardic Inspiration', restore: 'short-rest from level 5', byLevel: { 1: 'CHA mod', 5: 'CHA mod / short rest' } }],
    featuresByLevel: {
      1: ['Spellcasting', 'Bardic Inspiration'], 2: ['Jack of All Trades', 'Song of Rest'], 3: ['Bard College', 'Expertise'], 4: ['Ability Score Improvement'],
      5: ['Font of Inspiration', 'Bardic Inspiration die improves'], 6: ['Countercharm', 'College feature'], 7: ['4th-level spells'], 8: ['Ability Score Improvement'],
      9: ['Song of Rest die improves'], 10: ['Expertise', 'Magical Secrets', 'Bardic Inspiration die improves'], 11: ['6th-level spells'], 12: ['Ability Score Improvement'],
      13: ['Song of Rest die improves'], 14: ['Magical Secrets', 'College feature'], 15: ['Bardic Inspiration die improves'], 16: ['Ability Score Improvement'],
      17: ['Song of Rest die improves'], 18: ['Magical Secrets'], 19: ['Ability Score Improvement'], 20: ['Superior Inspiration'],
    },
  },
  Cleric: {
    hitDie: 'd8', primaryAbilities: ['Wisdom', 'Constitution'], savingThrows: ['Wisdom', 'Charisma'], subclassLevel: 1,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'full', spellAbility: 'Wisdom',
    resources: [{ key: 'channel_divinity', label: 'Channel Divinity', restore: 'short-rest', byLevel: { 2: 1, 6: 2, 18: 3 } }],
    featuresByLevel: {
      1: ['Spellcasting', 'Divine Domain'], 2: ['Channel Divinity', 'Domain channel option'], 3: ['2nd-level spells'], 4: ['Ability Score Improvement'],
      5: ['Destroy Undead', '3rd-level spells'], 6: ['Channel Divinity uses increase', 'Domain feature'], 7: ['4th-level spells'], 8: ['Ability Score Improvement', 'Domain feature'],
      9: ['5th-level spells'], 10: ['Divine Intervention'], 11: ['Destroy Undead improvement', '6th-level spells'], 12: ['Ability Score Improvement'],
      13: ['7th-level spells'], 14: ['Destroy Undead improvement'], 15: ['8th-level spells'], 16: ['Ability Score Improvement'],
      17: ['9th-level spells', 'Domain feature'], 18: ['Channel Divinity uses increase'], 19: ['Ability Score Improvement'], 20: ['Divine Intervention improvement'],
    },
  },
  Druid: {
    hitDie: 'd8', primaryAbilities: ['Wisdom', 'Constitution'], savingThrows: ['Intelligence', 'Wisdom'], subclassLevel: 2,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'full', spellAbility: 'Wisdom',
    resources: [{ key: 'wild_shape', label: 'Wild Shape', restore: 'short-rest', byLevel: { 2: 2, 20: 'Unlimited' } }],
    featuresByLevel: {
      1: ['Spellcasting', 'Druidic'], 2: ['Wild Shape', 'Druid Circle'], 3: ['2nd-level spells'], 4: ['Ability Score Improvement', 'Wild Shape improvement'],
      5: ['3rd-level spells'], 6: ['Circle feature'], 7: ['4th-level spells'], 8: ['Ability Score Improvement', 'Wild Shape improvement'],
      9: ['5th-level spells'], 10: ['Circle feature'], 11: ['6th-level spells'], 12: ['Ability Score Improvement'],
      13: ['7th-level spells'], 14: ['Circle feature'], 15: ['8th-level spells'], 16: ['Ability Score Improvement'],
      17: ['9th-level spells'], 18: ['Timeless Body', 'Beast Spells'], 19: ['Ability Score Improvement'], 20: ['Archdruid'],
    },
  },
  Fighter: {
    hitDie: 'd10', primaryAbilities: ['Strength or Dexterity', 'Constitution'], savingThrows: ['Strength', 'Constitution'], subclassLevel: 3,
    asiLevels: fighterAsi, spellcasting: 'subclass-dependent',
    resources: [
      { key: 'second_wind', label: 'Second Wind', restore: 'short-rest', byLevel: { 1: 1 } },
      { key: 'action_surge', label: 'Action Surge', restore: 'short-rest', byLevel: { 2: 1, 17: 2 } },
      { key: 'indomitable', label: 'Indomitable', restore: 'long-rest', byLevel: { 9: 1, 13: 2, 17: 3 } },
    ],
    featuresByLevel: {
      1: ['Fighting Style', 'Second Wind'], 2: ['Action Surge'], 3: ['Martial Archetype'], 4: ['Ability Score Improvement'],
      5: ['Extra Attack'], 6: ['Ability Score Improvement'], 7: ['Archetype feature'], 8: ['Ability Score Improvement'], 9: ['Indomitable'],
      10: ['Archetype feature'], 11: ['Extra Attack improvement'], 12: ['Ability Score Improvement'], 13: ['Indomitable use increase'], 14: ['Ability Score Improvement'],
      15: ['Archetype feature'], 16: ['Ability Score Improvement'], 17: ['Action Surge use increase', 'Indomitable use increase'], 18: ['Archetype feature'], 19: ['Ability Score Improvement'], 20: ['Extra Attack improvement'],
    },
  },
  Monk: {
    hitDie: 'd8', primaryAbilities: ['Dexterity', 'Wisdom'], savingThrows: ['Strength', 'Dexterity'], subclassLevel: 3,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'none',
    resources: [{ key: 'ki', label: 'Ki', restore: 'short-rest', byLevel: Object.fromEntries(Array.from({ length: 19 }, (_, index) => [index + 2, index + 2])) }],
    featuresByLevel: {
      1: ['Unarmored Defense', 'Martial Arts'], 2: ['Ki', 'Unarmored Movement'], 3: ['Monastic Tradition', 'Deflect Missiles'], 4: ['Ability Score Improvement', 'Slow Fall'],
      5: ['Extra Attack', 'Stunning Strike'], 6: ['Ki-Empowered Strikes', 'Tradition feature'], 7: ['Evasion', 'Stillness of Mind'], 8: ['Ability Score Improvement'],
      9: ['Unarmored Movement improvement'], 10: ['Purity of Body'], 11: ['Tradition feature'], 12: ['Ability Score Improvement'],
      13: ['Tongue of the Sun and Moon'], 14: ['Diamond Soul'], 15: ['Timeless Body'], 16: ['Ability Score Improvement'],
      17: ['Tradition feature'], 18: ['Empty Body'], 19: ['Ability Score Improvement'], 20: ['Perfect Self'],
    },
  },
  Paladin: {
    hitDie: 'd10', primaryAbilities: ['Strength', 'Charisma'], savingThrows: ['Wisdom', 'Charisma'], subclassLevel: 3,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'half', spellAbility: 'Charisma',
    resources: [
      { key: 'lay_on_hands', label: 'Lay on Hands', restore: 'long-rest', byLevel: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [index + 1, (index + 1) * 5])) },
      { key: 'channel_divinity', label: 'Channel Divinity', restore: 'short-rest', byLevel: { 3: 1 } },
    ],
    featuresByLevel: {
      1: ['Divine Sense', 'Lay on Hands'], 2: ['Fighting Style', 'Spellcasting', 'Divine Smite'], 3: ['Divine Health', 'Sacred Oath'], 4: ['Ability Score Improvement'],
      5: ['Extra Attack', '2nd-level spells'], 6: ['Aura of Protection'], 7: ['Oath feature'], 8: ['Ability Score Improvement'], 9: ['3rd-level spells'],
      10: ['Aura of Courage'], 11: ['Improved Divine Smite'], 12: ['Ability Score Improvement'], 13: ['4th-level spells'], 14: ['Cleansing Touch'],
      15: ['Oath feature'], 16: ['Ability Score Improvement'], 17: ['5th-level spells'], 18: ['Aura improvements'], 19: ['Ability Score Improvement'], 20: ['Oath capstone'],
    },
  },
  Ranger: {
    hitDie: 'd10', primaryAbilities: ['Dexterity', 'Wisdom'], savingThrows: ['Strength', 'Dexterity'], subclassLevel: 3,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'half', spellAbility: 'Wisdom',
    resources: [],
    featuresByLevel: {
      1: ['Favored Enemy', 'Natural Explorer'], 2: ['Fighting Style', 'Spellcasting'], 3: ['Ranger Archetype', 'Primeval Awareness'], 4: ['Ability Score Improvement'],
      5: ['Extra Attack', '2nd-level spells'], 6: ['Favored Enemy improvement', 'Natural Explorer improvement'], 7: ['Archetype feature'], 8: ['Ability Score Improvement', 'Land’s Stride'],
      9: ['3rd-level spells'], 10: ['Natural Explorer improvement', 'Hide in Plain Sight'], 11: ['Archetype feature'], 12: ['Ability Score Improvement'],
      13: ['4th-level spells'], 14: ['Favored Enemy improvement', 'Vanish'], 15: ['Archetype feature'], 16: ['Ability Score Improvement'],
      17: ['5th-level spells'], 18: ['Feral Senses'], 19: ['Ability Score Improvement'], 20: ['Foe Slayer'],
    },
  },
  Rogue: {
    hitDie: 'd8', primaryAbilities: ['Dexterity'], savingThrows: ['Dexterity', 'Intelligence'], subclassLevel: 3,
    asiLevels: rogueAsi, spellcasting: 'subclass-dependent',
    resources: [],
    featuresByLevel: {
      1: ['Expertise', 'Sneak Attack', 'Thieves’ Cant'], 2: ['Cunning Action'], 3: ['Roguish Archetype'], 4: ['Ability Score Improvement'],
      5: ['Uncanny Dodge'], 6: ['Expertise'], 7: ['Evasion'], 8: ['Ability Score Improvement'], 9: ['Archetype feature'],
      10: ['Ability Score Improvement'], 11: ['Reliable Talent'], 12: ['Ability Score Improvement'], 13: ['Archetype feature'], 14: ['Blindsense'],
      15: ['Slippery Mind'], 16: ['Ability Score Improvement'], 17: ['Archetype feature'], 18: ['Elusive'], 19: ['Ability Score Improvement'], 20: ['Stroke of Luck'],
    },
  },
  Sorcerer: {
    hitDie: 'd6', primaryAbilities: ['Charisma', 'Constitution'], savingThrows: ['Constitution', 'Charisma'], subclassLevel: 1,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'full', spellAbility: 'Charisma',
    resources: [{ key: 'sorcery_points', label: 'Sorcery Points', restore: 'long-rest', byLevel: Object.fromEntries(Array.from({ length: 19 }, (_, index) => [index + 2, index + 2])) }],
    featuresByLevel: {
      1: ['Spellcasting', 'Sorcerous Origin'], 2: ['Font of Magic'], 3: ['Metamagic'], 4: ['Ability Score Improvement'],
      5: ['3rd-level spells'], 6: ['Origin feature'], 7: ['4th-level spells'], 8: ['Ability Score Improvement'], 9: ['5th-level spells'],
      10: ['Metamagic option'], 11: ['6th-level spells'], 12: ['Ability Score Improvement'], 13: ['7th-level spells'], 14: ['Origin feature'],
      15: ['8th-level spells'], 16: ['Ability Score Improvement'], 17: ['9th-level spells', 'Metamagic option'], 18: ['Origin feature'], 19: ['Ability Score Improvement'], 20: ['Sorcerous Restoration'],
    },
  },
  Warlock: {
    hitDie: 'd8', primaryAbilities: ['Charisma', 'Constitution'], savingThrows: ['Wisdom', 'Charisma'], subclassLevel: 1,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'pact', spellAbility: 'Charisma',
    resources: [{ key: 'pact_magic', label: 'Pact Magic', restore: 'short-rest', byLevel: WARLOCK_PACT_SLOTS_2014 }],
    featuresByLevel: {
      1: ['Otherworldly Patron', 'Pact Magic'], 2: ['Eldritch Invocations'], 3: ['Pact Boon'], 4: ['Ability Score Improvement'],
      5: ['3rd-level pact slots'], 6: ['Patron feature'], 7: ['4th-level pact slots'], 8: ['Ability Score Improvement'], 9: ['5th-level pact slots'],
      10: ['Patron feature'], 11: ['Mystic Arcanum 6th', 'Pact slot count increases'], 12: ['Ability Score Improvement'], 13: ['Mystic Arcanum 7th'], 14: ['Patron feature'],
      15: ['Mystic Arcanum 8th'], 16: ['Ability Score Improvement'], 17: ['Mystic Arcanum 9th', 'Pact slot count increases'], 18: ['Invocation known'], 19: ['Ability Score Improvement'], 20: ['Eldritch Master'],
    },
  },
  Wizard: {
    hitDie: 'd6', primaryAbilities: ['Intelligence', 'Constitution'], savingThrows: ['Intelligence', 'Wisdom'], subclassLevel: 2,
    asiLevels: SHARED_ASI_LEVELS_2014, spellcasting: 'full', spellAbility: 'Intelligence',
    resources: [{ key: 'arcane_recovery', label: 'Arcane Recovery', restore: 'long-rest', byLevel: { 1: 1 } }],
    featuresByLevel: {
      1: ['Spellcasting', 'Arcane Recovery'], 2: ['Arcane Tradition'], 3: ['2nd-level spells'], 4: ['Ability Score Improvement'],
      5: ['3rd-level spells'], 6: ['Tradition feature'], 7: ['4th-level spells'], 8: ['Ability Score Improvement'], 9: ['5th-level spells'],
      10: ['Tradition feature'], 11: ['6th-level spells'], 12: ['Ability Score Improvement'], 13: ['7th-level spells'], 14: ['Tradition feature'],
      15: ['8th-level spells'], 16: ['Ability Score Improvement'], 17: ['9th-level spells'], 18: ['Spell Mastery'], 19: ['Ability Score Improvement'], 20: ['Signature Spells'],
    },
  },
};

export function normaliseClassName(className = '') {
  const lower = String(className).trim().toLowerCase();
  return CLASS_NAMES_2014.find(name => name.toLowerCase() === lower) || className;
}

export function clampLevel(level = 1) {
  return Math.max(1, Math.min(20, Number(level) || 1));
}

export function getProficiencyBonus(level = 1) {
  return PROFICIENCY_BY_LEVEL_2014[clampLevel(level)] || 2;
}

export function getClassProgression(className = '') {
  return CLASS_PROGRESSION_2014[normaliseClassName(className)] || null;
}

export function getSpellSlotsForClass(className = '', level = 1) {
  const progression = getClassProgression(className);
  const safeLevel = clampLevel(level);
  if (!progression) return {};
  if (progression.spellcasting === 'full') return FULL_CASTER_SLOTS_2014[safeLevel] || {};
  if (progression.spellcasting === 'half') return HALF_CASTER_SLOTS_2014[safeLevel] || {};
  if (progression.spellcasting === 'pact') {
    const pact = WARLOCK_PACT_SLOTS_2014[safeLevel];
    return pact ? { [pact.level]: pact.slots } : {};
  }
  return {};
}

export function getResourceValueAtLevel(resource, level = 1) {
  if (!resource?.byLevel) return null;
  const safeLevel = clampLevel(level);
  const levels = Object.keys(resource.byLevel).map(Number).sort((a, b) => a - b);
  let value = null;
  levels.forEach(entryLevel => {
    if (entryLevel <= safeLevel) value = resource.byLevel[entryLevel];
  });
  return value;
}

export function getProgressionSnapshot(className = '', level = 1) {
  const safeLevel = clampLevel(level);
  const progression = getClassProgression(className);
  if (!progression) return null;
  const nextLevel = safeLevel < 20 ? safeLevel + 1 : null;
  return {
    className: normaliseClassName(className),
    level: safeLevel,
    nextLevel,
    proficiencyBonus: getProficiencyBonus(safeLevel),
    nextProficiencyBonus: nextLevel ? getProficiencyBonus(nextLevel) : null,
    hitDie: progression.hitDie,
    primaryAbilities: progression.primaryAbilities,
    savingThrows: progression.savingThrows,
    subclassLevel: progression.subclassLevel,
    asiLevels: progression.asiLevels,
    spellcasting: progression.spellcasting,
    spellAbility: progression.spellAbility,
    currentFeatures: progression.featuresByLevel[safeLevel] || [],
    nextFeatures: nextLevel ? (progression.featuresByLevel[nextLevel] || []) : [],
    currentSpellSlots: getSpellSlotsForClass(className, safeLevel),
    nextSpellSlots: nextLevel ? getSpellSlotsForClass(className, nextLevel) : {},
    resources: (progression.resources || []).map(resource => ({
      ...resource,
      currentValue: getResourceValueAtLevel(resource, safeLevel),
      nextValue: nextLevel ? getResourceValueAtLevel(resource, nextLevel) : null,
    })),
  };
}

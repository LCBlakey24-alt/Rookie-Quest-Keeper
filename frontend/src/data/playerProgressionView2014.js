import {
  CLASS_NAMES_2014,
  clampLevel,
  getClassProgression,
  getProgressionSnapshot,
  normaliseClassName,
} from './classProgressions2014';

const CLASS_ADVICE = {
  Barbarian: {
    abilities: ['Strength', 'Constitution'],
    feats: ['Great Weapon Master', 'Tough', 'Sentinel', 'Resilient'],
    spells: [],
    style: 'Lean into survivability, melee pressure, and protecting the front line.',
  },
  Bard: {
    abilities: ['Charisma', 'Dexterity', 'Constitution'],
    feats: ['Inspiring Leader', 'Actor', 'War Caster', 'Lucky'],
    spells: ['Healing Word', 'Dissonant Whispers', 'Faerie Fire', 'Suggestion'],
    style: 'Lean into support, charm, control, and story-facing choices.',
  },
  Cleric: {
    abilities: ['Wisdom', 'Constitution'],
    feats: ['War Caster', 'Resilient', 'Healer', 'Observant'],
    spells: ['Bless', 'Healing Word', 'Spiritual Weapon', 'Revivify'],
    style: 'Lean into party support, emergency recovery, and reliable concentration.',
  },
  Druid: {
    abilities: ['Wisdom', 'Constitution'],
    feats: ['War Caster', 'Resilient', 'Observant', 'Mobile'],
    spells: ['Entangle', 'Goodberry', 'Healing Word', 'Pass without Trace'],
    style: 'Lean into nature control, utility, healing, and flexible problem-solving.',
  },
  Fighter: {
    abilities: ['Strength or Dexterity', 'Constitution'],
    feats: ['Sentinel', 'Polearm Master', 'Sharpshooter', 'Great Weapon Master'],
    spells: [],
    style: 'Lean into the fighting style, weapon role, and tactical reliability.',
  },
  Monk: {
    abilities: ['Dexterity', 'Wisdom', 'Constitution'],
    feats: ['Mobile', 'Alert', 'Tough', 'Observant'],
    spells: [],
    style: 'Lean into mobility, defence, pressure, and Wisdom-driven discipline.',
  },
  Paladin: {
    abilities: ['Strength', 'Charisma', 'Constitution'],
    feats: ['War Caster', 'Inspiring Leader', 'Sentinel', 'Tough'],
    spells: ['Bless', 'Shield of Faith', 'Find Steed', 'Aid'],
    style: 'Lean into protection, oath identity, smites, and leadership.',
  },
  Ranger: {
    abilities: ['Dexterity', 'Wisdom', 'Constitution'],
    feats: ['Sharpshooter', 'Mobile', 'Alert', 'Observant'],
    spells: ['Hunter’s Mark', 'Goodberry', 'Absorb Elements', 'Pass without Trace'],
    style: 'Lean into exploration, tracking, ranged pressure, and survival utility.',
  },
  Rogue: {
    abilities: ['Dexterity', 'Constitution', 'Intelligence or Charisma'],
    feats: ['Alert', 'Mobile', 'Skulker', 'Lucky'],
    spells: [],
    style: 'Lean into skills, stealth, positioning, and the character’s method of solving problems.',
  },
  Sorcerer: {
    abilities: ['Charisma', 'Constitution'],
    feats: ['War Caster', 'Elemental Adept', 'Metamagic Adept', 'Resilient'],
    spells: ['Shield', 'Mage Armor', 'Misty Step', 'Counterspell'],
    style: 'Lean into signature magic, concentration safety, and a clear spell identity.',
  },
  Warlock: {
    abilities: ['Charisma', 'Constitution', 'Dexterity'],
    feats: ['War Caster', 'Eldritch Adept', 'Actor', 'Resilient'],
    spells: ['Hex', 'Armor of Agathys', 'Misty Step', 'Counterspell'],
    spellSwaps: ['Swap out a spell you rarely cast', 'Replace a low-impact spell with one that fits your pact', 'Pick a spell that benefits from your highest Pact Magic slot'],
    style: 'Lean into patron theme, pact identity, short-rest power, and a small set of iconic spells.',
  },
  Wizard: {
    abilities: ['Intelligence', 'Constitution', 'Dexterity'],
    feats: ['War Caster', 'Observant', 'Resilient', 'Ritual Caster'],
    spells: ['Find Familiar', 'Shield', 'Misty Step', 'Counterspell'],
    style: 'Lean into preparation, rituals, control, and the character’s favourite school of magic.',
  },
};

const LEVEL_UP_CLASS_OPTIONS = {
  Warlock: {
    spellReplacement: {
      key: 'warlock_spell_replacement',
      label: 'Optional known spell swap',
      timing: 'Every Warlock level-up',
      description: 'Offer the player the option to replace one known Warlock spell with another Warlock spell they are allowed to cast.',
      rookPrompt: 'Rook should review spells known, Pact Magic slot level, patron theme, pact boon, backstory, and spells the player rarely uses before suggesting a swap.',
      showWhen: 'level-up-only',
    },
  },
};

const BACKSTORY_HINTS = [
  {
    keywords: ['protect', 'guardian', 'family', 'children', 'shield', 'defend', 'save'],
    suggestions: {
      abilities: ['Constitution', 'Charisma'],
      feats: ['Sentinel', 'Tough', 'Inspiring Leader'],
      spells: ['Bless', 'Shield of Faith', 'Aid', 'Protection from Evil and Good'],
      reason: 'your backstory points toward protecting people and staying standing when others need you.',
    },
  },
  {
    keywords: ['shadow', 'stealth', 'thief', 'spy', 'secret', 'assassin', 'hidden'],
    suggestions: {
      abilities: ['Dexterity', 'Wisdom'],
      feats: ['Alert', 'Skulker', 'Mobile'],
      spells: ['Invisibility', 'Pass without Trace', 'Disguise Self', 'Silence'],
      reason: 'your backstory leans toward stealth, secrets, and acting before enemies realise what happened.',
    },
  },
  {
    keywords: ['book', 'study', 'scholar', 'lore', 'library', 'research', 'teacher'],
    suggestions: {
      abilities: ['Intelligence', 'Wisdom'],
      feats: ['Observant', 'Keen Mind', 'Ritual Caster'],
      spells: ['Identify', 'Detect Magic', 'Comprehend Languages', 'Find Familiar'],
      reason: 'your backstory sounds knowledge-driven, so investigation and utility choices fit the character.',
    },
  },
  {
    keywords: ['healer', 'mercy', 'temple', 'doctor', 'saved', 'wound', 'cure'],
    suggestions: {
      abilities: ['Wisdom', 'Charisma'],
      feats: ['Healer', 'War Caster', 'Inspiring Leader'],
      spells: ['Healing Word', 'Cure Wounds', 'Lesser Restoration', 'Revivify'],
      reason: 'your backstory has a healing or mercy angle, so support options make the build feel personal.',
    },
  },
  {
    keywords: ['revenge', 'vengeance', 'demon', 'devil', 'undead', 'monster', 'patron'],
    suggestions: {
      abilities: ['Charisma', 'Strength', 'Constitution'],
      feats: ['War Caster', 'Great Weapon Master', 'Resilient'],
      spells: ['Hex', 'Hunter’s Mark', 'Protection from Evil and Good', 'Counterspell'],
      reason: 'your backstory points toward hunting a threat or wrestling with dark power, so focused offence and resolve fit well.',
    },
  },
];

function collectFeaturesUpToLevel(progression, level) {
  const safeLevel = clampLevel(level);
  const features = [];
  for (let entryLevel = 1; entryLevel <= safeLevel; entryLevel += 1) {
    (progression?.featuresByLevel?.[entryLevel] || []).forEach(feature => {
      features.push({ level: entryLevel, name: feature });
    });
  }
  return features;
}

function getResourceChange(currentResource, nextResource) {
  if (!nextResource) return null;
  const currentValue = currentResource?.currentValue ?? null;
  const nextValue = nextResource.currentValue ?? null;
  if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) return null;
  return {
    key: nextResource.key,
    label: nextResource.label,
    from: currentValue,
    to: nextValue,
    restore: nextResource.restore,
  };
}

function getSpellSlotChanges(currentSlots = {}, nextSlots = {}) {
  const levels = Array.from(new Set([...Object.keys(currentSlots), ...Object.keys(nextSlots)])).sort((a, b) => Number(a) - Number(b));
  return levels
    .map(slotLevel => ({
      slotLevel: Number(slotLevel),
      from: currentSlots[slotLevel] || 0,
      to: nextSlots[slotLevel] || 0,
    }))
    .filter(change => change.from !== change.to);
}

function getBackstoryText(character = {}) {
  return [
    character.backstory,
    character.personality_traits,
    character.ideals,
    character.bonds,
    character.flaws,
    character.notes,
    character.character_notes,
  ].filter(Boolean).join(' ').toLowerCase();
}

function uniqueLimit(items = [], limit = 4) {
  return Array.from(new Set(items.filter(Boolean))).slice(0, limit);
}

function getClassLevelUpOptions(className = '') {
  return LEVEL_UP_CLASS_OPTIONS[normaliseClassName(className)] || {};
}

function getSpellReplacementOption(className = '', targetLevel = 1) {
  const classOptions = getClassLevelUpOptions(className);
  if (!classOptions.spellReplacement) return null;
  return {
    ...classOptions.spellReplacement,
    targetLevel: clampLevel(targetLevel),
  };
}

export function getPlayerSheetProgression(className = '', level = 1) {
  const normalisedClass = normaliseClassName(className);
  const progression = getClassProgression(normalisedClass);
  const safeLevel = clampLevel(level);
  const snapshot = getProgressionSnapshot(normalisedClass, safeLevel);
  if (!progression || !snapshot) return null;

  return {
    mode: 'character-sheet',
    className: normalisedClass,
    level: safeLevel,
    visibleNowOnly: true,
    principle: 'Show what the player can use now. Keep future choices, subclasses, ASIs, feats, spell swaps, and upcoming class features inside level-up.',
    currentFeatures: collectFeaturesUpToLevel(progression, safeLevel),
    currentResources: snapshot.resources.map(resource => ({
      key: resource.key,
      label: resource.label,
      value: resource.currentValue,
      restore: resource.restore,
    })),
    currentSpellSlots: snapshot.currentSpellSlots,
    hiddenUntilLevelUp: {
      nextLevel: snapshot.nextLevel,
      nextFeatures: snapshot.nextFeatures,
      nextSpellSlots: snapshot.nextSpellSlots,
      spellReplacementOption: getSpellReplacementOption(normalisedClass, safeLevel + 1),
      subclassComingAt: safeLevel < snapshot.subclassLevel ? snapshot.subclassLevel : null,
      nextAsiLevel: snapshot.asiLevels.find(asiLevel => asiLevel > safeLevel) || null,
    },
  };
}

export function getLevelUpProgressionPreview(className = '', currentLevel = 1) {
  const normalisedClass = normaliseClassName(className);
  const safeCurrentLevel = clampLevel(currentLevel);
  const targetLevel = clampLevel(safeCurrentLevel + 1);
  const currentSnapshot = getProgressionSnapshot(normalisedClass, safeCurrentLevel);
  const targetSnapshot = getProgressionSnapshot(normalisedClass, targetLevel);

  if (!currentSnapshot || !targetSnapshot || targetLevel === safeCurrentLevel) return null;

  const resourceChanges = targetSnapshot.resources
    .map(nextResource => getResourceChange(
      currentSnapshot.resources.find(currentResource => currentResource.key === nextResource.key),
      { ...nextResource, currentValue: nextResource.currentValue },
    ))
    .filter(Boolean);

  return {
    mode: 'level-up',
    className: normalisedClass,
    fromLevel: safeCurrentLevel,
    toLevel: targetLevel,
    gainedFeatures: targetSnapshot.currentFeatures,
    willChooseSubclass: targetLevel === targetSnapshot.subclassLevel,
    willChooseAsi: targetSnapshot.asiLevels.includes(targetLevel),
    spellSlotChanges: getSpellSlotChanges(currentSnapshot.currentSpellSlots, targetSnapshot.currentSpellSlots),
    spellReplacementOption: getSpellReplacementOption(normalisedClass, targetLevel),
    resourceChanges,
  };
}

export function getRookLevelUpSuggestions(character = {}, currentLevel = 1) {
  const className = normaliseClassName(character.character_class || character.className || character.class || 'Fighter');
  const classAdvice = CLASS_ADVICE[className] || CLASS_ADVICE.Fighter;
  const backstoryText = getBackstoryText(character);
  const matchingHints = BACKSTORY_HINTS.filter(hint => hint.keywords.some(keyword => backstoryText.includes(keyword)));
  const levelPreview = getLevelUpProgressionPreview(className, currentLevel);
  const spellReplacementOption = levelPreview?.spellReplacementOption || null;

  const abilitySuggestions = uniqueLimit([
    ...matchingHints.flatMap(hint => hint.suggestions.abilities || []),
    ...classAdvice.abilities,
  ], 3);
  const featSuggestions = uniqueLimit([
    ...matchingHints.flatMap(hint => hint.suggestions.feats || []),
    ...classAdvice.feats,
  ], 4);
  const spellSuggestions = uniqueLimit([
    ...matchingHints.flatMap(hint => hint.suggestions.spells || []),
    ...classAdvice.spells,
  ], 4);
  const spellSwapSuggestions = uniqueLimit([
    ...(classAdvice.spellSwaps || []),
    ...spellSuggestions.map(spell => `Consider whether ${spell} fits better than a spell you rarely use`),
  ], 4);

  const suggestions = [
    {
      type: 'ability-score',
      title: 'Ability Score Improvement ideas',
      options: abilitySuggestions,
      reason: matchingHints.length
        ? 'These match both your class needs and the themes Rook spotted in the backstory.'
        : 'These are the safest class-first ability scores to consider.',
      showWhen: 'level-up-only',
    },
    {
      type: 'feat',
      title: 'Feat ideas',
      options: featSuggestions,
      reason: matchingHints.length
        ? 'These feats support the character story as well as the mechanics.'
        : 'These feats commonly support this class role.',
      showWhen: 'level-up-only',
    },
    {
      type: 'spell',
      title: 'Spell ideas',
      options: spellSuggestions,
      reason: spellSuggestions.length
        ? 'These spells are good candidates for the character’s class and story direction.'
        : 'This class does not normally need spell-pick suggestions unless a subclass grants spellcasting.',
      showWhen: 'level-up-only',
    },
  ];

  if (spellReplacementOption) {
    suggestions.push({
      type: 'spell-swap',
      title: 'Known spell swap check',
      options: spellSwapSuggestions,
      reason: `${spellReplacementOption.timing}: ${spellReplacementOption.description}`,
      showWhen: 'level-up-only',
      rookPrompt: spellReplacementOption.rookPrompt,
    });
  }

  return {
    className,
    fromLevel: clampLevel(currentLevel),
    toLevel: levelPreview?.toLevel || Math.min(20, clampLevel(currentLevel) + 1),
    summary: classAdvice.style,
    backstoryReasons: matchingHints.map(hint => hint.suggestions.reason),
    suggestions,
    levelUpContext: levelPreview,
  };
}

export function getProgressionVisibilitySummary(className = '', level = 1) {
  const sheet = getPlayerSheetProgression(className, level);
  const levelUp = getLevelUpProgressionPreview(className, level);
  return {
    className: normaliseClassName(className),
    level: clampLevel(level),
    validClass: CLASS_NAMES_2014.includes(normaliseClassName(className)),
    sheet,
    levelUp,
  };
}

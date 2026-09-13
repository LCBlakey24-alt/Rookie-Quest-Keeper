const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const clamp = (value, max = Infinity) => arr(value).slice(0, max);
const lower = (value = '') => String(value || '').toLowerCase();
const editionFor = (edition = '2014') => String(edition || '2014').includes('2024') ? '2024' : '2014';

export const SKILL_OPTIONS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

export const WIZARD_SCHOLAR_SKILLS = [
  'Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Religion',
];

export const STANDARD_LANGUAGE_OPTIONS_2024 = [
  'Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant',
  'Gnomish', 'Goblin', 'Halfling', 'Orc',
];

export const RARE_LANGUAGE_OPTIONS_2024 = [
  'Abyssal', 'Celestial', 'Deep Speech', 'Druidic', 'Infernal',
  'Primordial', 'Sylvan', 'Thieves’ Cant', 'Undercommon',
];

const LEGACY_BUILTIN_SPECIES_LANGUAGES = {
  human: ['Common'],
  elf: ['Common', 'Elvish'],
  dwarf: ['Common', 'Dwarvish'],
  halfling: ['Common', 'Halfling'],
  gnome: ['Common', 'Gnomish'],
  'half-orc': ['Common', 'Orc'],
  'half-elf': ['Common', 'Elvish'],
  tiefling: ['Common', 'Infernal'],
  aasimar: ['Common', 'Celestial'],
  goliath: ['Common', 'Giant'],
  orc: ['Common', 'Orc'],
};

export const FIGHTING_STYLE_OPTIONS = [
  'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting',
  'Blind Fighting', 'Interception', 'Thrown Weapon Fighting', 'Unarmed Fighting',
];

export const METAMAGIC_OPTIONS = [
  'Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell', 'Heightened Spell',
  'Quickened Spell', 'Subtle Spell', 'Twinned Spell', 'Seeking Spell', 'Transmuted Spell',
];

export const MANEUVER_OPTIONS = [
  'Ambush', 'Bait and Switch', 'Brace', 'Commanding Presence', 'Commander’s Strike',
  'Disarming Attack', 'Distracting Strike', 'Evasive Footwork', 'Feinting Attack',
  'Goading Attack', 'Grappling Strike', 'Lunging Attack', 'Maneuvering Attack',
  'Menacing Attack', 'Parry', 'Precision Attack', 'Pushing Attack', 'Quick Toss',
  'Rally', 'Riposte', 'Sweeping Attack', 'Tactical Assessment', 'Trip Attack',
];

function fightingStyleTarget(className, level) {
  if (className === 'Fighter' && level >= 1) return 1;
  if (className === 'Paladin' && level >= 2) return 1;
  if (className === 'Ranger' && level >= 2) return 1;
  return 0;
}

function expertiseTarget(className, level, edition) {
  const rulesEdition = editionFor(edition);

  if (className === 'Rogue') return level >= 6 ? 4 : level >= 1 ? 2 : 0;

  if (className === 'Bard') {
    if (rulesEdition === '2024') return level >= 9 ? 4 : level >= 2 ? 2 : 0;
    return level >= 10 ? 4 : level >= 3 ? 2 : 0;
  }

  if (rulesEdition === '2024' && className === 'Ranger') {
    return level >= 9 ? 3 : level >= 2 ? 1 : 0;
  }

  if (rulesEdition === '2024' && className === 'Wizard') {
    return level >= 2 ? 1 : 0;
  }

  return 0;
}

function expertiseOptions(className, edition) {
  if (editionFor(edition) === '2024' && className === 'Wizard') return WIZARD_SCHOLAR_SKILLS;
  return SKILL_OPTIONS;
}

function metamagicTarget(className, level, edition) {
  if (className !== 'Sorcerer') return 0;
  if (editionFor(edition) === '2024') {
    if (level < 2) return 0;
    if (level >= 17) return 6;
    if (level >= 10) return 4;
    return 2;
  }
  if (level < 3) return 0;
  if (level >= 17) return 4;
  if (level >= 10) return 3;
  return 2;
}

function originLanguageTarget(edition) {
  return editionFor(edition) === '2024' ? 2 : 0;
}

function fixedOriginLanguages(edition) {
  return editionFor(edition) === '2024' ? ['Common'] : [];
}

function classLanguageTarget(className, level, edition) {
  if (editionFor(edition) !== '2024') return 0;
  if (className === 'Ranger' && level >= 2) return 2;
  if (className === 'Rogue' && level >= 1) return 1;
  return 0;
}

function fixedClassLanguages(className, level, edition) {
  if (editionFor(edition) === '2024' && className === 'Rogue' && level >= 1) return ['Thieves’ Cant'];
  return [];
}

function classLanguageOptions(className, level, edition) {
  const fixed = new Set(fixedClassLanguages(className, level, edition).map(lower));
  return [...STANDARD_LANGUAGE_OPTIONS_2024, ...RARE_LANGUAGE_OPTIONS_2024]
    .filter((language) => !fixed.has(lower(language)));
}

function maneuverTarget(className, level, subclassName = '') {
  if (className !== 'Fighter' || !lower(subclassName).includes('battle master') || level < 3) return 0;
  if (level >= 15) return 9;
  if (level >= 10) return 7;
  if (level >= 7) return 5;
  return 3;
}

function clearFields(target, fields = []) {
  fields.forEach((field) => {
    delete target[field];
  });
}

function removeGeneratedClassChoiceFeatures(features, removers = []) {
  if (!removers.length) return features;
  return arr(features).filter((feature) => {
    const name = feature?.name || feature || '';
    const source = feature?.source || '';
    return !removers.some((remove) => remove(name, source));
  });
}

function uniqueStrings(values = []) {
  const seen = new Set();
  return arr(values).filter((value) => {
    const key = lower(value).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isLanguagePlaceholder(value = '') {
  return /\b(choice|choose|additional|extra)\b/i.test(String(value || ''));
}

function preserved2024LanguageGrants(payload = {}) {
  const existing = uniqueStrings(payload.languages).filter((language) => !isLanguagePlaceholder(language));
  const raceKey = lower(payload.race || payload.species || '').trim();
  const legacy = LEGACY_BUILTIN_SPECIES_LANGUAGES[raceKey];
  if (!legacy) return existing;
  const legacySet = new Set(legacy.map(lower));
  return existing.filter((language) => !legacySet.has(lower(language)));
}

export function buildClassSpecificChoicePlan({ className = '', level = 1, subclassName = '', edition = '2014' } = {}) {
  const numericLevel = Math.max(1, Math.min(20, Number(level || 1)));
  const rulesEdition = editionFor(edition);
  const fightingStyles = fightingStyleTarget(className, numericLevel);
  const expertise = expertiseTarget(className, numericLevel, rulesEdition);
  const metamagic = metamagicTarget(className, numericLevel, rulesEdition);
  const originLanguages = originLanguageTarget(rulesEdition);
  const fixedOrigin = fixedOriginLanguages(rulesEdition);
  const languages = classLanguageTarget(className, numericLevel, rulesEdition);
  const fixedLanguages = fixedClassLanguages(className, numericLevel, rulesEdition);
  const maneuvers = maneuverTarget(className, numericLevel, subclassName);

  return {
    className,
    level: numericLevel,
    edition: rulesEdition,
    subclassName,
    fightingStyleTarget: fightingStyles,
    expertiseTarget: expertise,
    metamagicTarget: metamagic,
    originLanguageTarget: originLanguages,
    fixedOriginLanguages: fixedOrigin,
    languageTarget: languages,
    fixedLanguages,
    maneuverTarget: maneuvers,
    hasChoices: Boolean(
      fightingStyles || expertise || metamagic || originLanguages || languages || maneuvers
      || fixedOrigin.length || fixedLanguages.length
    ),
    options: {
      fightingStyles: FIGHTING_STYLE_OPTIONS,
      expertiseSkills: expertiseOptions(className, rulesEdition),
      metamagic: METAMAGIC_OPTIONS,
      originLanguages: STANDARD_LANGUAGE_OPTIONS_2024,
      languages: classLanguageOptions(className, numericLevel, rulesEdition),
      maneuvers: MANEUVER_OPTIONS,
    },
  };
}

export function normaliseClassSpecificSelection(selection = {}, plan = {}) {
  const originOptions = new Set(arr(plan.options?.originLanguages).map(lower));
  const selectedOriginLanguages = uniqueStrings(selection.originLanguages || selection.origin_language_choices)
    .filter((language) => originOptions.has(lower(language)));
  const originBlocked = new Set([
    ...arr(plan.fixedOriginLanguages),
    ...selectedOriginLanguages,
  ].map(lower));

  const languageOptions = new Set(arr(plan.options?.languages).map(lower));
  const fixed = new Set(arr(plan.fixedLanguages).map(lower));
  const selectedLanguages = uniqueStrings(selection.languages || selection.language_choices)
    .filter((language) => languageOptions.has(lower(language)) && !fixed.has(lower(language)) && !originBlocked.has(lower(language)));

  return {
    fightingStyles: clamp(selection.fightingStyles || selection.fighting_styles, plan.fightingStyleTarget || 0),
    expertise: clamp(selection.expertise || selection.expertise_choices, plan.expertiseTarget || 0),
    metamagic: clamp(selection.metamagic || selection.metamagic_options, plan.metamagicTarget || 0),
    originLanguages: clamp(selectedOriginLanguages, plan.originLanguageTarget || 0),
    languages: clamp(selectedLanguages, plan.languageTarget || 0),
    maneuvers: clamp(selection.maneuvers || selection.combat_maneuvers, plan.maneuverTarget || 0),
  };
}

function addFeature(features, name, description) {
  const existing = arr(features);
  if (existing.some((feature) => (feature?.name || feature) === name)) return existing;
  return [...existing, { name, description, source: 'starting-level choice' }];
}

export function applyClassSpecificChoicesToPayload(payload, selection = {}, plan = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  const current = normaliseClassSpecificSelection(selection, plan);
  const featureRemovers = [];

  if (!current.fightingStyles.length) {
    clearFields(next, ['fighting_styles', 'fighting_style']);
    featureRemovers.push((name, source) => source === 'starting-level choice' && String(name).startsWith('Fighting Style:'));
  }
  if (!current.expertise.length) {
    clearFields(next, ['expertise_choices', 'expertise']);
  }
  if (!current.metamagic.length) {
    clearFields(next, ['metamagic_options', 'metamagic']);
    if (plan.className !== 'Sorcerer') clearFields(next, ['sorcery_points', 'sorcery_points_remaining']);
  }
  if (!current.originLanguages.length) {
    clearFields(next, ['origin_language_choices']);
  }
  if (!current.languages.length) {
    clearFields(next, ['class_language_choices']);
  }
  if (!current.maneuvers.length) {
    clearFields(next, ['combat_maneuvers', 'battle_master_maneuvers', 'maneuvers', 'superiority_dice']);
    featureRemovers.push((name, source) => source === 'starting-level choice' && name === 'Combat Superiority');
  }

  if (featureRemovers.length) {
    next.class_features = removeGeneratedClassChoiceFeatures(next.class_features, featureRemovers);
  }

  if (current.fightingStyles.length) {
    next.fighting_styles = current.fightingStyles;
    next.fighting_style = current.fightingStyles[0];
    current.fightingStyles.forEach((style) => {
      next.class_features = addFeature(next.class_features, `Fighting Style: ${style}`, 'Class fighting style selected during starting-level creation.');
    });
  }

  if (current.expertise.length) {
    next.expertise_choices = current.expertise;
    next.expertise = current.expertise;
  }

  if (current.metamagic.length) {
    next.metamagic_options = current.metamagic;
    next.metamagic = current.metamagic;
    next.sorcery_points = Math.max(Number(next.sorcery_points || 0), Number(plan.level || next.level || 0));
    next.sorcery_points_remaining = next.sorcery_points;
  }

  if (plan.edition === '2024') {
    const preserved = preserved2024LanguageGrants(next);
    next.origin_language_choices = current.originLanguages;
    next.languages = uniqueStrings([
      ...arr(plan.fixedOriginLanguages),
      ...current.originLanguages,
      ...preserved,
    ]);
  }

  const classLanguages = uniqueStrings([...arr(plan.fixedLanguages), ...current.languages]);
  if (classLanguages.length) {
    next.class_language_choices = current.languages;
    next.languages = uniqueStrings([...arr(next.languages), ...classLanguages]);
  }

  if (current.maneuvers.length) {
    next.combat_maneuvers = current.maneuvers;
    next.maneuvers = current.maneuvers;
    next.superiority_dice = {
      die: Number(plan.level || next.level || 0) >= 10 ? 'd10' : 'd8',
      total: Number(plan.level || next.level || 0) >= 15 ? 6 : 4,
      remaining: Number(plan.level || next.level || 0) >= 15 ? 6 : 4,
    };
    next.class_features = addFeature(next.class_features, 'Combat Superiority', 'Battle Master maneuvers selected during starting-level creation.');
  }

  return next;
}

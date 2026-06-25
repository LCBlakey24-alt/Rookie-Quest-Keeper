import {
  CLASS_NAMES_2014,
  clampLevel,
  getClassProgression,
  getLevelFeatures,
  normaliseClassName,
} from './classProgressions2014';

const FIGHTING_STYLE_LEVELS_2014 = {
  Fighter: 1,
  Paladin: 2,
  Ranger: 2,
};

const KNOWN_SPELLCASTERS_2014 = new Set(['Bard', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']);
const PREPARED_SPELLCASTERS_2014 = new Set(['Cleric', 'Druid', 'Paladin']);
const SPELL_SWAP_CLASSES_2014 = new Set(['Bard', 'Ranger', 'Sorcerer', 'Warlock']);

function createChoice({ level, type, title, description, required = true, options = [], rook = null }) {
  return {
    id: `${type}-${level}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    level,
    type,
    title,
    description,
    required,
    options,
    rook,
    status: 'todo',
  };
}

function featureMentions(features = [], terms = []) {
  const text = features.join(' ').toLowerCase();
  return terms.some(term => text.includes(term.toLowerCase()));
}

function getSpellChoiceForLevel(className, level, features) {
  if (!featureMentions(features, ['spellcasting', 'spells', 'level spells'])) return null;

  if (PREPARED_SPELLCASTERS_2014.has(className)) {
    return createChoice({
      level,
      type: 'spell-preparation',
      title: 'Prepare spells for this level',
      description: `${className} prepares spells rather than locking every spell choice permanently. Let the player pick their current prepared list for play, but remind them it can change by class rules.`,
      required: level === 1,
      rook: 'Suggest prepared spells based on party role, backstory, expected campaign tone, and ability score modifier.',
    });
  }

  if (KNOWN_SPELLCASTERS_2014.has(className)) {
    return createChoice({
      level,
      type: 'spell-known',
      title: level === 1 ? 'Choose starting spells' : 'Review spell gains',
      description: `Check whether ${className} gains new spells known, cantrips, or higher spell levels by this point.`,
      required: true,
      rook: 'Suggest spells that match the character story and fill missing combat, utility, or support gaps.',
    });
  }

  return null;
}

function getSpellSwapChoiceForLevel(className, level) {
  if (!SPELL_SWAP_CLASSES_2014.has(className) || level <= 1) return null;
  return createChoice({
    level,
    type: 'spell-swap',
    title: 'Optional known spell swap',
    description: `${className} may be able to replace one known spell during level-up. Offer this as optional so players do not miss it.`,
    required: false,
    rook: 'Review spells rarely used, new slot level, class theme, subclass, pact/patron if relevant, and the backstory before suggesting a swap.',
  });
}

export function getStartingLevelChoicePlan(className = '', startingLevel = 1) {
  const normalisedClass = normaliseClassName(className);
  const targetLevel = clampLevel(startingLevel);
  const progression = getClassProgression(normalisedClass);

  if (!progression || !CLASS_NAMES_2014.includes(normalisedClass)) {
    return {
      className: normalisedClass || className,
      startingLevel: targetLevel,
      validClass: false,
      choices: [],
      requiredCount: 0,
      optionalCount: 0,
      summary: 'Choose a supported class to generate starting-level choices.',
    };
  }

  const choices = [];

  const fightingStyleLevel = FIGHTING_STYLE_LEVELS_2014[normalisedClass];
  if (fightingStyleLevel && targetLevel >= fightingStyleLevel) {
    choices.push(createChoice({
      level: fightingStyleLevel,
      type: 'fighting-style',
      title: 'Choose Fighting Style',
      description: `${normalisedClass} gains a Fighting Style by level ${fightingStyleLevel}.`,
      rook: 'Suggest a style based on weapon choice, armour plan, and party role.',
    }));
  }

  if (targetLevel >= progression.subclassLevel) {
    choices.push(createChoice({
      level: progression.subclassLevel,
      type: 'subclass',
      title: 'Choose subclass',
      description: `${normalisedClass} chooses its subclass at level ${progression.subclassLevel}.`,
      rook: 'Suggest subclass options that match backstory, role, preferred mechanics, and campaign tone.',
    }));
  }

  progression.asiLevels
    .filter(level => level <= targetLevel)
    .forEach(level => {
      choices.push(createChoice({
        level,
        type: 'asi-or-feat',
        title: 'Ability Score Improvement or feat',
        description: `At level ${level}, choose ability score increases or a feat if feats are allowed in the campaign.`,
        rook: 'Suggest ASI or feat options based on current ability scores, class needs, backstory, and table rules.',
      }));
    });

  for (let level = 1; level <= targetLevel; level += 1) {
    const features = getLevelFeatures(normalisedClass, level);

    const spellChoice = getSpellChoiceForLevel(normalisedClass, level, features);
    if (spellChoice) choices.push(spellChoice);

    const spellSwapChoice = getSpellSwapChoiceForLevel(normalisedClass, level);
    if (spellSwapChoice) choices.push(spellSwapChoice);

    if (featureMentions(features, ['expertise'])) {
      choices.push(createChoice({
        level,
        type: 'expertise',
        title: 'Choose Expertise',
        description: `${normalisedClass} gains or improves Expertise at this level.`,
        rook: 'Suggest expertise based on class role, backstory, and most-used skills.',
      }));
    }

    if (featureMentions(features, ['metamagic'])) {
      choices.push(createChoice({
        level,
        type: 'metamagic',
        title: 'Choose Metamagic',
        description: 'Choose Metamagic options for this Sorcerer.',
        rook: 'Suggest metamagic based on spell choices and preferred combat style.',
      }));
    }

    if (featureMentions(features, ['magical secrets'])) {
      choices.push(createChoice({
        level,
        type: 'magical-secrets',
        title: 'Choose Magical Secrets spells',
        description: 'Choose spells from outside the Bard list.',
        rook: 'Suggest missing role coverage, iconic story picks, and campaign-relevant utility spells.',
      }));
    }

    if (featureMentions(features, ['eldritch invocation'])) {
      choices.push(createChoice({
        level,
        type: 'invocation',
        title: 'Choose or review Eldritch Invocations',
        description: 'Warlocks should choose and review invocations as they level.',
        rook: 'Suggest invocations based on pact boon, combat pattern, and character theme.',
      }));
    }
  }

  const sortedChoices = choices.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

  return {
    className: normalisedClass,
    startingLevel: targetLevel,
    validClass: true,
    choices: sortedChoices,
    requiredCount: sortedChoices.filter(choice => choice.required).length,
    optionalCount: sortedChoices.filter(choice => !choice.required).length,
    summary: targetLevel === 1
      ? `${normalisedClass} starts at level 1, so only normal creation choices are needed.`
      : `${normalisedClass} starts at level ${targetLevel}, so the builder should collect all level 1-${targetLevel} choices before final review.`,
  };
}

export function getStartingLevelOptions() {
  return Array.from({ length: 20 }, (_, index) => index + 1);
}

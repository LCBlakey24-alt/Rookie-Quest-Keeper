import { BACKGROUNDS, CLASSES, RACES } from './characterRules5e';
import { rollAbilityScoreSet } from './abilityScoreRolls';
import { EXTRA_LANGUAGE_OPTIONS, countChoiceLanguages, getFixedLanguages } from './languageChoiceUtils';
import { getBackgroundLanguageBudget } from './languageFullBuilderHelpers';
import { getStartingEquipmentGroups } from './startingEquipmentRules';
import { buildStartingLevelChoicePlan } from './startingLevelChoiceEngine';
import { buildClassSpecificChoicePlan } from './classSpecificChoiceEngine';
import { getWarlockBuilderOptions } from './warlockBuilderOptions';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];
const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');

function boundedRandom(rng = Math.random) {
  const value = Number(rng());
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 0.9999999999999999);
}

export function randomIndex(length, rng = Math.random) {
  const size = Math.max(0, Math.floor(Number(length) || 0));
  if (!size) return -1;
  return Math.floor(boundedRandom(rng) * size);
}

export function pickRandom(options = [], rng = Math.random) {
  const list = arr(options);
  const index = randomIndex(list.length, rng);
  return index >= 0 ? list[index] : null;
}

export function sampleUnique(options = [], count = 1, rng = Math.random) {
  const pool = Array.from(new Set(arr(options)));
  const target = Math.max(0, Math.min(pool.length, Math.floor(Number(count) || 0)));
  const chosen = [];

  for (let index = 0; index < target; index += 1) {
    const pickIndex = randomIndex(pool.length, rng);
    chosen.push(pool.splice(pickIndex, 1)[0]);
  }

  return chosen;
}

export function shuffleRandom(options = [], rng = Math.random) {
  const pool = [...arr(options)];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, rng);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
}

function classSkillOptions(classData = {}) {
  return classData.skillChoices === 'any' ? ALL_SKILLS : arr(classData.skillChoices);
}

function randomAbilityScores(rng) {
  const rolled = rollAbilityScoreSet(6, rng).map((entry) => entry.total);
  const shuffledScores = shuffleRandom(rolled, rng);
  return Object.fromEntries(ABILITIES.map((ability, index) => [ability, shuffledScores[index]]));
}

function randomLanguageChoices({ raceData = {}, subrace = '', backgroundData = {}, rng }) {
  const raceEntries = [...arr(raceData.languages), ...arr(raceData.subraces?.[subrace]?.languages)];
  const fixed = getFixedLanguages(raceEntries);
  const raceChoiceCount = countChoiceLanguages(raceEntries);
  const raceChosenLanguages = sampleUnique(
    EXTRA_LANGUAGE_OPTIONS.filter((language) => !fixed.includes(language)),
    raceChoiceCount,
    rng,
  );

  const backgroundBudget = getBackgroundLanguageBudget(backgroundData);
  const blocked = new Set([...fixed, ...raceChosenLanguages]);
  const backgroundChosenLanguages = sampleUnique(
    EXTRA_LANGUAGE_OPTIONS.filter((language) => !blocked.has(language)),
    backgroundBudget,
    rng,
  );

  return { raceChosenLanguages, backgroundChosenLanguages, fixedLanguages: fixed };
}

function randomEquipmentChoices(className, rng) {
  return Object.fromEntries(
    getStartingEquipmentGroups(className)
      .filter((group) => arr(group.options).length)
      .map((group) => [group.id, pickRandom(group.options, rng)]),
  );
}

function randomSpellSelection(spellPlan = {}, rng) {
  const cantrips = sampleUnique(
    arr(spellPlan.cantripOptions).map(displayName),
    Number(spellPlan.cantripTarget || 0),
    rng,
  );
  const permanentTarget = spellPlan.spellSelectionMode === 'spellbook'
    ? Number(spellPlan.spellbookTarget || 0)
    : Number(spellPlan.knownTarget || 0);
  const spells = sampleUnique(
    arr(spellPlan.spellOptions).map(displayName),
    permanentTarget,
    rng,
  );

  let prepared = [];
  if (Number(spellPlan.preparedTarget || 0) > 0) {
    const preparedPool = spells.length >= Number(spellPlan.preparedTarget || 0)
      ? spells
      : arr(spellPlan.spellOptions).map(displayName);
    prepared = sampleUnique(preparedPool, Number(spellPlan.preparedTarget || 0), rng);
  }

  return { cantrips, spells, prepared };
}

function randomClassSpecificSelection({
  className,
  level,
  edition,
  subclass,
  proficientSkills,
  blockedLanguages,
  rng,
}) {
  const plan = buildClassSpecificChoicePlan({
    className,
    level,
    edition,
    subclassName: subclass,
  });

  const expertisePool = arr(plan.options?.expertiseSkills).filter((skill) => proficientSkills.includes(skill));
  const safeExpertisePool = expertisePool.length >= Number(plan.expertiseTarget || 0)
    ? expertisePool
    : arr(plan.options?.expertiseSkills);

  const originLanguages = sampleUnique(
    arr(plan.options?.originLanguages).filter((language) => !blockedLanguages.has(language)),
    Number(plan.originLanguageTarget || 0),
    rng,
  );
  const classLanguageBlocked = new Set([
    ...blockedLanguages,
    ...arr(plan.fixedOriginLanguages),
    ...originLanguages,
    ...arr(plan.fixedLanguages),
  ]);
  const languages = sampleUnique(
    arr(plan.options?.languages).filter((language) => !classLanguageBlocked.has(language)),
    Number(plan.languageTarget || 0),
    rng,
  );

  return {
    plan,
    selection: {
      fightingStyles: sampleUnique(plan.options?.fightingStyles, Number(plan.fightingStyleTarget || 0), rng),
      expertise: sampleUnique(safeExpertisePool, Number(plan.expertiseTarget || 0), rng),
      metamagic: sampleUnique(plan.options?.metamagic, Number(plan.metamagicTarget || 0), rng),
      originLanguages,
      languages,
      maneuvers: sampleUnique(plan.options?.maneuvers, Number(plan.maneuverTarget || 0), rng),
    },
  };
}

function randomWarlockSelection(level, edition, rng) {
  const options = getWarlockBuilderOptions({ level, edition });
  const selected = [];
  const details = [...arr(options.invocationOptionDetails)];

  while (selected.length < Number(options.invocationCount || 0)) {
    const eligible = details.filter((option) => {
      if (selected.includes(option.name)) return false;
      if (!option.requiresInvocation) return true;
      return selected.includes(option.requiresInvocation);
    });
    if (!eligible.length) break;
    const choice = pickRandom(eligible, rng);
    if (!choice) break;
    selected.push(choice.name);
  }

  return {
    pactBoon: options.pactBoonRequired
      ? displayName(pickRandom(options.pactBoonOptions, rng))
      : '',
    invocations: selected,
  };
}

function reveal(id, label, options, selected, meta = {}) {
  return {
    id,
    label,
    options: arr(options).map(displayName).filter(Boolean),
    selected,
    ...meta,
  };
}

export function buildRandomCharacterPlan({
  edition = '2014',
  startingLevel = 1,
  rng = Math.random,
  name = '',
} = {}) {
  const rulesEdition = String(edition).includes('2024') ? '2024' : '2014';
  const level = Math.max(1, Math.min(20, Math.floor(Number(startingLevel) || 1)));
  const classNames = Object.keys(CLASSES);
  const raceNames = Object.keys(RACES);
  const backgroundNames = Object.keys(BACKGROUNDS);

  const characterClass = pickRandom(classNames, rng) || 'Fighter';
  const race = pickRandom(raceNames, rng) || 'Human';
  const background = pickRandom(backgroundNames, rng) || 'Soldier';
  const classData = CLASSES[characterClass] || {};
  const raceData = RACES[race] || {};
  const backgroundData = BACKGROUNDS[background] || {};
  const subraceOptions = Object.keys(raceData.subraces || {});
  const subrace = subraceOptions.length ? pickRandom(subraceOptions, rng) || '' : '';
  const scores = randomAbilityScores(rng);

  const startingLevelPlan = buildStartingLevelChoicePlan({
    className: characterClass,
    startingLevel: level,
    edition: rulesEdition,
    abilities: scores,
  });

  const warlockOptions = characterClass === 'Warlock'
    ? getWarlockBuilderOptions({ level, edition: rulesEdition })
    : null;
  const subclassRequired = characterClass === 'Warlock'
    ? Boolean(warlockOptions?.subclassRequired)
    : arr(startingLevelPlan.subclassChoices).length > 0;
  const subclassOptions = characterClass === 'Warlock'
    ? arr(warlockOptions?.subclassOptions).map(displayName)
    : arr(classData.subclasses).map(displayName);
  const subclass = subclassRequired ? pickRandom(subclassOptions, rng) || '' : '';

  const backgroundSkills = arr(backgroundData.skillProficiencies);
  const availableClassSkills = classSkillOptions(classData).filter((skill) => !backgroundSkills.includes(skill));
  const selectedSkills = sampleUnique(availableClassSkills, Number(classData.skillCount || 0), rng);
  const proficientSkills = Array.from(new Set([...backgroundSkills, ...selectedSkills]));

  const languages = randomLanguageChoices({ raceData, subrace, backgroundData, rng });
  const fixedAndDraftLanguages = new Set([
    ...languages.fixedLanguages,
    ...languages.raceChosenLanguages,
    ...languages.backgroundChosenLanguages,
  ]);

  const floatingBudget = rulesEdition === '2014' ? Number(raceData.asi2014?.choice || 0) : 0;
  const floatingAbilities = sampleUnique(ABILITIES, floatingBudget, rng);
  const floatingAsi = Object.fromEntries(floatingAbilities.map((ability) => [ability, 1]));

  const classSpecific = randomClassSpecificSelection({
    className: characterClass,
    level,
    edition: rulesEdition,
    subclass,
    proficientSkills,
    blockedLanguages: fixedAndDraftLanguages,
    rng,
  });
  const spells = randomSpellSelection(startingLevelPlan.spellPlan, rng);
  const warlock = characterClass === 'Warlock' ? randomWarlockSelection(level, rulesEdition, rng) : { pactBoon: '', invocations: [] };

  const levelChoices = Object.fromEntries(
    arr(startingLevelPlan.asiChoices).map((choice) => {
      const abilityOne = pickRandom(ABILITIES, rng) || 'strength';
      const abilityTwo = pickRandom(ABILITIES, rng) || abilityOne;
      return [choice.id, {
        mode: 'asi',
        abilityOne,
        abilityTwo,
        featName: '',
        featAbilityChoices: [],
        featAbilityScoreIncrease: null,
      }];
    }),
  );

  const startingEquipmentChoices = randomEquipmentChoices(characterClass, rng);
  const fighterFightingStyle = characterClass === 'Fighter'
    ? classSpecific.selection.fightingStyles[0] || ''
    : '';

  const draftPatch = {
    name,
    edition: rulesEdition,
    startingLevel: level,
    race,
    subrace,
    characterClass,
    subclass,
    fighterFightingStyle,
    background,
    alignment: pickRandom(ALIGNMENTS, rng) || 'Neutral',
    scores,
    floatingAsi,
    selectedSkills,
    selectedCantrips: spells.cantrips,
    selectedSpells: spells.spells.length ? spells.spells : spells.prepared,
    raceChosenLanguages: languages.raceChosenLanguages,
    backgroundChosenLanguages: languages.backgroundChosenLanguages,
    preservedLanguages: [],
    extraFeat: 'None',
    equipmentMode: 'equipment',
    startingEquipmentChoices,
    rolledStartingGold: 0,
  };

  const revealSequence = [
    reveal('class', 'Class', classNames, characterClass),
    reveal('species', rulesEdition === '2024' ? 'Species' : 'Race', raceNames, race),
  ];
  if (subraceOptions.length) revealSequence.push(reveal('subrace', 'Species option', subraceOptions, subrace));
  revealSequence.push(reveal('background', 'Background', backgroundNames, background));
  if (subclassRequired && subclassOptions.length) revealSequence.push(reveal('subclass', 'Subclass', subclassOptions, subclass, { level }));
  if (selectedSkills.length) revealSequence.push(reveal('skills', 'Class skills', availableClassSkills, selectedSkills));
  if (fighterFightingStyle) revealSequence.push(reveal('fighting-style', 'Fighting style', classSpecific.plan.options?.fightingStyles, fighterFightingStyle));
  revealSequence.push(reveal('abilities', 'Ability scores', ABILITIES.map((ability) => ability.toUpperCase()), ABILITIES.map((ability) => `${ability.toUpperCase()} ${scores[ability]}`)));
  if (languages.raceChosenLanguages.length) revealSequence.push(reveal('species-languages', 'Species languages', EXTRA_LANGUAGE_OPTIONS, languages.raceChosenLanguages));
  if (languages.backgroundChosenLanguages.length) revealSequence.push(reveal('background-languages', 'Background languages', EXTRA_LANGUAGE_OPTIONS, languages.backgroundChosenLanguages));
  Object.entries(startingEquipmentChoices).forEach(([groupId, selected]) => {
    const group = getStartingEquipmentGroups(characterClass).find((item) => item.id === groupId);
    revealSequence.push(reveal(`equipment-${groupId}`, group?.label || 'Equipment', group?.options || [], selected));
  });
  if (spells.cantrips.length) revealSequence.push(reveal('cantrips', 'Cantrips', startingLevelPlan.spellPlan?.cantripOptions, spells.cantrips));
  if (spells.spells.length || spells.prepared.length) revealSequence.push(reveal('spells', 'Spells', startingLevelPlan.spellPlan?.spellOptions, spells.spells.length ? spells.spells : spells.prepared));
  arr(startingLevelPlan.asiChoices).forEach((choice) => {
    const selected = levelChoices[choice.id];
    revealSequence.push(reveal(choice.id, choice.label, ABILITIES, [selected.abilityOne, selected.abilityTwo], { level: choice.level }));
  });
  if (classSpecific.selection.expertise.length) revealSequence.push(reveal('expertise', 'Expertise', classSpecific.plan.options?.expertiseSkills, classSpecific.selection.expertise));
  if (classSpecific.selection.metamagic.length) revealSequence.push(reveal('metamagic', 'Metamagic', classSpecific.plan.options?.metamagic, classSpecific.selection.metamagic));
  if (classSpecific.selection.maneuvers.length) revealSequence.push(reveal('maneuvers', 'Battle Master manoeuvres', classSpecific.plan.options?.maneuvers, classSpecific.selection.maneuvers));
  if (warlock.pactBoon) revealSequence.push(reveal('pact-boon', 'Pact Boon', warlockOptions?.pactBoonOptions, warlock.pactBoon));
  if (warlock.invocations.length) revealSequence.push(reveal('invocations', 'Eldritch Invocations', warlockOptions?.eligibleInvocationOptions, warlock.invocations));

  const detailChoices = {
    spells,
    classSpecific: classSpecific.selection,
    warlock,
  };

  return {
    edition: rulesEdition,
    startingLevel: level,
    draftPatch,
    revealSequence,
    levelChoices,
    detailChoices,
    metadata: {
      subclassRequired,
      spellPlan: startingLevelPlan.spellPlan,
      classSpecificPlan: classSpecific.plan,
      warlockOptions,
    },
  };
}

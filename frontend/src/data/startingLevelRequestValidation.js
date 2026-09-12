import { CLASSES } from './characterRules5e';
import { buildClassSpecificChoicePlan, normaliseClassSpecificSelection } from './classSpecificChoiceEngine';
import {
  buildStartingLevelChoicePlan,
  defaultAsiSelection,
  normaliseSpellSelection,
  normaliseWarlockSelection,
} from './startingLevelChoiceEngine';

export const STARTING_LEVEL_CHOICE_STORAGE_KEY = 'rqk.full_character_creator_v2.level_choices';
export const STARTING_LEVEL_DETAIL_STORAGE_KEY = 'rqk.full_character_creator_v2.detail_choices';

const SUBCLASS_LEVEL_2014 = {
  Barbarian: 3,
  Bard: 3,
  Cleric: 1,
  Druid: 2,
  Fighter: 3,
  Monk: 3,
  Paladin: 3,
  Ranger: 3,
  Rogue: 3,
  Sorcerer: 1,
  Warlock: 1,
  Wizard: 2,
};

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function readRulesEdition(payload = {}) {
  const explicit = String(payload.edition || payload.rules_edition || payload.ruleset_id || '2014');
  return explicit.includes('2024') ? '2024' : '2014';
}

function readClassName(payload = {}) {
  return payload.character_class || payload.class_name || payload.class || '';
}

function subclassUnlockLevel(className, edition, classData = {}) {
  if (edition === '2024') return 3;
  return Number(classData.subclassLevel || classData.subclass_level || SUBCLASS_LEVEL_2014[className] || 3);
}

function displayName(value) {
  return typeof value === 'string' ? value : value?.name || value?.title || '';
}

function requiredSubclass(payload, level, edition, className, classData) {
  const subclassOptions = arr(classData?.subclasses).map(displayName).filter(Boolean);
  if (!subclassOptions.length) return false;
  return level >= subclassUnlockLevel(className, edition, classData);
}

function validateAsiChoices(plan, selections, blockers) {
  plan.asiChoices.forEach((choice) => {
    const raw = selections?.[choice.id];
    if (!raw) {
      blockers.push(`Choose the level ${choice.level} ASI or feat.`);
      return;
    }

    const selection = defaultAsiSelection(raw);
    if (selection.mode === 'feat') {
      if (!selection.featName) blockers.push(`Choose the feat for level ${choice.level}.`);
      return;
    }

    if (!selection.abilityOne || !selection.abilityTwo) {
      blockers.push(`Finish the ability score increase for level ${choice.level}.`);
    }
  });
}

function validateSpellChoices(spellPlan, selection, blockers) {
  const current = normaliseSpellSelection(selection, spellPlan);
  const requirements = [
    ['cantrip', spellPlan.cantripTarget, current.cantrips.length],
    ['known spell', spellPlan.knownTarget, current.spells.length],
    ['prepared spell', spellPlan.preparedTarget, current.prepared.length],
  ];

  requirements.forEach(([label, target, selected]) => {
    const count = Number(target || 0);
    if (!count || selected >= count) return;
    blockers.push(`Choose ${count - selected} more ${label}${count - selected === 1 ? '' : 's'} for the starting level.`);
  });
}

function validateClassChoices(classPlan, selection, blockers) {
  const current = normaliseClassSpecificSelection(selection, classPlan);
  const requirements = [
    ['fighting style', classPlan.fightingStyleTarget, current.fightingStyles.length],
    ['Expertise choice', classPlan.expertiseTarget, current.expertise.length],
    ['Metamagic option', classPlan.metamagicTarget, current.metamagic.length],
    ['Battle Master manoeuvre', classPlan.maneuverTarget, current.maneuvers.length],
  ];

  requirements.forEach(([label, target, selected]) => {
    const count = Number(target || 0);
    if (!count || selected >= count) return;
    blockers.push(`Choose ${count - selected} more ${label}${count - selected === 1 ? '' : 's'}.`);
  });
}

function validateWarlockChoices(warlockPlan, selection, blockers) {
  if (!warlockPlan) return;
  const current = normaliseWarlockSelection(selection, warlockPlan);
  if (warlockPlan.pactBoonRequired && !current.pactBoon) blockers.push('Choose a Warlock Pact Boon.');
  const target = Number(warlockPlan.invocationCount || 0);
  if (target && current.invocations.length < target) {
    const missing = target - current.invocations.length;
    blockers.push(`Choose ${missing} more Eldritch Invocation${missing === 1 ? '' : 's'}.`);
  }
}

export function validateHigherLevelCharacterCreation({ payload = {}, levelChoices = {}, detailChoices = {} } = {}) {
  const level = Math.max(1, Number(payload.level || 1));
  if (payload.creation_mode !== 'full' || level <= 1) return { ready: true, blockers: [] };

  const className = readClassName(payload);
  const classData = CLASSES[className] || {};
  const edition = readRulesEdition(payload);
  const blockers = [];

  if (requiredSubclass(payload, level, edition, className, classData) && !payload.subclass) {
    blockers.push(`Choose the required ${className || 'class'} subclass for level ${level}.`);
  }

  const plan = buildStartingLevelChoicePlan({
    className,
    startingLevel: level,
    edition,
    abilities: payload,
  });
  const classPlan = buildClassSpecificChoicePlan({
    className,
    level,
    subclassName: payload.subclass || '',
  });

  validateAsiChoices(plan, levelChoices, blockers);
  validateSpellChoices(plan.spellPlan || {}, detailChoices.spells || {}, blockers);
  validateClassChoices(classPlan, detailChoices.classSpecific || {}, blockers);
  validateWarlockChoices(plan.warlockPlan, detailChoices.warlock || {}, blockers);

  return { ready: blockers.length === 0, blockers };
}

export function readHigherLevelCreationSelections(storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  if (!storage) return { levelChoices: {}, detailChoices: {} };
  const read = (key) => {
    try {
      return JSON.parse(storage.getItem(key) || '{}') || {};
    } catch {
      return {};
    }
  };
  return {
    levelChoices: read(STARTING_LEVEL_CHOICE_STORAGE_KEY),
    detailChoices: read(STARTING_LEVEL_DETAIL_STORAGE_KEY),
  };
}

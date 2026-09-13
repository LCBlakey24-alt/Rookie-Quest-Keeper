import { mergeCharacterClassResources } from './characterClassResources';
import { getEditionMulticlassSpellSlots } from './editionSpellSlotRules';
import {
  buildPactMagicResource,
  getNormalSpellPool,
  getPactMagicPool,
} from './spellcastingPools';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normaliseName = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

const hasItems = (value = {}) => Object.keys(value || {}).length > 0;

export function getCharacterEdition(character = {}) {
  const raw = character.rules_edition || character.edition || character.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
}

export function canStartRest(character = {}) {
  if (getCharacterEdition(character) !== '2024') return true;
  const currentHp = toNumber(character.current_hit_points ?? character.hp, 0);
  return currentHp > 0;
}

export function getCharacterClassLevels(character = {}) {
  const fromMap = character.class_levels || character.multiclass_levels || {};
  const entries = Object.entries(fromMap).filter(([, level]) => toNumber(level, 0) > 0);
  if (entries.length) {
    return Object.fromEntries(entries.map(([name, level]) => [name, toNumber(level, 0)]));
  }

  const fromArray = (character.classes || [])
    .map((entry) => [
      entry?.name || entry?.class_name || entry?.character_class || entry?.class,
      toNumber(entry?.level || entry?.class_level, 0),
    ])
    .filter(([name, level]) => name && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  const primary = character.character_class || character.class_name;
  return primary ? { [primary]: Math.max(1, toNumber(character.level, 1)) } : {};
}

export function getTotalHitDice(character = {}) {
  const total = Object.values(getCharacterClassLevels(character))
    .reduce((sum, level) => sum + Math.max(0, toNumber(level, 0)), 0);
  return total || Math.max(1, toNumber(character.level, 1));
}

export function getLongRestHitDiceRemaining(character = {}) {
  const total = getTotalHitDice(character);
  const current = Math.max(0, Math.min(total, toNumber(character.hit_dice_remaining, total)));
  if (getCharacterEdition(character) === '2024') return total;
  return Math.min(total, current + Math.max(1, Math.floor(total / 2)));
}

function trackerMax(tracker = {}) {
  return Math.max(0, toNumber(
    tracker.max ?? tracker.maximum ?? tracker.total ?? tracker.uses,
    0,
  ));
}

function trackerCurrent(tracker = {}, maximum = trackerMax(tracker)) {
  return Math.max(0, Math.min(maximum, toNumber(tracker.current ?? tracker.remaining, maximum)));
}

function trackerRestType(tracker = {}) {
  const raw = String(tracker.restore || tracker.recovery || tracker.refresh || 'long-rest').toLowerCase();
  return raw.includes('short') ? 'short-rest' : 'long-rest';
}

function trackerShortRestRestore(tracker = {}) {
  return Math.max(0, toNumber(
    tracker.short_rest_restore ?? tracker.shortRestRestore ?? tracker.short_rest_regain,
    0,
  ));
}

export function restoreResourceTrackers(resources = {}, restType = 'long-rest') {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) return {};
  return Object.fromEntries(Object.entries(resources).map(([key, raw]) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [key, raw];
    const tracker = { ...raw };
    const maximum = trackerMax(tracker);
    if (maximum <= 0) return [key, tracker];

    const current = trackerCurrent(tracker, maximum);
    const fullShortRestore = trackerRestType(tracker) === 'short-rest';
    const partialShortRestore = restType === 'short-rest' ? trackerShortRestRestore(tracker) : 0;
    const shouldTouch = restType === 'long-rest' || fullShortRestore || partialShortRestore > 0;
    if (!shouldTouch) return [key, tracker];

    const nextCurrent = restType === 'long-rest' || fullShortRestore
      ? maximum
      : Math.min(maximum, current + partialShortRestore);
    tracker.current = nextCurrent;
    tracker.remaining = nextCurrent;
    tracker.max = maximum;
    return [key, tracker];
  }));
}

function getSlotMath(character = {}) {
  const classLevels = getCharacterClassLevels(character);
  try {
    return getEditionMulticlassSpellSlots(classLevels, character) || {};
  } catch {
    return {};
  }
}

export function canonicalResourcesForRest(character = {}) {
  return mergeCharacterClassResources(
    character,
    getCharacterClassLevels(character),
    { initialiseMissing: true },
  );
}

function withPactRestored(character, resources, slotMath) {
  const pactPool = getPactMagicPool({ ...character, resources }, slotMath);
  if (!pactPool.available) return resources;
  return buildPactMagicResource(resources, pactPool, pactPool.total);
}

function pactSlotShape(resources = {}) {
  const tracker = resources?.pact_magic;
  const slotLevel = Math.max(0, toNumber(tracker?.slot_level, 0));
  const maximum = Math.max(0, toNumber(tracker?.max, 0));
  return slotLevel > 0 && maximum > 0 ? { [String(slotLevel)]: maximum } : {};
}

function shouldMirrorPactSlots(character = {}, slotMath = {}, normalPool = {}) {
  if (normalPool?.legacyPactExcluded) return true;
  const classLevels = getCharacterClassLevels(character);
  const hasWarlock = Object.keys(classLevels).some((name) => normaliseName(name) === 'warlock');
  const pactPool = getPactMagicPool(character, slotMath);
  const sharedSlots = slotMath?.slots || {};
  return hasWarlock && pactPool.available && !hasItems(sharedSlots);
}

export function buildShortRestUpdates(character = {}) {
  const slotMath = getSlotMath(character);
  const canonicalResources = canonicalResourcesForRest(character);
  const workingCharacter = { ...character, resources: canonicalResources };
  const normalPool = getNormalSpellPool(workingCharacter, slotMath);
  let resources = restoreResourceTrackers(canonicalResources, 'short-rest');
  resources = withPactRestored(workingCharacter, resources, slotMath);
  const mirrorPactSlots = shouldMirrorPactSlots(workingCharacter, slotMath, normalPool);

  const updates = {
    resources,
    last_rest_type: 'short-rest',
  };

  if (mirrorPactSlots) {
    const pactSlots = pactSlotShape(resources);
    const slots = Object.keys(pactSlots).length ? pactSlots : { ...(character.spell_slots || {}) };
    updates.spell_slots = slots;
    updates.spell_slots_remaining = slots;
    updates.used_spell_slots = {};
  }

  return updates;
}

export function buildLongRestUpdates(character = {}) {
  const maxHp = Math.max(1, toNumber(character.max_hit_points, 1));
  const slotMath = getSlotMath(character);
  const canonicalResources = canonicalResourcesForRest(character);
  const workingCharacter = { ...character, resources: canonicalResources };
  const normalPool = getNormalSpellPool(workingCharacter, slotMath);
  let resources = restoreResourceTrackers(canonicalResources, 'long-rest');
  resources = withPactRestored(workingCharacter, resources, slotMath);
  const mirrorPactSlots = shouldMirrorPactSlots(workingCharacter, slotMath, normalPool);
  const pactSlots = mirrorPactSlots ? pactSlotShape(resources) : {};
  const spellSlots = Object.keys(pactSlots).length ? pactSlots : { ...(character.spell_slots || {}) };

  return {
    current_hit_points: maxHp,
    temporary_hit_points: 0,
    temp_hp: 0,
    death_saves_successes: 0,
    death_saves_failures: 0,
    concentrating_on: null,
    concentration: null,
    ...(mirrorPactSlots ? { spell_slots: spellSlots } : {}),
    spell_slots_remaining: spellSlots,
    used_spell_slots: {},
    hit_dice_remaining: getLongRestHitDiceRemaining(character),
    exhaustion_level: Math.max(0, toNumber(character.exhaustion_level, 0) - 1),
    resources,
    last_rest_type: 'long-rest',
  };
}

export function isWarlockCharacter(character = {}) {
  return Object.keys(getCharacterClassLevels(character)).some((name) => normaliseName(name) === 'warlock');
}

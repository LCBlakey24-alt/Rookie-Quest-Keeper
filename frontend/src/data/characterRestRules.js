import { getMulticlassSpellSlots } from './spellDatabase';
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

export function getCharacterEdition(character = {}) {
  const raw = character.rules_edition || character.edition || character.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
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

function trackerRestType(tracker = {}) {
  const raw = String(tracker.restore || tracker.recovery || tracker.refresh || 'long-rest').toLowerCase();
  return raw.includes('short') ? 'short-rest' : 'long-rest';
}

export function restoreResourceTrackers(resources = {}, restType = 'long-rest') {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) return {};
  return Object.fromEntries(Object.entries(resources).map(([key, raw]) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [key, raw];
    const tracker = { ...raw };
    const maximum = trackerMax(tracker);
    const shouldRestore = restType === 'long-rest' || trackerRestType(tracker) === 'short-rest';
    if (shouldRestore && maximum > 0) {
      tracker.current = maximum;
      tracker.remaining = maximum;
      tracker.max = maximum;
    }
    return [key, tracker];
  }));
}

function getSlotMath(character = {}) {
  const classLevels = getCharacterClassLevels(character);
  try {
    return getMulticlassSpellSlots(classLevels, character) || {};
  } catch {
    return {};
  }
}

function withPactRestored(character, resources, slotMath) {
  const pactPool = getPactMagicPool({ ...character, resources }, slotMath);
  if (!pactPool.available) return resources;
  return buildPactMagicResource(resources, pactPool, pactPool.total);
}

export function buildShortRestUpdates(character = {}) {
  const slotMath = getSlotMath(character);
  const normalPool = getNormalSpellPool(character, slotMath);
  let resources = restoreResourceTrackers(character.resources || {}, 'short-rest');
  resources = withPactRestored(character, resources, slotMath);

  const updates = {
    resources,
    last_rest_type: 'short-rest',
  };

  // Older single-class Warlocks stored Pact Magic in spell_slots. Keep that
  // compatibility field synchronized while also migrating to resources.
  if (normalPool.legacyPactExcluded) {
    updates.spell_slots_remaining = { ...(character.spell_slots || {}) };
    updates.used_spell_slots = {};
  }

  return updates;
}

export function buildLongRestUpdates(character = {}) {
  const maxHp = Math.max(1, toNumber(character.max_hit_points, 1));
  const slotMath = getSlotMath(character);
  let resources = restoreResourceTrackers(character.resources || {}, 'long-rest');
  resources = withPactRestored(character, resources, slotMath);

  return {
    current_hit_points: maxHp,
    temporary_hit_points: 0,
    temp_hp: 0,
    death_saves_successes: 0,
    death_saves_failures: 0,
    concentrating_on: null,
    concentration: null,
    spell_slots_remaining: { ...(character.spell_slots || {}) },
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

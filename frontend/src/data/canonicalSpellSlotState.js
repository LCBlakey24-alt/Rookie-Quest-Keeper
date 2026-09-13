import { getEditionMulticlassSpellSlots } from './editionSpellSlotRules';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normaliseSlotMap = (slots = {}) => Object.fromEntries(
  Object.entries(slots || {})
    .map(([level, count]) => [String(level), Math.max(0, toNumber(count, 0))])
    .filter(([, count]) => count > 0),
);

export function deriveCanonicalSpellSlots(character = {}, classLevels = {}) {
  const safeClassLevels = Object.fromEntries(
    Object.entries(classLevels || {})
      .map(([className, level]) => [className, Math.max(0, toNumber(level, 0))])
      .filter(([, level]) => level > 0),
  );

  const rulesCharacter = {
    ...character,
    class_levels: safeClassLevels,
  };

  const slotMath = getEditionMulticlassSpellSlots(safeClassLevels, rulesCharacter) || {};
  const shared = normaliseSlotMap(slotMath.slots);
  if (Object.keys(shared).length) return shared;

  const pact = slotMath.pactMagic;
  if (toNumber(pact?.slots, 0) > 0 && toNumber(pact?.level, 0) > 0) {
    return { [String(toNumber(pact.level, 0))]: toNumber(pact.slots, 0) };
  }

  return {};
}

export function clampSpellSlotsRemaining(totals = {}, remaining = null) {
  const totalMap = normaliseSlotMap(totals);
  if (!remaining || typeof remaining !== 'object' || Array.isArray(remaining)) return { ...totalMap };

  return Object.fromEntries(Object.entries(totalMap).map(([level, total]) => [
    level,
    Math.min(total, Math.max(0, toNumber(remaining[level] ?? remaining[Number(level)], total))),
  ]));
}

export function buildFreshSpellSlotState(character = {}, classLevels = {}) {
  const spellSlots = deriveCanonicalSpellSlots(character, classLevels);
  return {
    spell_slots: spellSlots,
    spell_slots_remaining: { ...spellSlots },
  };
}

import {
  getAllowedSlotLevelsForSpell,
  getSpellBaseLevel,
  normaliseSpellSlots,
  spendSpellSlot,
} from './spellCastingRules';

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hasItems = (value = {}) => Object.keys(value || {}).length > 0;

function legacyPactRemaining(character = {}, derived = null) {
  if (!derived) return null;
  const level = String(toNumber(derived.level, 0));
  const total = Math.max(0, toNumber(derived.slots, 0));
  const saved = normaliseSpellSlots(character?.spell_slots || {});
  const remaining = normaliseSpellSlots(character?.spell_slots_remaining || {});
  const entries = Object.entries(saved).filter(([, count]) => toNumber(count, 0) > 0);
  if (entries.length !== 1 || entries[0][0] !== level || toNumber(entries[0][1], 0) !== total) return null;
  return clamp(toNumber(remaining[level], total), 0, total);
}

export function getPactMagicPool(character = {}, slotMath = {}) {
  const derived = slotMath?.pactMagic || null;
  const tracker = character?.resources?.pact_magic;
  const hasTracker = tracker && typeof tracker === 'object' && !Array.isArray(tracker);

  const level = Math.max(
    0,
    toNumber(hasTracker ? tracker.slot_level : undefined, toNumber(derived?.level, 0)),
  );
  const total = Math.max(
    0,
    toNumber(
      hasTracker ? (tracker.max ?? tracker.maximum ?? tracker.total) : undefined,
      toNumber(derived?.slots, 0),
    ),
  );
  const legacyCurrent = hasTracker ? null : legacyPactRemaining(character, derived);
  const current = clamp(
    toNumber(
      hasTracker ? (tracker.current ?? tracker.remaining) : legacyCurrent,
      total,
    ),
    0,
    total,
  );

  return {
    available: Boolean(level > 0 && total > 0),
    level,
    total,
    current,
    restore: String(hasTracker ? (tracker.restore || tracker.recovery || 'short-rest') : 'short-rest'),
    tracker: hasTracker ? tracker : null,
    legacy: !hasTracker && legacyCurrent !== null,
  };
}

export function isLegacyPactSlotMap(character = {}, slotMath = {}, pactPool = null) {
  const pact = pactPool || getPactMagicPool(character, slotMath);
  const saved = normaliseSpellSlots(character?.spell_slots || {});
  const derivedShared = normaliseSpellSlots(slotMath?.slots || {});
  if (!pact.available || hasItems(derivedShared) || !hasItems(saved)) return false;

  const entries = Object.entries(saved).filter(([, count]) => toNumber(count, 0) > 0);
  if (entries.length !== 1) return false;
  const [level, count] = entries[0];
  return toNumber(level, 0) === pact.level && toNumber(count, 0) === pact.total;
}

export function getNormalSpellPool(character = {}, slotMath = {}) {
  const pactPool = getPactMagicPool(character, slotMath);
  const saved = normaliseSpellSlots(character?.spell_slots || {});
  const derived = normaliseSpellSlots(slotMath?.slots || {});
  const savedIsLegacyPact = isLegacyPactSlotMap(character, slotMath, pactPool);
  const usableSaved = savedIsLegacyPact ? {} : saved;
  const totals = hasItems(usableSaved) ? usableSaved : derived;
  const savedRemaining = normaliseSpellSlots(character?.spell_slots_remaining || {});
  const usableRemaining = savedIsLegacyPact ? {} : savedRemaining;
  const remaining = hasItems(usableRemaining) ? usableRemaining : { ...totals };

  return {
    totals,
    remaining: Object.fromEntries(
      Object.entries(totals).map(([level, total]) => [
        String(level),
        clamp(toNumber(remaining[level], total), 0, total),
      ]),
    ),
    source: hasItems(usableSaved) ? 'saved' : hasItems(derived) ? 'derived' : 'none',
    legacyPactExcluded: savedIsLegacyPact,
  };
}

export function getCastOptionsForSpell({
  spell = {},
  normalSlots = {},
  normalRemaining = {},
  pactPool = null,
} = {}) {
  const baseLevel = getSpellBaseLevel(spell);
  if (baseLevel <= 0) {
    return [{ source: 'cantrip', level: 0, label: 'Use Cantrip' }];
  }

  const allowedLevels = getAllowedSlotLevelsForSpell(spell);
  const normalTotals = normaliseSpellSlots(normalSlots);
  const normalLeft = normaliseSpellSlots(normalRemaining);
  const options = [];

  allowedLevels.forEach((level) => {
    const key = String(level);
    const total = toNumber(normalTotals[key], 0);
    const remaining = toNumber(normalLeft[key], total);
    if (level > 0 && total > 0 && remaining > 0) {
      options.push({
        source: 'spell',
        level,
        label: `L${level} Slot`,
        remaining,
        total,
      });
    }
  });

  if (
    pactPool?.available
    && pactPool.current > 0
    && allowedLevels.includes(toNumber(pactPool.level, 0))
  ) {
    options.push({
      source: 'pact',
      level: pactPool.level,
      label: `Pact L${pactPool.level}`,
      remaining: pactPool.current,
      total: pactPool.total,
    });
  }

  return options;
}

export function spendCastOption({
  option,
  normalRemaining = {},
  pactPool = null,
} = {}) {
  if (!option || option.source === 'cantrip') {
    return {
      normalRemaining: normaliseSpellSlots(normalRemaining),
      pactRemaining: pactPool?.current ?? null,
    };
  }

  if (option.source === 'pact') {
    const current = Math.max(0, toNumber(pactPool?.current, 0));
    return {
      normalRemaining: normaliseSpellSlots(normalRemaining),
      pactRemaining: Math.max(0, current - 1),
    };
  }

  return {
    normalRemaining: spendSpellSlot({
      remaining: normalRemaining,
      slotLevel: option.level,
    }),
    pactRemaining: pactPool?.current ?? null,
  };
}

export function buildPactMagicResource(resources = {}, pactPool = {}, current = pactPool.current) {
  const existing = resources?.pact_magic && typeof resources.pact_magic === 'object'
    ? resources.pact_magic
    : {};
  const total = Math.max(0, toNumber(pactPool.total, toNumber(existing.max, 0)));
  const level = Math.max(0, toNumber(pactPool.level, toNumber(existing.slot_level, 0)));
  const nextCurrent = clamp(toNumber(current, total), 0, total);

  return {
    ...(resources || {}),
    pact_magic: {
      ...existing,
      label: existing.label || 'Pact Magic',
      current: nextCurrent,
      remaining: nextCurrent,
      max: total,
      slot_level: level,
      restore: existing.restore || 'short-rest',
      min_level: existing.min_level ?? 1,
      className: existing.className || 'Warlock',
    },
  };
}

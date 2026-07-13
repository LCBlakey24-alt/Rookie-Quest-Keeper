const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const uniqueSortedLevels = (levels = []) => Array.from(
  new Set(levels.map((level) => toNumber(level)).filter((level) => level > 0)),
).sort((a, b) => a - b);

export function getSpellBaseLevel(spell = {}) {
  return toNumber(spell.level ?? spell.spell_level ?? spell.spellLevel, 0);
}

export function getExplicitAllowedSlotLevels(spell = {}) {
  const explicit = spell.allowed_slot_levels
    || spell.allowedSlotLevels
    || spell.cast_slot_levels
    || spell.castSlotLevels
    || spell.upcast_levels
    || spell.upcastLevels;

  return Array.isArray(explicit) ? uniqueSortedLevels(explicit) : [];
}

export function getAllowedSlotLevelsForSpell(spell = {}) {
  const baseLevel = getSpellBaseLevel(spell);
  if (baseLevel <= 0) return [0];

  const explicitLevels = getExplicitAllowedSlotLevels(spell).filter((level) => level >= baseLevel);
  return explicitLevels.length ? explicitLevels : [baseLevel];
}

export function normaliseSpellSlots(slots = {}) {
  return Object.fromEntries(
    Object.entries(slots || {}).map(([level, count]) => [String(level), Math.max(0, toNumber(count, 0))]),
  );
}

export function getRemainingAtLevel({ slots = {}, remaining = {}, level } = {}) {
  const key = String(level);
  const normalisedSlots = normaliseSpellSlots(slots);
  const normalisedRemaining = normaliseSpellSlots(remaining);
  return toNumber(normalisedRemaining[key] ?? normalisedSlots[key] ?? 0, 0);
}

export function getAvailableCastSlotLevels({ spell = {}, slots = {}, remaining = {} } = {}) {
  return getAllowedSlotLevelsForSpell(spell)
    .filter((level) => level === 0 || getRemainingAtLevel({ slots, remaining, level }) > 0);
}

export function canCastSpellWithSlot({ spell = {}, slotLevel } = {}) {
  const baseLevel = getSpellBaseLevel(spell);
  if (baseLevel <= 0) return toNumber(slotLevel, 0) === 0;
  return getAllowedSlotLevelsForSpell(spell).includes(toNumber(slotLevel));
}

export function spendSpellSlot({ remaining = {}, slotLevel } = {}) {
  const level = String(slotLevel);
  const normalisedRemaining = normaliseSpellSlots(remaining);
  const current = toNumber(normalisedRemaining[level], 0);
  if (current <= 0) return normalisedRemaining;
  return { ...normalisedRemaining, [level]: current - 1 };
}

export function findSlotPoolingCombos({ requiredLevel, remaining = {}, maxComboSize = 4 } = {}) {
  const target = toNumber(requiredLevel, 0);
  if (target <= 0) return [];

  const available = Object.entries(normaliseSpellSlots(remaining))
    .flatMap(([level, count]) => Array.from({ length: count }, () => toNumber(level)))
    .filter((level) => level > 0 && level < target)
    .sort((a, b) => b - a);

  const combos = [];
  const seen = new Set();

  function walk(startIndex, combo, total) {
    if (total === target && combo.length > 1) {
      const sorted = [...combo].sort((a, b) => b - a);
      const key = sorted.join('+');
      if (!seen.has(key)) {
        seen.add(key);
        combos.push(sorted);
      }
      return;
    }
    if (total >= target || combo.length >= maxComboSize) return;

    for (let index = startIndex; index < available.length; index += 1) {
      walk(index + 1, [...combo, available[index]], total + available[index]);
    }
  }

  walk(0, [], 0);
  return combos;
}

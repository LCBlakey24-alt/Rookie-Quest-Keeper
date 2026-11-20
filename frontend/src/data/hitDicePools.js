/**
 * Hit Dice by die size (review finding 10).
 *
 * A multiclass character has a pool for each die size: a Fighter 1 /
 * Wizard 1 has one d10 and one d6, never two d10s. The pools are worked
 * out from the class levels, and what is left in each is saved as
 * `hit_dice_remaining_by_die` ({ "10": 1, "6": 0 }) next to the old
 * `hit_dice_remaining` total, which every older screen still reads.
 *
 * Legacy saves, and any writer that only updated the total (level up,
 * creation), are handled explicitly: when the per-size counts do not add
 * up to the total, the total is spread over the pools smallest die first.
 * That can only under-count large dice, never create extra ones.
 *
 * Mirrored in backend/utils/hit_dice_pools.py; both are held to
 * __fixtures__/hitDicePoolCases.json.
 */

const HIT_DIE_BY_CLASS = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8,
  sorcerer: 6, wizard: 6, artificer: 8,
};

const whole = (value, fallback = 0) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
};
const classKey = (name) => String(name || '').toLowerCase().replace(/[^a-z]/g, '');

/** Class levels, read the same way as characterRestRules (kept here to avoid an import cycle). */
function classLevels(character = {}) {
  const map = character.class_levels || character.multiclass_levels || {};
  const fromMap = Object.entries(map).filter(([, level]) => whole(level) > 0);
  if (fromMap.length) return Object.fromEntries(fromMap.map(([name, level]) => [name, whole(level)]));
  const fromArray = (character.classes || [])
    .map((entry) => [entry?.name || entry?.class_name || entry?.character_class || entry?.class, whole(entry?.level || entry?.class_level)])
    .filter(([name, level]) => name && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);
  const primary = character.character_class || character.class_name;
  return primary ? { [primary]: Math.max(1, whole(character.level, 1)) } : {};
}

/** The die size a class uses: the table, else the saved hit_dice text, else d8. */
function sidesForClass(name, character) {
  const known = HIT_DIE_BY_CLASS[classKey(name)];
  if (known) return known;
  const saved = String(character?.hit_dice || '').match(/d(\d+)/i);
  return saved ? whole(saved[1], 8) : 8;
}

/** { sides: total } for the character's class levels. */
export function hitDiceTotals(character = {}) {
  const totals = {};
  Object.entries(classLevels(character)).forEach(([name, level]) => {
    const sides = sidesForClass(name, character);
    totals[sides] = (totals[sides] || 0) + Math.max(0, whole(level));
  });
  if (!Object.keys(totals).length) {
    // No class saved: read the hit_dice text itself ("5d10", "1d10 + 1d6").
    const parts = [...String(character.hit_dice || '').matchAll(/(\d+)\s*d\s*(\d+)/gi)];
    parts.forEach(([, count, sides]) => { totals[whole(sides, 8)] = (totals[whole(sides, 8)] || 0) + whole(count); });
    if (!Object.keys(totals).length) totals[8] = Math.max(1, whole(character.level, 1));
  }
  return totals;
}

/** Pools, largest die first: [{ sides, total, remaining }]. */
export function hitDicePools(character = {}) {
  const totals = hitDiceTotals(character);
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const remainingTotal = Math.max(0, Math.min(total, whole(character.hit_dice_remaining ?? total, total)));
  const sizes = Object.keys(totals).map(Number);

  const saved = character.hit_dice_remaining_by_die;
  const clampedSaved = saved && typeof saved === 'object'
    ? Object.fromEntries(sizes.map((sides) => [sides, Math.max(0, Math.min(totals[sides], whole(saved[sides] ?? saved[String(sides)], 0)))]))
    : null;
  const savedSum = clampedSaved ? Object.values(clampedSaved).reduce((sum, value) => sum + value, 0) : -1;

  let remaining;
  if (clampedSaved && savedSum === remainingTotal) {
    remaining = clampedSaved;
  } else {
    // Legacy or total-only save: count the smallest dice as left first.
    remaining = {};
    let left = remainingTotal;
    [...sizes].sort((a, b) => a - b).forEach((sides) => {
      const take = Math.min(totals[sides], left);
      remaining[sides] = take;
      left -= take;
    });
  }
  return sizes.sort((a, b) => b - a).map((sides) => ({ sides, total: totals[sides], remaining: remaining[sides] || 0 }));
}

const toSave = (pools) => ({
  hit_dice_remaining: pools.reduce((sum, pool) => sum + pool.remaining, 0),
  hit_dice_remaining_by_die: Object.fromEntries(pools.map((pool) => [String(pool.sides), pool.remaining])),
});

/**
 * Spend one die. `sides` picks the pool; without it, the largest die left.
 * Returns { sides, updates } or null when that pool (or every pool) is empty.
 */
export function spendHitDie(character = {}, sides = null) {
  const pools = hitDicePools(character);
  const pool = sides
    ? pools.find((entry) => entry.sides === whole(sides) && entry.remaining > 0)
    : pools.find((entry) => entry.remaining > 0);
  if (!pool) return null;
  const next = pools.map((entry) => (entry === pool ? { ...entry, remaining: entry.remaining - 1 } : entry));
  return { sides: pool.sides, updates: toSave(next) };
}

/**
 * Long Rest recovery. 2024: every spent die. 2014: half the total (at
 * least one), largest dice back first, never above a pool's total.
 */
export function longRestHitDice(character = {}, edition = '2014') {
  const pools = hitDicePools(character);
  if (edition === '2024') return toSave(pools.map((pool) => ({ ...pool, remaining: pool.total })));
  const total = pools.reduce((sum, pool) => sum + pool.total, 0);
  let regain = Math.max(1, Math.floor(total / 2));
  const next = pools.map((pool) => {
    const back = Math.min(pool.total - pool.remaining, regain);
    regain -= back;
    return { ...pool, remaining: pool.remaining + back };
  });
  return toSave(next);
}

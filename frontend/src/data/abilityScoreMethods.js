/**
 * The ways a new character's ability scores can be set, as pure rules so
 * every one of them can be tested on its own.
 *
 * Point buy is the same in the 2014 and 2024 rules: 27 points, every score
 * from 8 to 15 before bonuses, costing 0 1 2 3 4 5 7 9 for 8 to 15. The
 * cost table lives in lib/characterRules (calculatePointBuyCost).
 */
import { POINT_BUY_TOTAL, STANDARD_ARRAY, calculatePointBuyCost } from '@/lib/characterRules';

export const ABILITY_ORDER = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export { POINT_BUY_TOTAL, STANDARD_ARRAY };

export const ABILITY_METHODS = [
  { id: 'standard', label: 'Standard array', hint: '15, 14, 13, 12, 10, 8' },
  { id: 'point', label: 'Point buy', hint: `${POINT_BUY_TOTAL} points` },
  { id: 'roll', label: 'Roll 4d6', hint: 'drop the lowest die' },
  { id: 'manual', label: 'Manual', hint: 'type your own' },
];

export function pointBuySpent(scores = {}) {
  return ABILITY_ORDER.reduce((sum, ability) => sum + calculatePointBuyCost(scores[ability]), 0);
}

export function pointBuyRemaining(scores = {}) {
  return POINT_BUY_TOTAL - pointBuySpent(scores);
}

/** True when `ability` may be set to `next` under point buy. */
export function canSetPointBuy(scores = {}, ability, next) {
  const value = Number(next);
  if (!Number.isInteger(value) || value < POINT_BUY_MIN || value > POINT_BUY_MAX) return false;
  return pointBuySpent({ ...scores, [ability]: value }) <= POINT_BUY_TOTAL;
}

/** Every score at 8: the point-buy starting position. */
export function pointBuyStart() {
  return Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, POINT_BUY_MIN]));
}

/** The standard array, highest first, in ability order. */
export function standardArrayScores() {
  return Object.fromEntries(ABILITY_ORDER.map((ability, index) => [ability, STANDARD_ARRAY[index]]));
}

/** Trade two abilities' scores; the set of numbers never changes. */
export function swapScores(scores = {}, first, second) {
  if (!first || !second || first === second) return { ...scores };
  return { ...scores, [first]: scores[second], [second]: scores[first] };
}

/**
 * Rolls with the ability each one belongs to. A roll may name its ability
 * (rolled from that ability's wheel, or reassigned since); older drafts
 * stored rolls in order, STR first, so an unnamed roll belongs to the
 * ability at its position.
 */
export function normaliseRolls(rolled = []) {
  return (Array.isArray(rolled) ? rolled : []).map((entry, index) => ({
    ...entry,
    ability: entry?.ability || ABILITY_ORDER[index],
  }));
}

/**
 * Rolls from an older draft carry no ability, and that draft may have
 * swapped scores between abilities without moving the rolls. Name each
 * roll after the ability whose saved score it now is, so the next trade
 * does not undo those swaps. Rolls that match no saved score fall back to
 * their position.
 */
export function migrateRolls(rolled = [], scores = {}) {
  const list = Array.isArray(rolled) ? rolled : [];
  if (!list.length || list.some((entry) => entry?.ability)) return normaliseRolls(list);
  const free = new Set(ABILITY_ORDER);
  const placed = list.map((entry) => {
    const holder = ABILITY_ORDER.find((ability) => free.has(ability) && Number(scores[ability]) === Number(entry?.total));
    if (holder) free.delete(holder);
    return holder || null;
  });
  return list.map((entry, index) => {
    let ability = placed[index];
    if (!ability) {
      ability = free.has(ABILITY_ORDER[index]) ? ABILITY_ORDER[index] : [...free][0];
      free.delete(ability);
    }
    return { ...entry, ability };
  });
}

/** The roll each ability holds, by ability. */
export function rollsByAbility(rolled = []) {
  return Object.fromEntries(normaliseRolls(rolled).map((entry) => [entry.ability, entry]));
}

/**
 * Lay rolled totals onto their abilities. Abilities not yet rolled keep a
 * placeholder of 10 so the draft always holds a complete, legal set.
 */
export function scoresFromRolls(rolled = []) {
  const byAbility = rollsByAbility(rolled);
  return Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, Number(byAbility[ability]?.total) || 10]));
}

/** Record a roll for one ability, replacing any it already had. */
export function addRollFor(rolled = [], ability, result) {
  const kept = normaliseRolls(rolled).filter((entry) => entry.ability !== ability);
  return [...kept, { total: result.total, dice: result.dice, ability }];
}

/**
 * Give `ability` the roll that `rollIndex` names, handing its own roll to
 * whichever ability held that one. Duplicated totals stay distinct rolls.
 */
export function assignRoll(rolled = [], ability, rollIndex) {
  const rolls = normaliseRolls(rolled);
  const target = rolls[rollIndex];
  if (!target || target.ability === ability) return rolls;
  const holder = target.ability;
  return rolls.map((entry, index) => {
    if (index === rollIndex) return { ...entry, ability };
    if (entry.ability === ability) return { ...entry, ability: holder };
    return entry;
  });
}

/**
 * Give `ability` a score from a fixed set (the standard array), swapping it
 * with whichever ability holds that score. The set of numbers never changes.
 */
export function assignValue(scores = {}, ability, value) {
  const wanted = Number(value);
  if (Number(scores[ability]) === wanted) return { ...scores };
  const holder = ABILITY_ORDER.find((other) => other !== ability && Number(scores[other]) === wanted);
  return holder ? swapScores(scores, ability, holder) : { ...scores };
}

/** True when the scores are exactly the standard array in some order. */
export function isStandardArray(scores = {}) {
  const values = ABILITY_ORDER.map((ability) => Number(scores[ability])).sort((a, b) => b - a);
  return values.every((value, index) => value === STANDARD_ARRAY[index]);
}

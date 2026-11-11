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
 * Lay rolled totals onto the abilities in order (STR first). Abilities
 * not yet rolled keep a placeholder of 10 so the draft always holds a
 * complete, legal set of numbers.
 */
export function scoresFromRolls(rolled = []) {
  return Object.fromEntries(ABILITY_ORDER.map((ability, index) => [ability, Number(rolled[index]?.total) || 10]));
}

/** True when the scores are exactly the standard array in some order. */
export function isStandardArray(scores = {}) {
  const values = ABILITY_ORDER.map((ability) => Number(scores[ability])).sort((a, b) => b - a);
  return values.every((value, index) => value === STANDARD_ARRAY[index]);
}

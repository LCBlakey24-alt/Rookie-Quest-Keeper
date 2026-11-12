import {
  canSetPointBuy, isStandardArray, pointBuyRemaining, pointBuySpent, pointBuyStart,
  addRollFor, assignRoll, assignValue, normaliseRolls,
  scoresFromRolls, standardArrayScores, swapScores,
} from './abilityScoreMethods';
import { rollAbilityScore } from './abilityScoreRolls';

describe('point buy (same in 2014 and 2024)', () => {
  test('everything at 8 costs nothing and leaves 27', () => {
    expect(pointBuySpent(pointBuyStart())).toBe(0);
    expect(pointBuyRemaining(pointBuyStart())).toBe(27);
  });

  test('costs follow the table: 13 is 5, 14 is 7, 15 is 9', () => {
    const scores = { ...pointBuyStart(), strength: 15, dexterity: 14, constitution: 13 };
    expect(pointBuySpent(scores)).toBe(9 + 7 + 5);
  });

  test('scores stay between 8 and 15', () => {
    const start = pointBuyStart();
    expect(canSetPointBuy(start, 'strength', 7)).toBe(false);
    expect(canSetPointBuy(start, 'strength', 16)).toBe(false);
    expect(canSetPointBuy(start, 'strength', 15)).toBe(true);
  });

  test('a raise the budget cannot afford is refused', () => {
    // 15, 15, 15 = 27 points: nothing left for anything else.
    const spent = { ...pointBuyStart(), strength: 15, dexterity: 15, constitution: 15 };
    expect(pointBuyRemaining(spent)).toBe(0);
    expect(canSetPointBuy(spent, 'wisdom', 9)).toBe(false);
    expect(canSetPointBuy(spent, 'strength', 14)).toBe(true); // lowering is always fine
  });
});

describe('standard array and rolling', () => {
  test('swapping two abilities keeps the same set of numbers', () => {
    const swapped = swapScores(standardArrayScores(), 'strength', 'charisma');
    expect(swapped.strength).toBe(8);
    expect(swapped.charisma).toBe(15);
    expect(isStandardArray(swapped)).toBe(true);
  });

  test('rolled totals fill abilities in order; unrolled ones hold a placeholder', () => {
    expect(scoresFromRolls([{ total: 16 }, { total: 9 }])).toEqual({
      strength: 16, dexterity: 9, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    });
  });

  test('a rolled score carries its four dice with exactly the lowest dropped', () => {
    const sequence = [0.0, 0.99, 0.5, 0.5]; // d6: 1, 6, 4, 4
    let index = 0;
    const result = rollAbilityScore(() => sequence[index++ % sequence.length]);
    expect(result.dice).toHaveLength(4);
    expect(result.dice.filter((die) => die.dropped)).toHaveLength(1);
    expect(result.dice.find((die) => die.dropped).result).toBe(1);
    expect(result.total).toBe(14);
    result.dice.forEach((die) => expect(die.sides).toBe(6));
  });
});

describe('rolling per ability and assigning by turning', () => {
  const r = (total) => ({ total, dice: [] });

  test('older drafts, rolled in order, keep their abilities', () => {
    expect(normaliseRolls([r(16), r(9)]).map((e) => e.ability)).toEqual(['strength', 'dexterity']);
  });

  test('a roll can be made for any ability, in any order', () => {
    const rolled = addRollFor(addRollFor([], 'wisdom', r(17)), 'strength', r(8));
    const scores = scoresFromRolls(rolled);
    expect(scores.wisdom).toBe(17);
    expect(scores.strength).toBe(8);
    expect(scores.dexterity).toBe(10); // not rolled yet
  });

  test('assigning a roll swaps it with the ability that held it, even with equal totals', () => {
    let rolled = [];
    [['strength', 12], ['dexterity', 15], ['constitution', 12]].forEach(([ability, total]) => { rolled = addRollFor(rolled, ability, r(total)); });
    // Constitution takes the roll Dexterity held.
    const swapped = assignRoll(rolled, 'constitution', 1);
    expect(scoresFromRolls(swapped)).toMatchObject({ strength: 12, dexterity: 12, constitution: 15 });
    expect(swapped).toHaveLength(3);
  });

  test('assigning a standard-array value swaps it, keeping the set', () => {
    const scores = standardArrayScores();
    const next = assignValue(scores, 'charisma', 15);
    expect(next.charisma).toBe(15);
    expect(next.strength).toBe(8);
    expect(Object.values(next).sort()).toEqual(Object.values(scores).sort());
  });
});

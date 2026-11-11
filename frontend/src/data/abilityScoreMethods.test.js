import {
  canSetPointBuy, isStandardArray, pointBuyRemaining, pointBuySpent, pointBuyStart,
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

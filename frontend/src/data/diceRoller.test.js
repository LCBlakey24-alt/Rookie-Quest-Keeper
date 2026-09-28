import { rollDie, rollDiceNotation, getAnimationTarget } from './diceRoller';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('dice roller helpers', () => {
  test('shared die primitive maps RNG boundaries to the full die range', () => {
    expect(rollDie(4, () => 0)).toBe(1);
    expect(rollDie(6, () => 0.999999)).toBe(6);
    expect(rollDie(20, () => 0.999999)).toBe(20);
    expect(rollDie(100, () => 0.499999)).toBe(50);
  });

  test('accepts human-readable whitespace around modifiers', () => {
    const result = rollDiceNotation('2d6 + 4', { rng: rngFrom([0, 0.999]) });

    expect(result.rolls.map(roll => roll.result)).toEqual([1, 6]);
    expect(result.modifier).toBe(4);
    expect(result.total).toBe(11);
  });

  test('advantage still uses exactly two d20 rolls when notation contains spaces', () => {
    const result = rollDiceNotation('1d20 + 5', { rollType: 'advantage', rng: rngFrom([0.1, 0.9]) });

    expect(result.rolls.map(roll => roll.result)).toEqual([3, 19]);
    expect(result.visibleRolls.map(roll => roll.result)).toEqual([19]);
    expect(result.total).toBe(24);
  });

  test('exploding dice add max rolls and keep exploding until not max', () => {
    const result = rollDiceNotation('1d6+2', { exploding: true, rng: rngFrom([0.999, 0.999, 0.1]) });

    expect(result.rolls.map(roll => roll.result)).toEqual([6, 6, 1]);
    expect(result.explosionCount).toBe(2);
    expect(result.total).toBe(15);
  });

  test('d20 rolls do not explode even when exploding dice is enabled', () => {
    const result = rollDiceNotation('1d20+5', { exploding: true, rng: rngFrom([0.999]) });

    expect(result.rolls.map(roll => roll.result)).toEqual([20]);
    expect(result.explosionCount).toBe(0);
    expect(result.total).toBe(25);
    expect(result.isCrit).toBe(true);
  });

  test('animation target uses the natural d20 before modifiers', () => {
    const result = rollDiceNotation('1d20+7', { rng: rngFrom([0.49]) });

    expect(result.rolls[0].result).toBe(10);
    expect(result.total).toBe(17);
    expect(getAnimationTarget(result)).toBe(10);
  });

  test('advantage ties keep one d20 and mark the other as dropped for display', () => {
    const result = rollDiceNotation('1d20+5', { rollType: 'advantage', rng: rngFrom([0.49, 0.49]) });

    expect(result.rolls.map(roll => roll.result)).toEqual([10, 10]);
    expect(result.rolls[0].dropped).toBe(false);
    expect(result.rolls[1].dropped).toBe(true);
    expect(result.visibleRolls).toHaveLength(1);
    expect(result.total).toBe(15);
    expect(getAnimationTarget(result)).toBe(10);
  });
});

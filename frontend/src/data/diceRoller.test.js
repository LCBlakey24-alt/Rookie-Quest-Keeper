import { getAnimationTarget, parseDiceNotation, rollDie, rollDiceNotation } from './diceRoller';

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
    expect(rollDie(20, () => 1)).toBe(20);
    expect(rollDie(20, () => -1)).toBe(1);
  });

  test('rejects dice with fewer than two sides at the shared primitive boundary', () => {
    expect(() => rollDie(1, () => 0)).toThrow('at least 2 sides');
    expect(() => rollDie(0, () => 0)).toThrow('at least 2 sides');
  });

  test('accepts human-readable whitespace around modifiers', () => {
    const result = rollDiceNotation('2d6 + 4', { rng: rngFrom([0, 0.999]) });

    expect(result.valid).toBe(true);
    expect(result.rolls.map(roll => roll.result)).toEqual([1, 6]);
    expect(result.modifier).toBe(4);
    expect(result.total).toBe(11);
  });

  test('strict parser rejects stray text instead of silently rolling part of it', () => {
    const parsed = parseDiceNotation('2d6oops+3');
    const result = rollDiceNotation('2d6oops+3', { rng: rngFrom([0.5, 0.5]) });

    expect(parsed.valid).toBe(false);
    expect(parsed.error).toMatch(/Expected|understand/i);
    expect(result.valid).toBe(false);
    expect(result.rolls).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('requires at least one dice group', () => {
    expect(parseDiceNotation('5').valid).toBe(false);
    expect(parseDiceNotation('').valid).toBe(false);
  });

  test('rejects unsafe dice counts and unsupported die sizes', () => {
    expect(parseDiceNotation('0d6').valid).toBe(false);
    expect(parseDiceNotation('101d6').valid).toBe(false);
    expect(parseDiceNotation('1d1').valid).toBe(false);
    expect(parseDiceNotation('1d101').valid).toBe(false);
  });

  test('supports signed dice groups instead of treating subtracted dice as added dice', () => {
    const result = rollDiceNotation('2d6 - 1d4 + 3', {
      rng: rngFrom([0, 0.999, 0.49]),
    });

    expect(result.rolls.map(roll => roll.result)).toEqual([1, 6, 2]);
    expect(result.rolls.map(roll => roll.contribution)).toEqual([1, 6, -2]);
    expect(result.modifier).toBe(3);
    expect(result.total).toBe(8);
  });

  test('keep-highest notation drops the lowest dice from the total', () => {
    const result = rollDiceNotation('4d6kh3', {
      rng: rngFrom([0, 0.2, 0.5, 0.999]),
    });

    expect(result.rolls.map(roll => roll.result)).toEqual([1, 2, 4, 6]);
    expect(result.rolls.map(roll => Boolean(roll.dropped))).toEqual([true, false, false, false]);
    expect(result.visibleRolls.map(roll => roll.result)).toEqual([2, 4, 6]);
    expect(result.total).toBe(12);
  });

  test('drop-lowest notation supports classic 4d6 drop 1 ability rolling', () => {
    const result = rollDiceNotation('4d6dl1', {
      rng: rngFrom([0, 0.2, 0.5, 0.999]),
    });

    expect(result.visibleRolls.map(roll => roll.result)).toEqual([2, 4, 6]);
    expect(result.total).toBe(12);
  });

  test('keep-lowest and drop-highest preserve the lower dice', () => {
    const keepLowest = rollDiceNotation('4d6kl3', {
      rng: rngFrom([0, 0.2, 0.5, 0.999]),
    });
    const dropHighest = rollDiceNotation('4d6dh1', {
      rng: rngFrom([0, 0.2, 0.5, 0.999]),
    });

    expect(keepLowest.visibleRolls.map(roll => roll.result)).toEqual([1, 2, 4]);
    expect(keepLowest.total).toBe(7);
    expect(dropHighest.visibleRolls.map(roll => roll.result)).toEqual([1, 2, 4]);
    expect(dropHighest.total).toBe(7);
  });

  test('rejects keep/drop counts that cannot leave a meaningful dice pool', () => {
    expect(parseDiceNotation('2d6kh3').valid).toBe(false);
    expect(parseDiceNotation('2d6dl2').valid).toBe(false);
    expect(parseDiceNotation('1d20dh1').valid).toBe(false);
  });

  test('advantage still uses exactly two d20 rolls when notation contains spaces', () => {
    const result = rollDiceNotation('1d20 + 5', {
      rollType: 'advantage',
      rng: rngFrom([0.1, 0.9]),
    });

    expect(result.valid).toBe(true);
    expect(result.rolls.map(roll => roll.result)).toEqual([3, 19]);
    expect(result.visibleRolls.map(roll => roll.result)).toEqual([19]);
    expect(result.total).toBe(24);
  });

  test('advantage and disadvantage reject ambiguous multi-d20 expressions', () => {
    const advantage = rollDiceNotation('2d20+5', { rollType: 'advantage', rng: rngFrom([0.1, 0.9]) });
    const mixed = rollDiceNotation('1d20+1d4', { rollType: 'disadvantage', rng: rngFrom([0.1, 0.9]) });

    expect(advantage.valid).toBe(false);
    expect(advantage.error).toMatch(/single 1d20/i);
    expect(advantage.rolls).toEqual([]);
    expect(mixed.valid).toBe(false);
    expect(mixed.error).toMatch(/single 1d20/i);
  });

  test('exploding dice add max rolls and keep exploding until not max', () => {
    const result = rollDiceNotation('1d6+2', {
      exploding: true,
      rng: rngFrom([0.999, 0.999, 0.1]),
    });

    expect(result.rolls.map(roll => roll.result)).toEqual([6, 6, 1]);
    expect(result.explosionCount).toBe(2);
    expect(result.total).toBe(15);
  });

  test('exploding dice retain the sign of a subtracted dice group', () => {
    const result = rollDiceNotation('1d8-1d6+10', {
      exploding: true,
      rng: rngFrom([0, 0.999, 0.1]),
    });

    expect(result.rolls.map(roll => roll.result)).toEqual([1, 6, 1]);
    expect(result.rolls.map(roll => roll.contribution)).toEqual([1, -6, -1]);
    expect(result.total).toBe(4);
  });

  test('exploding dice and keep/drop notation fail clearly instead of using undefined semantics', () => {
    const result = rollDiceNotation('4d6kh3', {
      exploding: true,
      rng: rngFrom([0.5]),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot be combined/i);
  });

  test('d20 rolls do not explode even when exploding dice is enabled', () => {
    const result = rollDiceNotation('1d20+5', {
      exploding: true,
      rng: rngFrom([0.999]),
    });

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

  test('mixed damage dice do not invent a critical state from an unrelated d20 pool', () => {
    const result = rollDiceNotation('2d20+1d6', {
      rng: rngFrom([0.999, 0, 0.5]),
    });

    expect(result.total).toBe(25);
    expect(result.isCrit).toBe(false);
    expect(result.isFumble).toBe(false);
  });

  test('advantage ties keep one d20 and mark the other as dropped for display', () => {
    const result = rollDiceNotation('1d20+5', {
      rollType: 'advantage',
      rng: rngFrom([0.49, 0.49]),
    });

    expect(result.rolls.map(roll => roll.result)).toEqual([10, 10]);
    expect(result.rolls[0].dropped).toBe(false);
    expect(result.rolls[1].dropped).toBe(true);
    expect(result.visibleRolls).toHaveLength(1);
    expect(result.total).toBe(15);
    expect(getAnimationTarget(result)).toBe(10);
  });
});

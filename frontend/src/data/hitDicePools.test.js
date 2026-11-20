import { hitDicePools, longRestHitDice, spendHitDie } from './hitDicePools';
import fixture from './__fixtures__/hitDicePoolCases.json';

describe('shared Hit Dice pool cases', () => {
  test.each(fixture.cases.map((c) => [c.name, c]))('%s', (_name, c) => {
    expect(hitDicePools(c.character).map((pool) => [pool.sides, pool.total, pool.remaining])).toEqual(c.pools);
    expect(spendHitDie(c.character, c.spend).updates.hit_dice_remaining_by_die).toEqual(c.after_spend);
  });

  test.each(fixture.long_rest.map((c) => [c.name, c]))('long rest: %s', (_name, c) => {
    expect(longRestHitDice(c.character, c.edition).hit_dice_remaining_by_die).toEqual(c.after);
  });
});

test('a Fighter 1 / Wizard 1 cannot spend the d10 twice (review finding 10)', () => {
  const first = spendHitDie({ class_levels: { Fighter: 1, Wizard: 1 }, hit_dice_remaining: 2 });
  expect(first.sides).toBe(10);
  const second = spendHitDie({ class_levels: { Fighter: 1, Wizard: 1 }, ...first.updates }, 10);
  expect(second).toBeNull();
  expect(spendHitDie({ class_levels: { Fighter: 1, Wizard: 1 }, ...first.updates }, 6).sides).toBe(6);
});

test('an empty pool cannot be spent and totals stay in step', () => {
  const spent = spendHitDie({ character_class: 'Wizard', level: 2, hit_dice_remaining: 1 });
  expect(spent.updates).toEqual({ hit_dice_remaining: 0, hit_dice_remaining_by_die: { 6: 0 } });
  expect(spendHitDie({ character_class: 'Wizard', level: 2, ...spent.updates })).toBeNull();
});

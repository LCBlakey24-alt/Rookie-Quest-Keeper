import {
  buildConsumableUseUpdate,
  consumeConsumableState,
  rollDice,
} from './cleanCombatTabUtils';

describe('combat consumable persistence', () => {
  test('legacy string potion is removed after use', () => {
    const character = {
      max_hit_points: 20,
      current_hit_points: 5,
      inventory: ['Potion of Healing', 'Rope'],
      equipment: [],
    };

    expect(buildConsumableUseUpdate(character, 'Potion of Healing', 7)).toEqual({
      current_hit_points: 12,
      inventory: ['Rope'],
      equipment: [],
      consumed: true,
    });
  });

  test('only one legacy string potion is consumed when duplicates exist', () => {
    const character = {
      inventory: ['Potion of Healing', 'Potion of Healing'],
      equipment: [],
    };

    expect(consumeConsumableState(character, 'Potion of Healing')).toMatchObject({
      inventory: ['Potion of Healing'],
      consumed: true,
    });
  });

  test('stacked object consumable decrements quantity instead of removing the stack', () => {
    const potion = { id: 'potion-1', name: 'Potion of Healing', type: 'Consumable', quantity: 3, qty: 3 };
    const character = { inventory: [potion], equipment: [] };

    const result = consumeConsumableState(character, potion);

    expect(result.consumed).toBe(true);
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toMatchObject({ quantity: 2, qty: 2 });
  });

  test('single object consumable is removed from equipment when that is its source', () => {
    const potion = { id: 'belt-potion', name: 'Potion of Healing', type: 'Consumable', quantity: 1 };
    const character = { inventory: [], equipment: [potion] };

    expect(consumeConsumableState(character, potion)).toEqual({
      inventory: [],
      equipment: [],
      consumed: true,
    });
  });

  test('legacy character without current HP is treated as being at saved max HP', () => {
    const potion = { name: 'Potion of Healing', type: 'Consumable', quantity: 1 };
    const character = {
      max_hit_points: 24,
      inventory: [potion],
      equipment: [],
    };

    expect(buildConsumableUseUpdate(character, potion, 8)).toMatchObject({
      current_hit_points: 24,
      inventory: [],
      consumed: true,
    });
  });

  test('missing consumable does not mutate either carried list', () => {
    const character = { inventory: ['Rope'], equipment: ['Torch'] };

    expect(consumeConsumableState(character, 'Potion of Healing')).toEqual({
      inventory: ['Rope'],
      equipment: ['Torch'],
      consumed: false,
    });
  });
});

describe('combat damage rolls', () => {
  test('uses the shared dice engine deterministically for ordinary damage', () => {
    const values = [0, 0.999];
    let index = 0;

    expect(rollDice(2, 6, 3, () => values[index++])).toEqual({
      rolls: [1, 6],
      total: 10,
      notation: '2d6+3',
    });
  });

  test('a damage penalty can reduce the result to zero but never below zero', () => {
    expect(rollDice(1, 4, -3, () => 0)).toMatchObject({ rolls: [1], total: 0 });
    expect(rollDice(1, 4, -99, () => 0)).toMatchObject({ rolls: [1], total: 0 });
  });

  test('legacy flat damage represented as d1 remains deterministic and never rolls randomness', () => {
    let calls = 0;
    const result = rollDice(5, 1, -2, () => {
      calls += 1;
      return 0.999;
    });

    expect(result).toEqual({
      rolls: [1, 1, 1, 1, 1],
      total: 3,
      notation: '5 -2',
    });
    expect(calls).toBe(0);
  });
});

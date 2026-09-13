import {
  buildConsumableUseUpdate,
  consumeConsumableState,
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

/**
 * Review finding 14: only healing items heal. A Potion of Invisibility used
 * from Combat was consumed and gave 2d4+2 HP.
 */
import { buildConsumableUseUpdate, getPotionHealing } from './cleanCombatTabUtils';

describe('which consumables heal', () => {
  test.each([
    ['Potion of Healing', { count: 2, sides: 4, modifier: 2 }],
    ['Potion of Greater Healing', { count: 4, sides: 4, modifier: 4 }],
    ['Potion of Superior Healing', { count: 8, sides: 4, modifier: 8 }],
    ['Potion of Supreme Healing', { count: 10, sides: 4, modifier: 20 }],
  ])('%s heals by its tier', (name, dice) => {
    expect(getPotionHealing({ name, type: 'Potion' })).toEqual(dice);
    expect(getPotionHealing(name)).toEqual(dice); // legacy string items too
  });

  test.each([
    'Potion of Invisibility',
    'Potion of Giant Strength',
    'Potion of Fire Breath',
    'Antitoxin',
    'Oil of Slipperiness',
    'Superior Rations',
  ])('%s does not heal', (name) => {
    expect(getPotionHealing({ name, type: 'Consumable', description: 'A greater effect for a supreme moment.' })).toBeNull();
  });

  test('a custom consumable heals only with its own healing dice', () => {
    expect(getPotionHealing({ name: 'Moonberry Tonic', type: 'Consumable', healing_dice: '3d6 + 1' })).toEqual({ count: 3, sides: 6, modifier: 1 });
    expect(getPotionHealing({ name: 'Moonberry Tonic', type: 'Consumable' })).toBeNull();
  });
});

describe('using one', () => {
  test('a non-healing potion is consumed (one from a stack) without touching HP', () => {
    const potion = { id: 'inv', name: 'Potion of Invisibility', type: 'Potion', quantity: 2 };
    const character = { current_hit_points: 6, max_hit_points: 20, inventory: [potion] };
    const updates = buildConsumableUseUpdate(character, potion, 0);
    expect(updates).toMatchObject({ current_hit_points: 6, consumed: true });
    expect(updates.inventory[0]).toMatchObject({ quantity: 1 });
  });

  test('healing a dying character clears their death saves', () => {
    const potion = { id: 'p', name: 'Potion of Healing', type: 'Potion', quantity: 1 };
    const character = { current_hit_points: 0, max_hit_points: 20, death_saves_successes: 1, death_saves_failures: 2, inventory: [potion] };
    expect(buildConsumableUseUpdate(character, potion, 7)).toMatchObject({ current_hit_points: 7, death_saves_successes: 0, death_saves_failures: 0 });
  });

  test('healing a conscious character leaves death saves alone', () => {
    const potion = { id: 'p', name: 'Potion of Healing', type: 'Potion', quantity: 1 };
    const updates = buildConsumableUseUpdate({ current_hit_points: 5, max_hit_points: 20, inventory: [potion] }, potion, 7);
    expect(updates).not.toHaveProperty('death_saves_failures');
    expect(updates.current_hit_points).toBe(12);
  });
});

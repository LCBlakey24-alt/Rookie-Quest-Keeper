import {
  buildConsumableUseUpdate,
  consumeConsumableState,
  gatherEquippedWeapons,
  getEquippedWeaponAttack,
  hasWeaponProficiency,
  rollAttackDamage,
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

  test('critical weapon damage doubles dice but not the flat modifier', () => {
    const values = [0, 0.2, 0.5, 0.999];
    let index = 0;

    expect(rollAttackDamage(
      { count: 2, sides: 6, modifier: 3 },
      { critical: true, rng: () => values[index++] },
    )).toEqual({
      rolls: [1, 2, 4, 6],
      total: 16,
      notation: '4d6+3',
      count: 4,
      sides: 6,
      modifier: 3,
      critical: true,
    });
  });

  test('critical flat damage does not double legacy fixed damage', () => {
    expect(rollAttackDamage(
      { count: 1, sides: 1, modifier: 4 },
      { critical: true, rng: () => 0.999 },
    )).toEqual({
      rolls: [1],
      total: 5,
      notation: '1 +4',
      count: 1,
      sides: 1,
      modifier: 4,
      critical: false,
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

describe('weapon attack proficiency', () => {
  const longsword = { name: 'Longsword', equipped: true };

  test('adds proficiency bonus when the character is proficient with the weapon category', () => {
    const character = { weapon_proficiencies: ['Martial weapons'], equipment: [longsword] };
    const [attack] = gatherEquippedWeapons(character, 3, 1, 3, 2);

    expect(hasWeaponProficiency(character, longsword)).toBe(true);
    expect(attack).toMatchObject({ title: 'Longsword', attackMod: 5, proficient: true });
  });

  test('does not add proficiency bonus for a known weapon outside explicit proficiencies', () => {
    const character = { weapon_proficiencies: ['Simple weapons'], equipment: [longsword] };
    const [attack] = gatherEquippedWeapons(character, 3, 1, 3, 2);

    expect(hasWeaponProficiency(character, longsword)).toBe(false);
    expect(attack).toMatchObject({ attackMod: 3, proficient: false });
    expect(attack.details).toContain('Not proficient');
  });

  test('supports proficiency with a specifically named weapon', () => {
    const character = { weapon_proficiencies: ['Longsword'], equipment: [longsword] };
    const [attack] = gatherEquippedWeapons(character, 3, 1, 3, 2);

    expect(attack).toMatchObject({ attackMod: 5, proficient: true });
  });

  test('keeps legacy characters without saved weapon proficiency data working as before', () => {
    const character = { equipment: [longsword] };
    const [attack] = gatherEquippedWeapons(character, 3, 1, 3, 2);

    expect(attack).toMatchObject({ attackMod: 5, proficient: true });
  });

  test('an explicit item proficiency flag overrides the character list', () => {
    const character = { weapon_proficiencies: ['Martial weapons'], equipment: [{ ...longsword, proficient: false }] };
    const [attack] = gatherEquippedWeapons(character, 3, 1, 3, 2);

    expect(attack).toMatchObject({ attackMod: 3, proficient: false });
  });
});


describe('canonical hand-slot combat attacks', () => {
  test('preserves two same-name weapons as distinct main-hand and off-hand attacks', () => {
    const character = {
      weapon_proficiencies: ['Simple weapons'],
      equipped: {
        mainHand: { id: 'dagger-main', name: 'Dagger', equip_slot: 'mainHand', equipped: true },
        offHand: { id: 'dagger-off', name: 'Dagger', equip_slot: 'offHand', equipped: true },
      },
    };

    const main = getEquippedWeaponAttack(character, 'mainHand', 1, 4, 4, 3);
    const off = getEquippedWeaponAttack(character, 'offHand', 1, 4, 4, 3);

    expect(main).toMatchObject({ title: 'Dagger', attackMod: 7, equipSlot: 'mainHand' });
    expect(off).toMatchObject({ title: 'Dagger', attackMod: 7, equipSlot: 'offHand' });
  });

  test('does not treat a shield in the off-hand slot as an off-hand weapon attack', () => {
    const character = {
      equipped: {
        mainHand: { name: 'Longsword', equipped: true },
        offHand: { name: 'Shield', type: 'Armor', equipped: true },
      },
    };

    expect(getEquippedWeaponAttack(character, 'offHand', 3, 1, 3, 2)).toBeNull();
  });

  test('falls back to equipped inventory slot metadata when the equipped map is missing', () => {
    const character = {
      weapon_proficiencies: ['Simple weapons'],
      inventory: [
        { id: 'dagger-off', name: 'Dagger', equipped: true, equip_slot: 'offHand' },
      ],
    };

    expect(getEquippedWeaponAttack(character, 'offHand', 1, 4, 4, 3)).toMatchObject({
      title: 'Dagger',
      attackMod: 7,
      equipSlot: 'offHand',
    });
  });

  test('off-hand profile respects non-proficiency instead of adding PB', () => {
    const character = {
      weapon_proficiencies: ['Simple weapons'],
      equipped: {
        offHand: { name: 'Longsword', equipped: true },
      },
    };

    expect(getEquippedWeaponAttack(character, 'offHand', 3, 1, 3, 2)).toMatchObject({
      title: 'Longsword',
      attackMod: 3,
      proficient: false,
      equipSlot: 'offHand',
    });
  });
});

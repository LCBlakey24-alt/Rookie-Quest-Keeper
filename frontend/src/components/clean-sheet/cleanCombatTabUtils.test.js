import {
  buildConsumableUseUpdate,
  consumeConsumableState,
  gatherEquippedWeapons,
  getAttacksPerAction,
  getEquippedWeaponAttack,
  getMonkBonusUnarmedAction,
  getOpportunityAttackProfile,
  getUnarmedStrikeProfile,
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


describe('opportunity attack profile', () => {
  test('uses the equipped main-hand melee weapon and its real modifier', () => {
    const character = {
      weapon_proficiencies: ['Martial weapons'],
      equipped: { mainHand: { name: 'Longsword', equipped: true } },
    };

    expect(getOpportunityAttackProfile(character, 3, 1, 3, 2)).toMatchObject({
      title: 'Longsword',
      attackMod: 5,
      isMelee: true,
    });
  });

  test('uses an off-hand melee weapon when the main hand is ranged', () => {
    const character = {
      weapon_proficiencies: ['Simple weapons', 'Martial weapons'],
      equipped: {
        mainHand: { name: 'Longbow', equipped: true },
        offHand: { name: 'Dagger', equipped: true },
      },
    };

    expect(getOpportunityAttackProfile(character, 1, 4, 4, 3)).toMatchObject({
      title: 'Dagger',
      attackMod: 7,
      isMelee: true,
      equipSlot: 'offHand',
    });
  });

  test('falls back to an unarmed strike when no equipped melee weapon is available', () => {
    const character = {
      weapon_proficiencies: ['Martial weapons'],
      equipped: { mainHand: { name: 'Longbow', equipped: true } },
    };

    expect(getOpportunityAttackProfile(character, 2, 4, 4, 3)).toMatchObject({
      title: 'Unarmed Strike',
      attackMod: 5,
      isMelee: true,
      damageType: 'bludgeoning',
    });
  });

  test('a thrown melee weapon still qualifies as a melee opportunity-attack profile', () => {
    const character = {
      weapon_proficiencies: ['Simple weapons'],
      equipped: { mainHand: { name: 'Dagger', equipped: true } },
    };

    expect(getOpportunityAttackProfile(character, 1, 4, 4, 3)).toMatchObject({
      title: 'Dagger',
      isMelee: true,
    });
  });
});


describe('attacks per Attack action', () => {
  test.each([
    [1, 1],
    [5, 2],
    [11, 3],
    [20, 4],
  ])('uses Fighter progression at level %i', (level, expected) => {
    expect(getAttacksPerAction({ character_class: 'Fighter', level })).toBe(expected);
  });

  test.each(['Barbarian', 'Monk', 'Paladin', 'Ranger'])('%s gains a second attack at class level 5', (className) => {
    expect(getAttacksPerAction({
      character_class: 'Wizard',
      level: 10,
      class_levels: { [className]: 5, Wizard: 5 },
    })).toBe(2);
  });

  test('uses class level rather than total level for multiclass Fighter progression', () => {
    expect(getAttacksPerAction({
      character_class: 'Wizard',
      level: 15,
      class_levels: { Fighter: 11, Wizard: 4 },
    })).toBe(3);

    expect(getAttacksPerAction({
      character_class: 'Wizard',
      level: 10,
      class_levels: { Fighter: 4, Wizard: 6 },
    })).toBe(1);
  });

  test('Extra Attack sources do not stack across multiclass classes', () => {
    expect(getAttacksPerAction({
      character_class: 'Fighter',
      level: 10,
      class_levels: { Fighter: 5, Ranger: 5 },
    })).toBe(2);
  });

  test('honours an explicit saved attacks-per-action override', () => {
    expect(getAttacksPerAction({
      character_class: 'Wizard',
      level: 7,
      attacks_per_action: 3,
    })).toBe(3);
  });

  test('recognises a saved Extra Attack feature for homebrew or unsupported class sources', () => {
    expect(getAttacksPerAction({
      character_class: 'Warlock',
      level: 5,
      class_features: [{ name: 'Extra Attack' }],
    })).toBe(2);
  });

  test('honours a feature-provided attacksPerAction value above the class baseline', () => {
    expect(getAttacksPerAction({
      character_class: 'Fighter',
      level: 5,
      class_features: [{ name: 'Homebrew Multiattack', attacksPerAction: 3 }],
    })).toBe(3);
  });
});


describe('unarmed strike profile', () => {
  test('ordinary unarmed strikes use Strength and preserve a negative modifier', () => {
    expect(getUnarmedStrikeProfile({ character_class: 'Wizard', level: 1 }, -1, 4, 2)).toMatchObject({
      attackMod: 1,
      martialArtsActive: false,
      damageText: '1 -1',
      damage: { count: 1, sides: 1, modifier: -1 },
    });
  });

  test('2014 Monk uses Dexterity and the Martial Arts die while eligible', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2014',
      equipped: {},
    }, 1, 4, 3)).toMatchObject({
      attackMod: 7,
      martialArtsActive: true,
      damageText: 'd6 +4',
      damage: { sides: 6, modifier: 4 },
    });
  });

  test('2024 Monk uses the revised Martial Arts die progression', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2024',
      equipped: {},
    }, 1, 4, 3)).toMatchObject({
      attackMod: 7,
      martialArtsActive: true,
      damageText: 'd8 +4',
      damage: { sides: 8, modifier: 4 },
    });
  });

  test('armour disables Martial Arts benefits for the unarmed profile', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2014',
      equipped: {
        armor: { name: 'Leather Armor', equipped: true },
      },
    }, 2, 4, 3)).toMatchObject({
      attackMod: 5,
      martialArtsActive: false,
      damage: { sides: 1, modifier: 2 },
    });
  });

  test('a shield disables Martial Arts benefits for the unarmed profile', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2024',
      equipped: {
        offHand: { name: 'Shield', type: 'Armor', equipped: true },
      },
    }, 2, 4, 3)).toMatchObject({
      attackMod: 5,
      martialArtsActive: false,
      damage: { sides: 1, modifier: 2 },
    });
  });

  test('2014 Monk Martial Arts stays active with a valid monk weapon', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 1,
      rules_edition: '2014',
      equipped: {
        mainHand: { name: 'Quarterstaff', equipped: true },
      },
    }, 1, 3, 2)).toMatchObject({
      attackMod: 5,
      martialArtsActive: true,
      damage: { sides: 4, modifier: 3 },
    });
  });

  test('a non-Monk weapon disables Martial Arts benefits', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2014',
      equipped: {
        mainHand: { name: 'Greatsword', equipped: true },
      },
    }, 2, 4, 3)).toMatchObject({
      attackMod: 5,
      martialArtsActive: false,
      damage: { sides: 1, modifier: 2 },
    });
  });

  test('2024 Monk accepts a Light martial melee weapon as a Monk weapon', () => {
    expect(getUnarmedStrikeProfile({
      character_class: 'Monk',
      level: 1,
      rules_edition: '2024',
      equipped: {
        mainHand: { name: 'Shortsword', equipped: true },
      },
    }, 1, 3, 2)).toMatchObject({
      attackMod: 5,
      martialArtsActive: true,
      damage: { sides: 6, modifier: 3 },
    });
  });

  test('opportunity-attack unarmed fallback reuses the Monk Martial Arts profile', () => {
    expect(getOpportunityAttackProfile({
      character_class: 'Monk',
      level: 5,
      rules_edition: '2024',
      equipped: {
        mainHand: { name: 'Longbow', equipped: true },
      },
    }, 1, 4, 4, 3)).toMatchObject({
      title: 'Unarmed Strike',
      attackMod: 4,
      martialArtsActive: false,
    });
  });
});


describe('Monk Martial Arts bonus action', () => {
  test('2014 eligible Monk gets the conditional bonus unarmed strike reminder', () => {
    const character = { character_class: 'Monk', level: 1, rules_edition: '2014', equipped: {} };
    const unarmed = getUnarmedStrikeProfile(character, 1, 3, 2);
    const action = getMonkBonusUnarmedAction(character, unarmed);

    expect(action).toMatchObject({
      title: 'Martial Arts · Unarmed Strike',
      type: 'Bonus',
      attackMod: 5,
    });
    expect(action.description).toContain('After you take the Attack action');
  });

  test('2024 eligible Monk gets the direct Bonus Action wording', () => {
    const character = { character_class: 'Monk', level: 1, rules_edition: '2024', equipped: {} };
    const unarmed = getUnarmedStrikeProfile(character, 1, 3, 2);
    const action = getMonkBonusUnarmedAction(character, unarmed);

    expect(action).toMatchObject({ attackMod: 5 });
    expect(action.description).toContain('Use your Bonus Action');
    expect(action.description).not.toContain('After you take the Attack action');
  });

  test('Martial Arts bonus strike is hidden while Martial Arts is inactive', () => {
    const character = {
      character_class: 'Monk',
      level: 3,
      rules_edition: '2014',
      equipped: { armor: { name: 'Leather Armor', equipped: true } },
    };
    const unarmed = getUnarmedStrikeProfile(character, 2, 4, 2);
    expect(getMonkBonusUnarmedAction(character, unarmed)).toBeNull();
  });
});

import {
  deriveArmorClass,
  deriveEquippedWeaponAttacks,
} from './characterCombatDerivations';

const baseCharacter = {
  strength: 16,
  dexterity: 16,
  equipped: {},
  equipment: [],
  inventory: [],
};

describe('character combat derivations', () => {
  test('equipping studded leather and legacy shield key updates AC from equipment', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        shield: { name: 'Shield', type: 'shield' },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(17);
  });

  test('canonical off-hand shield gives the same AC as legacy shield storage', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        offHand: { name: 'Shield', type: 'shield', ac_bonus: 2 },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(17);
  });

  test('named enhanced shield adds only its magical bonus beyond the normal shield rule', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        offHand: { name: 'Shield +1', type: 'shield', ac_bonus: 2 },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(18);
  });

  test('explicit shield enhancement metadata is not confused with inherent shield AC', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        offHand: { name: 'Guardian Shield', type: 'shield', ac_bonus: 2, magic_ac_bonus: 2 },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(19);
  });

  test('non-shield off-hand weapon does not accidentally grant shield AC', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        offHand: { name: 'Dagger', type: 'weapon', damage_dice: '1d4' },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(15);
  });

  test('persisted unarmoured shield AC is not given the shield bonus a second time', () => {
    const character = {
      ...baseCharacter,
      armor_class: 15,
      equipped: {
        offHand: { name: 'Shield', type: 'shield', ac_bonus: 2 },
      },
    };

    expect(deriveArmorClass(character)).toBe(15);
    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(15);
  });

  test('persisted armoured AC stays authoritative on ordinary sheet renders', () => {
    const character = {
      ...baseCharacter,
      armor_class: 17,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        offHand: { name: 'Shield', type: 'shield', ac_bonus: 2 },
      },
    };

    expect(deriveArmorClass(character)).toBe(17);
  });

  test('equipment recalculation still ignores a stale stored AC when explicitly requested', () => {
    const character = {
      ...baseCharacter,
      armor_class: 10,
      equipped: {
        armor: { name: 'Plate', type: 'armor' },
      },
    };

    expect(deriveArmorClass(character)).toBe(10);
    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(18);
  });

  test('equipped weapons become attacks but armour does not', () => {
    const character = {
      ...baseCharacter,
      equipment: [
        { name: 'Longsword', equipped: true, type: 'weapon' },
        { name: 'Studded Leather', equipped: true, type: 'armor' },
      ],
    };

    const attacks = deriveEquippedWeaponAttacks(character, 2);

    expect(attacks.map(attack => attack.title)).toContain('Longsword');
    expect(attacks.map(attack => attack.title)).not.toContain('Studded Leather');
    expect(attacks[0].attackText).toBe('+5');
    expect(attacks[0].damageText).toBe('1d8 +3');
  });

  test('finesse weapons use the stronger dexterity or strength modifier', () => {
    const character = {
      ...baseCharacter,
      strength: 10,
      dexterity: 18,
      equipped: { mainHand: { name: 'Rapier', type: 'weapon' } },
    };

    const [attack] = deriveEquippedWeaponAttacks(character, 3);

    expect(attack.title).toBe('Rapier');
    expect(attack.attackText).toBe('+7');
    expect(attack.damageText).toBe('1d8 +4');
  });
});

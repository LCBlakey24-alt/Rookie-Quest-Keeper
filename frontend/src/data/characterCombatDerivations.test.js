import {
  deriveArmorClass,
  deriveWalkingSpeed,
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

  for (const edition of ['2014', '2024']) {
    test(`${edition} Monk uses DEX + WIS unarmoured and armour disables it`, () => {
      const monk = {
        ...baseCharacter,
        character_class: 'Monk', level: 4, edition,
        dexterity: 18, wisdom: 13, armor_class: 13,
      };
      expect(deriveArmorClass(monk)).toBe(15); // legacy saved 13 is not a class AC
      expect(deriveArmorClass(monk, { ignoreStoredAc: true })).toBe(15);
      expect(deriveArmorClass({ ...monk, equipped: { armor: { name: 'Leather Armor' } } }, { ignoreStoredAc: true })).toBe(15);
      expect(deriveArmorClass({ ...monk, equipped: { offHand: { name: 'Shield' } } }, { ignoreStoredAc: true })).toBe(16);
      expect(deriveArmorClass({ ...monk, armor_class: 20 })).toBe(20); // custom/high AC is retained
      expect(deriveArmorClass({ ...monk, armor_class_manual: true })).toBe(13);
    });
  }

  test('Monk Unarmored Defense respects multiclass level, negative WIS, and equipment removal', () => {
    const multiclassMonk = {
      ...baseCharacter, class_levels: { Fighter: 2, Monk: 4 }, level: 6,
      dexterity: 18, wisdom: 16, armor_class: 14,
    };
    expect(deriveArmorClass(multiclassMonk)).toBe(17);
    expect(deriveArmorClass({ ...multiclassMonk, equipped: { armor: { name: 'Leather Armor' } } }, { ignoreStoredAc: true })).toBe(15);
    expect(deriveArmorClass({ ...multiclassMonk, equipped: {} }, { ignoreStoredAc: true })).toBe(17);
    expect(deriveArmorClass({ ...multiclassMonk, wisdom: 8, armor_class: 0 }, { ignoreStoredAc: true })).toBe(14);
    expect(deriveArmorClass({ ...baseCharacter, armor_class: 14 })).toBe(14);
  });

  for (const edition of ['2014', '2024']) {
    test(`${edition} Monk movement adds unarmoured bonus only when eligible`, () => {
      const monk = { character_class: 'Monk', level: 4, edition, speed: 35, equipped: {} };
      expect(deriveWalkingSpeed(monk)).toBe(45);
      expect(deriveWalkingSpeed({ ...monk, equipped: { armor: { name: 'Leather Armor' } } })).toBe(35);
      expect(deriveWalkingSpeed({ ...monk, equipped: { offHand: { name: 'Shield' } } })).toBe(35);
      expect(deriveWalkingSpeed({ ...monk, speed_includes_class_bonus: true })).toBe(35);
      expect(deriveWalkingSpeed({ ...monk, level: 1 })).toBe(35);
      expect(deriveWalkingSpeed({ ...monk, level: 6 })).toBe(50);
      expect(deriveWalkingSpeed({ ...monk, level: 10 })).toBe(55);
      expect(deriveWalkingSpeed({ ...monk, level: 18 })).toBe(65);
      expect(deriveWalkingSpeed({ ...baseCharacter, character_class: 'Fighter', speed: 30 })).toBe(30);
    });
  }

  test('multiclass Monk movement uses Monk levels, not character total level', () => {
    expect(deriveWalkingSpeed({ class_levels: { Monk: 2, Fighter: 18 }, level: 20, speed: 30 })).toBe(40);
    expect(deriveWalkingSpeed({ class_levels: { Monk: 1, Fighter: 19 }, level: 20, speed: 30 })).toBe(30);
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

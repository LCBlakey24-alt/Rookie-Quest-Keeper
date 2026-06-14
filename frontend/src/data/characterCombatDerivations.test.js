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
  test('equipping studded leather and shield updates AC from equipment', () => {
    const character = {
      ...baseCharacter,
      equipped: {
        armor: { name: 'Studded Leather', type: 'armor' },
        shield: { name: 'Shield', type: 'shield' },
      },
    };

    expect(deriveArmorClass(character, { ignoreStoredAc: true })).toBe(17);
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

  test('fighter fighting styles update AC and attacks', () => {
    const defenseFighter = {
      ...baseCharacter,
      fighting_style: 'Defense',
      equipped: {
        armor: { name: 'Chain Mail', type: 'armor' },
      },
    };
    expect(deriveArmorClass(defenseFighter, { ignoreStoredAc: true })).toBe(17);

    const archeryFighter = {
      ...baseCharacter,
      strength: 10,
      dexterity: 16,
      fighting_style: 'Archery',
      equipped: { mainHand: { name: 'Longbow', type: 'weapon' } },
    };
    const [longbow] = deriveEquippedWeaponAttacks(archeryFighter, 2);
    expect(longbow.attackText).toBe('+7');
    expect(longbow.details).toContain('Archery +2 to hit');

    const duelingFighter = {
      ...baseCharacter,
      fighting_style: 'Dueling',
      equipped: { mainHand: { name: 'Longsword', type: 'weapon' }, shield: { name: 'Shield', type: 'shield' } },
    };
    const [longsword] = deriveEquippedWeaponAttacks(duelingFighter, 2);
    expect(longsword.damageText).toBe('1d8 +5');
    expect(longsword.details).toContain('Dueling +2 damage');
  });
});

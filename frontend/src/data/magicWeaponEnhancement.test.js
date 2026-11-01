/**
 * Regression tests: a +N magic weapon must add +N to BOTH attack and damage.
 *
 * The attack path read only `item.attack_bonus`, but no catalogue row defines
 * that field -- itemsDatabase ships "Weapon +1/+2/+3" and
 * "Ammunition +1/+2/+3" which state the bonus in the NAME. Meanwhile the AC
 * path already parsed the suffix, so equipping "Armor +1" gave +1 AC while
 * "Weapon +1" gave +0 attack and +0 damage. That asymmetry is the bug.
 */
import { weaponEnhancementBonus } from './equipmentRules5e';
import { deriveWeaponAttack } from './characterCombatDerivations';
import { calculateArmorAc } from './armorRules5e';

const FIGHTER = {
  character_class: 'Fighter',
  level: 5,
  strength: 16, // +3
  dexterity: 10,
};

describe('weaponEnhancementBonus', () => {
  test('reads the +N stated in the item name', () => {
    expect(weaponEnhancementBonus({ name: 'Weapon +1' })).toBe(1);
    expect(weaponEnhancementBonus({ name: 'Weapon +2' })).toBe(2);
    expect(weaponEnhancementBonus({ name: 'Weapon +3' })).toBe(3);
    expect(weaponEnhancementBonus({ name: 'Ammunition +2' })).toBe(2);
    expect(weaponEnhancementBonus({ name: 'Longsword +1' })).toBe(1);
  });

  test('an explicitly stored bonus wins over the name', () => {
    expect(weaponEnhancementBonus({ name: 'Weapon +1', attack_bonus: 3 })).toBe(3);
    expect(weaponEnhancementBonus({ attackBonus: 2 })).toBe(2);
  });

  test('plain weapons contribute nothing', () => {
    expect(weaponEnhancementBonus({ name: 'Longsword' })).toBe(0);
    expect(weaponEnhancementBonus({ name: '' })).toBe(0);
    expect(weaponEnhancementBonus(null)).toBe(0);
    expect(weaponEnhancementBonus(undefined)).toBe(0);
    expect(weaponEnhancementBonus('Longsword +1')).toBe(0); // not an object
  });

  test('does not match a number that is not an enhancement suffix', () => {
    // Guards against picking up damage text or similar from a name.
    expect(weaponEnhancementBonus({ name: 'Crossbow' })).toBe(0);
    expect(weaponEnhancementBonus({ name: 'Flame Tongue' })).toBe(0);
  });
});

describe('a +N weapon reaches both attack and damage', () => {
  test('Longsword +1 adds 1 to attack and 1 to damage', () => {
    const plain = deriveWeaponAttack({ name: 'Longsword' }, FIGHTER, 3);
    const magic = deriveWeaponAttack({ name: 'Longsword +1' }, FIGHTER, 3);

    expect(magic.attackMod).toBe(plain.attackMod + 1);
    expect(magic.damage.modifier).toBe(plain.damage.modifier + 1);
  });

  test('the bonus scales with the enhancement', () => {
    const plain = deriveWeaponAttack({ name: 'Longsword' }, FIGHTER, 3);
    [1, 2, 3].forEach((n) => {
      const magic = deriveWeaponAttack({ name: `Longsword +${n}` }, FIGHTER, 3);
      expect(magic.attackMod).toBe(plain.attackMod + n);
      expect(magic.damage.modifier).toBe(plain.damage.modifier + n);
    });
  });

  test('the regression: a catalogue "Weapon +1" is no longer inert', () => {
    const plain = deriveWeaponAttack({ name: 'Weapon' }, FIGHTER, 3);
    const magic = deriveWeaponAttack({ name: 'Weapon +1' }, FIGHTER, 3);
    expect(magic.attackMod).toBeGreaterThan(plain.attackMod);
    expect(magic.damage.modifier).toBeGreaterThan(plain.damage.modifier);
  });

  test('an explicit attack_bonus still works as before', () => {
    const plain = deriveWeaponAttack({ name: 'Longsword' }, FIGHTER, 3);
    const magic = deriveWeaponAttack({ name: 'Longsword', attack_bonus: 2 }, FIGHTER, 3);
    expect(magic.attackMod).toBe(plain.attackMod + 2);
    expect(magic.damage.modifier).toBe(plain.damage.modifier + 2);
  });
});

describe('weapons and armour now treat +N consistently', () => {
  test('Armor +1 already added AC, and Weapon +1 now adds attack', () => {
    // This pairing is the asymmetry that revealed the bug: both catalogue rows
    // state their bonus the same way, so both must be honoured.
    const acPlain = calculateArmorAc({ armor: { name: 'Chain Mail' }, shield: null, dexMod: 0, unarmoredAc: 10 });
    const acMagic = calculateArmorAc({ armor: { name: 'Chain Mail +1' }, shield: null, dexMod: 0, unarmoredAc: 10 });
    expect(acMagic).toBe(acPlain + 1);

    const atkPlain = deriveWeaponAttack({ name: 'Longsword' }, FIGHTER, 3).attackMod;
    const atkMagic = deriveWeaponAttack({ name: 'Longsword +1' }, FIGHTER, 3).attackMod;
    expect(atkMagic).toBe(atkPlain + 1);
  });
});

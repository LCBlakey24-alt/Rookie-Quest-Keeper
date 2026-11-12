import {
  BODY_SLOTS, carriedWeight, carryingCapacity, coinWeight, isTwoHanded, itemWeight, offHandBlocked,
  slotsForItem, slotsToClear, wornMagicAcBonus,
} from './equipmentLoadout';
import { deriveArmorClass } from './characterCombatDerivations';

describe('body slots', () => {
  test('one of each kind, and two rings', () => {
    const ids = BODY_SLOTS.map((slot) => slot.id);
    expect(ids).toEqual(['head', 'neck', 'shoulders', 'armor', 'mainHand', 'offHand', 'gauntlets', 'wrists', 'waist', 'boots', 'ring1', 'ring2']);
  });

  test.each([
    ['Ring of Protection', ['ring1', 'ring2']],
    ['Amulet of Health', ['neck']],
    ['Cloak of Protection', ['shoulders']],
    ['Bracers of Defense', ['wrists']],
    ['Gauntlets of Ogre Power', ['gauntlets']],
    ['Boots of Elvenkind', ['boots']],
    ['Belt of Giant Strength', ['waist']],
    ['Circlet of Blasting', ['head']],
    ['Chain Mail', ['armor']],
    ['Shield', ['offHand']],
    ['Longsword', ['mainHand', 'offHand']],
    ['Greatsword', ['mainHand']],
    ['Rations (1 day)', []],
  ])('%s goes in %j', (name, slots) => {
    expect(slotsForItem({ name })).toEqual(slots);
  });

  test('a two-handed weapon needs both hands', () => {
    expect(isTwoHanded({ name: 'Greatsword' })).toBe(true);
    expect(slotsToClear({ offHand: { name: 'Shield' } }, { name: 'Greatsword' }, 'mainHand')).toEqual(['offHand']);
    expect(slotsToClear({ mainHand: { name: 'Greatsword' } }, { name: 'Shield' }, 'offHand')).toEqual(['mainHand']);
    expect(offHandBlocked({ mainHand: { name: 'Greataxe' } })).toBe(true);
    expect(slotsToClear({ offHand: { name: 'Dagger' } }, { name: 'Longsword' }, 'mainHand')).toEqual([]);
  });
});

describe('weight', () => {
  test('uses the item weight, else the catalogue, else nothing', () => {
    expect(itemWeight({ name: 'Mystery Box', weight: 3 })).toBe(3);
    expect(itemWeight({ name: 'Longsword' })).toBe(3);
    expect(itemWeight({ name: 'Plate Armor' })).toBe(65);
    expect(itemWeight({ name: 'A lucky pebble' })).toBe(0);
  });

  test('coins weigh 50 to the pound and quantities multiply', () => {
    expect(coinWeight({ gp: 100 })).toBe(2);
    expect(carriedWeight([{ name: 'Javelin', quantity: 5 }, { name: 'Plate Armor' }], { gp: 50 })).toBe(5 * 2 + 65 + 1);
  });

  test('carrying capacity is Strength x 15', () => {
    expect(carryingCapacity({ strength: 17 })).toBe(255);
  });
});

describe('Armour Class from worn magic items', () => {
  const ring = { name: 'Ring of Protection', requires_attunement: true, attuned: true };
  const cloak = { name: 'Cloak of Protection', requires_attunement: true, attuned: false };

  test('an attuned Ring of Protection adds 1; an unattuned cloak adds nothing', () => {
    expect(wornMagicAcBonus({ ring1: ring, shoulders: cloak })).toBe(1);
    expect(wornMagicAcBonus({ ring1: ring, shoulders: { ...cloak, attuned: true } })).toBe(2);
  });

  test('Bracers of Defense only without armour or a shield', () => {
    const bracers = { name: 'Bracers of Defense', requires_attunement: true, attuned: true };
    expect(wornMagicAcBonus({ wrists: bracers })).toBe(2);
    expect(wornMagicAcBonus({ wrists: bracers, armor: { name: 'Leather Armor' } })).toBe(0);
    expect(wornMagicAcBonus({ wrists: bracers, offHand: { name: 'Shield' } })).toBe(0);
  });

  test('recalculated AC counts them: plate 18 + shield 2 + two attuned protection items = 22', () => {
    const paladin = {
      dexterity: 10,
      equipped: {
        armor: { name: 'Plate Armor', type: 'Armor' },
        offHand: { name: 'Shield', type: 'Shield' },
        ring1: ring,
        shoulders: { ...cloak, attuned: true },
      },
    };
    expect(deriveArmorClass(paladin, { ignoreStoredAc: true })).toBe(22);
  });
});

describe('armour whose name contains "ring"', () => {
  test('Ring Mail goes in the armour slot, not on a finger', () => {
    expect(slotsForItem({ name: 'Ring Mail', type: 'Armor' })).toEqual(['armor']);
    expect(slotsForItem('Ring Mail')).toEqual(['armor']);
    expect(slotsForItem({ name: 'Ring of Protection', type: 'Ring' })).toEqual(['ring1', 'ring2']);
  });
});

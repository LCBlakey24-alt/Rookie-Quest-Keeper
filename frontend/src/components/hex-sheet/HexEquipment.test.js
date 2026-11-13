/**
 * The Equipment section of the hexagonal sheet, with a synthetic character
 * and the save step mocked: what it shows and what it would save.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import HexEquipment from './HexEquipment';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const { toast } = require('sonner');

const ring = { id: 'ring', name: 'Ring of Protection', type: 'Ring', requires_attunement: true, attuned: true };
const cloak = { id: 'cloak', name: 'Cloak of Protection', type: 'Wondrous', requires_attunement: true, attuned: true };
const amulet = { id: 'amulet', name: 'Amulet of Health', type: 'Wondrous', requires_attunement: true, attuned: false };
const PALADIN = {
  id: 'char-eq', strength: 17, dexterity: 10, level: 5, character_class: 'Paladin',
  weapon_proficiencies: ['simple', 'martial'],
  currency: { cp: 0, sp: 10, ep: 0, gp: 50, pp: 1 },
  equipped: {
    mainHand: { id: 'sword', name: 'Longsword', type: 'Weapon', damage_dice: '1d8', damage_type: 'slashing', weight: 3, equipped: true },
    offHand: { id: 'shield', name: 'Shield', type: 'Shield', weight: 6, equipped: true },
    armor: { id: 'plate', name: 'Plate Armor', type: 'Armor', weight: 65, equipped: true },
  },
  inventory: [
    { id: 'sword', name: 'Longsword', type: 'Weapon', damage_dice: '1d8', weight: 3, equipped: true, equip_slot: 'mainHand' },
    { id: 'shield', name: 'Shield', type: 'Shield', weight: 6, equipped: true, equip_slot: 'offHand' },
    { id: 'plate', name: 'Plate Armor', type: 'Armor', weight: 65, equipped: true, equip_slot: 'armor' },
    { id: 'gsword', name: 'Greatsword', type: 'Weapon', damage_dice: '2d6', weight: 6 },
    ring, cloak, amulet,
  ],
};

function renderEquipment(character = PALADIN) {
  const onSave = jest.fn().mockResolvedValue(true);
  const onRoll = jest.fn();
  const onPresent = jest.fn();
  render(<HexEquipment character={character} proficiencyBonus={3} onRoll={onRoll} onPresent={onPresent} onSave={onSave} />);
  return { onSave, onRoll, onPresent };
}

beforeEach(() => jest.clearAllMocks());

test('shows what is worn and held on the body, and empty slots as empty', () => {
  renderEquipment();
  expect(screen.getByTestId('hex-slot-mainHand')).toHaveAccessibleName('Main Hand: Longsword');
  expect(screen.getByTestId('hex-slot-armor')).toHaveAccessibleName('Armour: Plate Armor');
  expect(screen.getByTestId('hex-slot-ring1')).toHaveAccessibleName('Ring: empty');
});

test('a held weapon can attack and roll damage from its slot', () => {
  const { onRoll, onPresent } = renderEquipment();
  fireEvent.click(screen.getByTestId('hex-slot-mainHand'));
  fireEvent.click(screen.getByTestId('hex-slot-attack'));
  expect(onRoll).toHaveBeenCalledWith('Longsword Attack', 6); // STR 17 (+3) + proficiency 3
  fireEvent.click(screen.getByTestId('hex-slot-damage'));
  expect(onPresent).toHaveBeenCalledWith(expect.objectContaining({ label: 'Longsword Damage', sides: 8 }));
});

test('equipping attuned protection items saves them in their slots and raises AC: 18 + 2 + 1 + 1 = 22', async () => {
  const { onSave } = renderEquipment();
  await act(async () => { fireEvent.click(screen.getByTestId('hex-pack-equip-Ring of Protection')); });
  const [ringSave] = onSave.mock.calls[0];
  expect(ringSave.equipped.ring1).toMatchObject({ name: 'Ring of Protection' });
  expect(ringSave.armor_class).toBe(21);
  const withRing = { ...PALADIN, equipped: ringSave.equipped, inventory: ringSave.inventory };
  document.body.innerHTML = '';
  const second = renderEquipment(withRing);
  await act(async () => { fireEvent.click(screen.getByTestId('hex-pack-equip-Cloak of Protection')); });
  expect(second.onSave.mock.calls[0][0].armor_class).toBe(22);
});

test('a two-handed weapon empties the off hand', async () => {
  const { onSave } = renderEquipment();
  fireEvent.click(screen.getByTestId('hex-slot-mainHand'));
  fireEvent.click(screen.getByTestId('hex-slot-change'));
  await act(async () => { fireEvent.click(screen.getByTestId('hex-equip-choice-Greatsword')); });
  const [saved] = onSave.mock.calls[0];
  expect(saved.equipped.mainHand).toMatchObject({ name: 'Greatsword' });
  expect(saved.equipped.offHand).toBeUndefined();
  expect(saved.armor_class).toBe(18); // the shield came off
});

test('attunement stops at three items', () => {
  const full = { ...PALADIN, inventory: [...PALADIN.inventory.filter((item) => item.id !== 'amulet'), { ...amulet }, { id: 'boots', name: 'Boots of Elvenkind', requires_attunement: true, attuned: true }] };
  const { onSave } = renderEquipment(full);
  const pack = screen.getByRole('region', { name: 'Backpack' });
  fireEvent.click(within(within(pack).getByText('Amulet of Health').closest('li')).getByRole('button', { name: 'Attune' }));
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Already attuned to 3'));
  expect(onSave).not.toHaveBeenCalled();
});

test('money can be edited and saved, and weight counts coins at 50 to the pound', async () => {
  const { onSave } = renderEquipment();
  // Longsword 3 + Shield 6 + Plate 65 + Greatsword 6 = 80 lb, plus 61 coins / 50 = 1.22 lb.
  expect(screen.getByTestId('hex-weight')).toHaveTextContent('81.2 / 255 lb');
  fireEvent.click(screen.getByTestId('hex-money-edit'));
  fireEvent.change(screen.getByLabelText('Gold pieces'), { target: { value: '75' } });
  await act(async () => { fireEvent.click(screen.getByTestId('hex-money-save')); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ currency: expect.objectContaining({ gp: 75 }) }), expect.anything());
});

test('a spare copy of a worn name-only item stays in the backpack', () => {
  const fighter = {
    id: 'char-daggers', strength: 12, dexterity: 14, level: 1, character_class: 'Rogue',
    equipped: { mainHand: { name: 'Dagger', type: 'Weapon', damage_dice: '1d4', equipped: true } },
    inventory: [
      { name: 'Dagger', type: 'Weapon', damage_dice: '1d4', equipped: true, equip_slot: 'mainHand' },
      { name: 'Dagger', type: 'Weapon', damage_dice: '1d4' },
    ],
  };
  renderEquipment(fighter);
  // The spare dagger is offered for the free off hand.
  expect(screen.getByTestId('hex-pack-equip-Dagger')).toHaveTextContent('Off Hand');
});

describe('the AC an equipment save keeps (review finding 6)', () => {
  const barbarian = {
    id: 'char-barb', character_class: 'Barbarian', level: 3, strength: 16, dexterity: 14, constitution: 18,
    armor_class: 16, equipped: {}, inventory: [{ id: 'dagger', name: 'Dagger', type: 'Weapon', damage_dice: '1d4', weight: 1 }],
  };

  test('equipping something unrelated keeps an unarmoured Barbarian at 10 + DEX + CON', async () => {
    const { onSave } = renderEquipment(barbarian);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-pack-equip-Dagger')); });
    expect(onSave.mock.calls[0][0].armor_class).toBe(16);
  });

  test('a manually set AC is left alone by equipment changes', async () => {
    const { onSave } = renderEquipment({ ...barbarian, armor_class: 19, armor_class_manual: true });
    await act(async () => { fireEvent.click(screen.getByTestId('hex-pack-equip-Dagger')); });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('armor_class');
  });
});

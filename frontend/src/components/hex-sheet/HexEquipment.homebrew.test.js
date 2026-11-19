/**
 * Homebrew items on the hex sheet: add from the picker, roll extra and
 * two-handed damage, and show defences from items in use. Synthetic data.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import HexEquipment from './HexEquipment';
import { emptyItemDraft, toSheetItem } from '@/data/homebrewItemModel';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

const draft = (kind, patch = {}) => ({ ...emptyItemDraft(kind), ...patch, weapon: { ...emptyItemDraft(kind).weapon, ...(patch.weapon || {}) } });
const blade = { ...toSheetItem(draft('weapon', { name: 'Synthetic Emberbrand', weapon: { magic_bonus: 1, properties: ['versatile'], versatile_sides: 10, extra_damage: [{ dice: '1d6', type: 'fire' }] } })), id: 'blade', equipped: true };
const ring = { ...toSheetItem({ ...emptyItemDraft('wearable'), name: 'Synthetic Frost Ring', requires_attunement: true, defences: { resistances: ['cold'], immunities: [], vulnerabilities: [], condition_immunities: ['frightened'] } }), id: 'ring', attuned: true };
const HERO = { id: 'char-hb', campaign_id: 'camp-1', strength: 16, dexterity: 12, level: 3, equipped: { mainHand: blade }, inventory: [blade, ring], currency: {} };

function renderIt(character = HERO) {
  const onSave = jest.fn().mockResolvedValue(true);
  const onPresent = jest.fn();
  render(<HexEquipment character={character} proficiencyBonus={2} onRoll={jest.fn()} onPresent={onPresent} onSave={onSave} />);
  return { onSave, onPresent };
}

test('damage rolls include the extra fire damage, and two hands uses the versatile die', () => {
  const { onPresent } = renderIt();
  fireEvent.click(screen.getByTestId('hex-slot-mainHand'));
  expect(screen.getByTestId('hex-slot-damage')).toHaveTextContent('1d8 +4 + 1d6 fire');
  fireEvent.click(screen.getByTestId('hex-slot-damage'));
  const rolled = onPresent.mock.calls[0][0];
  expect(rolled.rolls).toHaveLength(2); // the d8 and the extra d6
  expect(rolled.total).toBeGreaterThanOrEqual(6);
  expect(rolled.total).toBeLessThanOrEqual(18);
  expect(rolled.label).toMatch(/fire/);
  fireEvent.click(screen.getByTestId('hex-slot-damage-two-hands'));
  expect(onPresent.mock.calls[1][0].rolls[0].sides).toBe(10);
});

test('defences from attuned items are listed with where they come from', () => {
  renderIt();
  const card = screen.getByTestId('hex-defences');
  expect(card).toHaveTextContent('Resistant cold');
  expect(card).toHaveTextContent("Can't be frightened");
  expect(card).toHaveTextContent('From Synthetic Frost Ring.');
});

test('the picker lists shared homebrew and adds a fresh copy to the inventory', async () => {
  apiClient.get.mockResolvedValue({ data: { items: [
    { id: 'hb-1', name: 'Synthetic Storm Shield', is_campaign_content: true, sheet_item: toSheetItem({ ...emptyItemDraft('shield'), name: 'Synthetic Storm Shield', shield: { ac_bonus: 2, magic_bonus: 1 } }) },
  ] } });
  const { onSave } = renderIt({ ...HERO, inventory: [], equipped: {} });
  await act(async () => { fireEvent.click(screen.getByTestId('hex-add-homebrew')); });
  expect(apiClient.get).toHaveBeenCalledWith('/player/rules/options?campaign_id=camp-1');
  const picker = screen.getByTestId('hex-homebrew-picker');
  expect(within(picker).getByText(/From your GM · \+3 AC/)).toBeInTheDocument();
  await act(async () => { fireEvent.click(within(picker).getByTestId('hex-homebrew-add-Synthetic Storm Shield')); });
  const saved = onSave.mock.calls[0][0];
  expect(saved.inventory).toHaveLength(1);
  expect(saved.inventory[0]).toMatchObject({ name: 'Synthetic Storm Shield', homebrew_id: 'hb-1', shield_ac: 2, magic_ac_bonus: 1 });
});

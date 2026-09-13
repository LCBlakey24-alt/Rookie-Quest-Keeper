import {
  buildCarriedInventoryView,
  buildCurrencyUpdate,
  clearInventorySlotState,
  equipInventoryState,
  getCanonicalEquippedItem,
  inventoryItemIdentity,
  normaliseCurrencyState,
  removeInventoryItemState,
  sameInventoryItem,
  setCanonicalInventorySlot,
  syncInventoryWithEquipment,
} from './characterInventoryState';

describe('character inventory state', () => {
  test('stable item identity prefers id and otherwise falls back to name', () => {
    expect(inventoryItemIdentity({ id: 'sword-1', name: 'Longsword' })).toBe('id:sword-1');
    expect(inventoryItemIdentity({ name: 'Long Sword' })).toBe('name:longsword');
    expect(sameInventoryItem({ name: 'Long Sword' }, { name: 'longsword' })).toBe(true);
  });

  test('canonical equipped slot removes legacy aliases', () => {
    const next = setCanonicalInventorySlot(
      { main_hand: { name: 'Old Sword' }, weapon: { name: 'Old Sword' } },
      'mainHand',
      { id: 'new', name: 'New Sword' },
    );
    expect(next.mainHand).toMatchObject({ id: 'new', equip_slot: 'mainHand', equipped: true });
    expect(next.main_hand).toBeUndefined();
    expect(next.weapon).toBeUndefined();
    expect(getCanonicalEquippedItem(next, 'mainHand').name).toBe('New Sword');
  });

  test('equipping an inventory item synchronises its flags instead of creating a conflicting state', () => {
    const state = equipInventoryState({
      inventory: [
        { id: 'blade-1', name: 'Longsword', equipped: false },
        { id: 'potion-1', name: 'Potion of Healing' },
      ],
      equipped: {},
      item: { id: 'blade-1', name: 'Longsword' },
      slot: 'mainHand',
    });
    expect(state.equipped.mainHand).toMatchObject({ id: 'blade-1', equipped: true });
    expect(state.inventory[0]).toMatchObject({ id: 'blade-1', equipped: true, equip_slot: 'mainHand' });
    expect(state.inventory[1].equipped).toBeUndefined();
  });

  test('clearing a slot clears stale equipped flags on the carried item', () => {
    const state = clearInventorySlotState({
      inventory: [{ id: 'blade-1', name: 'Longsword', equipped: true, equip_slot: 'mainHand' }],
      equipped: { mainHand: { id: 'blade-1', name: 'Longsword', equipped: true } },
      slot: 'mainHand',
    });
    expect(state.equipped.mainHand).toBeUndefined();
    expect(state.inventory[0].equipped).toBe(false);
    expect(state.inventory[0].equip_slot).toBeUndefined();
  });

  test('removing an equipped backpack item also clears its equipment slot', () => {
    const state = removeInventoryItemState({
      inventory: [
        { id: 'shield-1', name: 'Shield' },
        { id: 'rope-1', name: 'Rope' },
      ],
      equipped: { offHand: { id: 'shield-1', name: 'Shield', equipped: true } },
      item: { id: 'shield-1', name: 'Shield' },
    });
    expect(state.removed).toBe(true);
    expect(state.inventory.map((item) => item.name)).toEqual(['Rope']);
    expect(state.equipped.offHand).toBeUndefined();
  });

  test('removing one equipped legacy duplicate clears only that represented slot', () => {
    const state = removeInventoryItemState({
      inventory: [{ name: 'Dagger' }, { name: 'Dagger' }],
      equipped: {
        mainHand: { name: 'Dagger' },
        offHand: { name: 'Dagger' },
      },
      item: { name: 'Dagger', equipped: true, equip_slot: 'offHand' },
    });

    expect(state.inventory).toHaveLength(1);
    expect(state.equipped.mainHand).toBeDefined();
    expect(state.equipped.offHand).toBeUndefined();
    expect(state.inventory[0]).toMatchObject({ name: 'Dagger', equipped: true, equip_slot: 'mainHand' });
  });

  test('removing an unequipped legacy duplicate leaves its equipped sibling alone', () => {
    const state = removeInventoryItemState({
      inventory: [{ name: 'Dagger' }, { name: 'Dagger' }],
      equipped: { mainHand: { name: 'Dagger' } },
      item: { name: 'Dagger', equipped: false },
    });

    expect(state.inventory).toHaveLength(1);
    expect(state.equipped.mainHand).toBeDefined();
    expect(state.inventory[0]).toMatchObject({ name: 'Dagger', equipped: true, equip_slot: 'mainHand' });
  });

  test('carried view overlays equipment state instead of showing a duplicate equipped card', () => {
    const view = buildCarriedInventoryView({
      inventory: [{ id: 'blade-1', name: 'Longsword', quantity: 1 }],
      equipped: { mainHand: { id: 'blade-1', name: 'Longsword', equipped: true } },
    });
    expect(view).toHaveLength(1);
    expect(view[0]).toMatchObject({ id: 'blade-1', name: 'Longsword', equipped: true, equip_slot: 'mainHand', source: 'inventory' });
  });

  test('equipped-only items remain visible when no carried list copy exists', () => {
    const view = buildCarriedInventoryView({
      inventory: [{ id: 'rope-1', name: 'Rope' }],
      equipped: { armor: { id: 'armor-1', name: 'Chain Mail' } },
    });
    expect(view.map((item) => item.name)).toEqual(['Rope', 'Chain Mail']);
    expect(view[1]).toMatchObject({ equipped: true, equip_slot: 'armor', source: 'equipped' });
  });

  test('sync clears stale inventory equipped flags when the equipped map disagrees', () => {
    const synced = syncInventoryWithEquipment(
      [{ id: 'blade-1', name: 'Longsword', equipped: true, equip_slot: 'mainHand' }],
      {},
    );
    expect(synced[0].equipped).toBe(false);
    expect(synced[0].equip_slot).toBeUndefined();
  });

  test('legacy duplicate name-only items are preserved within one source but copied source lists do not triple them', () => {
    const view = buildCarriedInventoryView({
      inventory: [{ name: 'Dagger' }, { name: 'Dagger' }],
      equipment: [{ name: 'Dagger' }, { name: 'Dagger' }],
      starting: [{ name: 'Dagger' }, { name: 'Dagger' }],
    });
    expect(view).toHaveLength(2);
    expect(view.map((item) => item.name)).toEqual(['Dagger', 'Dagger']);
    expect(view.every((item) => item.source === 'inventory')).toBe(true);
  });

  test('one legacy name-only equipped assignment marks only one matching duplicate equipped', () => {
    const synced = syncInventoryWithEquipment(
      [{ name: 'Dagger' }, { name: 'Dagger' }],
      { mainHand: { name: 'Dagger' } },
    );
    expect(synced.filter((item) => item.equipped)).toHaveLength(1);
    expect(synced.filter((item) => !item.equipped)).toHaveLength(1);
  });

  test('two legacy same-name weapons can occupy main and off hand without collapsing into one card', () => {
    const view = buildCarriedInventoryView({
      inventory: [{ name: 'Dagger' }, { name: 'Dagger' }],
      equipped: {
        mainHand: { name: 'Dagger' },
        offHand: { name: 'Dagger' },
      },
    });
    expect(view).toHaveLength(2);
    expect(view.map((item) => item.equip_slot).sort()).toEqual(['mainHand', 'offHand'].sort());
  });

  test('currency reads legacy shapes and writes canonical aliases without negative coins', () => {
    const character = { gold: 12, currency: { copper: 3, sp: 4, platinum: 2 } };
    expect(normaliseCurrencyState(character)).toEqual({ cp: 3, sp: 4, ep: 0, gp: 12, pp: 2 });

    const update = buildCurrencyUpdate(character, 'gp', 19.9);
    expect(update.gold).toBe(19);
    expect(update.currency).toMatchObject({ gp: 19, gold: 19, cp: 3, copper: 3, pp: 2, platinum: 2 });

    expect(buildCurrencyUpdate(character, 'cp', -50).currency.cp).toBe(0);
  });
});

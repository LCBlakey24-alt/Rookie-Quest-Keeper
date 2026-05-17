import React, { useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
const EQUIP_SLOTS = [
  ['mainHand', 'Main Hand'],
  ['offHand', 'Off Hand'],
  ['armor', 'Armour'],
  ['shield', 'Shield'],
];

const blankItem = {
  name: '',
  type: 'Item',
  quantity: 1,
  description: '',
  favorite: false,
};

function getItemName(item) {
  if (!item) return 'Unknown item';
  if (typeof item === 'string') return item;
  return item.name || item.item_name || item.label || item.title || 'Unknown item';
}

function getItemDetail(item) {
  if (!item || typeof item === 'string') return '';
  return item.description || item.desc || item.type || item.category || item.rarity || '';
}

function getItemQuantity(item) {
  if (!item || typeof item === 'string') return null;
  return item.quantity ?? item.qty ?? item.count ?? null;
}

function isFavorite(item) {
  if (!item || typeof item === 'string') return false;
  return Boolean(item.favorite || item.favourite || item.is_favorite || item.is_favourite);
}

function isConsumableLike(item) {
  const name = getItemName(item).toLowerCase();
  const type = String(item?.type || item?.category || item?.item_type || '').toLowerCase();
  return type.includes('consumable') || type.includes('potion') || name.includes('potion') || name.includes('healing');
}

function getEquippedItem(equipped = {}, slot) {
  if (slot === 'mainHand') return equipped.mainHand || equipped.main_hand || equipped.weapon;
  if (slot === 'offHand') return equipped.offHand || equipped.off_hand;
  if (slot === 'armor') return equipped.armor || equipped.armour;
  return equipped[slot];
}

function getItemKey(item, index = '') {
  return `${getItemName(item).toLowerCase()}-${index}`;
}

function normaliseItem(item) {
  if (typeof item === 'string') return { name: item, type: 'Item', quantity: 1, description: '' };
  return {
    ...item,
    name: getItemName(item),
    type: item?.type || item?.category || item?.item_type || 'Item',
    quantity: Number(getItemQuantity(item) ?? 1) || 1,
    description: item?.description || item?.desc || '',
  };
}

function ItemCard({ item, slot, actions }) {
  const quantity = getItemQuantity(item);
  return (
    <div className={`clean-sheet-item-card ${isFavorite(item) ? 'favorite' : ''} ${isConsumableLike(item) ? 'consumable' : ''}`}>
      <div className="clean-sheet-item-card-top">
        {slot && <span className="clean-sheet-item-slot">{slot}</span>}
        {isFavorite(item) && <span className="clean-sheet-item-slot favorite">Favourite</span>}
        {isConsumableLike(item) && <span className="clean-sheet-item-slot consumable">Consumable</span>}
      </div>
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {quantity !== null && <em>Qty {quantity}</em>}
      {actions && <div className="clean-sheet-item-actions">{actions}</div>}
    </div>
  );
}

function CurrencyBlock({ currency = {}, gold }) {
  const values = {
    cp: currency.copper ?? currency.cp ?? 0,
    sp: currency.silver ?? currency.sp ?? 0,
    ep: currency.electrum ?? currency.ep ?? 0,
    gp: currency.gold ?? currency.gp ?? gold ?? 0,
    pp: currency.platinum ?? currency.pp ?? 0,
  };

  return (
    <div className="clean-sheet-currency-grid">
      {Object.entries(values).map(([coin, value]) => (
        <div key={coin}>
          <span>{coin.toUpperCase()}</span>
          <strong>{Number(value) || 0}</strong>
        </div>
      ))}
    </div>
  );
}

export default function CleanInventoryTab({ character, onCharacterUpdate }) {
  const [savingSlot, setSavingSlot] = useState('');
  const [savingItems, setSavingItems] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);
  const [itemSearch, setItemSearch] = useState('');
  const [equippedAttackBonus, setEquippedAttackBonus] = useState(0);
  const equipped = character?.equipped || {};
  const equipment = character?.equipment || [];
  const inventory = character?.inventory || [];
  const allCarriedItems = [...equipment, ...inventory];

  const favoriteItems = useMemo(() => allCarriedItems.filter(isFavorite), [allCarriedItems]);
  const consumables = useMemo(() => allCarriedItems.filter(isConsumableLike), [allCarriedItems]);
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allCarriedItems;
    return allCarriedItems.filter(item => `${getItemName(item)} ${getItemDetail(item)}`.toLowerCase().includes(q));
  }, [allCarriedItems, itemSearch]);

  const makeWeaponRoll = (item) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + (Number(equippedAttackBonus) || 0);
    toast.success(`${getItemName(item)} attack: ${roll}${equippedAttackBonus ? ` + ${equippedAttackBonus}` : ''} = ${total}`);
  };

  const saveEquipped = async (nextEquipped, slotLabel) => {
    setSavingSlot(slotLabel);
    try {
      await apiClient.patch(`/characters/${character.id}`, { equipped: nextEquipped });
      onCharacterUpdate?.({ equipped: nextEquipped });
      toast.success('Equipment updated');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update equipment');
    } finally {
      setSavingSlot('');
    }
  };

  const saveInventory = async (nextInventory, message = 'Inventory updated') => {
    setSavingItems(true);
    try {
      await apiClient.patch(`/characters/${character.id}`, { inventory: nextInventory });
      onCharacterUpdate?.({ inventory: nextInventory });
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update inventory');
      return false;
    } finally {
      setSavingItems(false);
    }
  };

  const equipItem = (slot, item) => {
    const nextEquipped = { ...equipped, [slot]: item };
    saveEquipped(nextEquipped, slot);
  };

  const clearSlot = (slot) => {
    const nextEquipped = { ...equipped };
    delete nextEquipped[slot];
    if (slot === 'mainHand') {
      delete nextEquipped.main_hand;
      delete nextEquipped.weapon;
    }
    if (slot === 'offHand') delete nextEquipped.off_hand;
    if (slot === 'armor') delete nextEquipped.armour;
    saveEquipped(nextEquipped, slot);
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    const item = normaliseItem({ ...newItem, name: newItem.name.trim() });
    const ok = await saveInventory([...inventory, item], 'Item added');
    if (ok) {
      setNewItem(blankItem);
      setShowAddItem(false);
    }
  };

  const updateInventoryItem = async (item, index, updates) => {
    const nextInventory = [...inventory];
    const inventoryIndex = inventory.findIndex((candidate, i) => candidate === item || getItemKey(candidate, i) === getItemKey(item, index));
    if (inventoryIndex < 0) {
      toast.info('Only backpack items can be edited here. Equipped starter gear can still be assigned to slots.');
      return;
    }
    nextInventory[inventoryIndex] = normaliseItem({ ...normaliseItem(nextInventory[inventoryIndex]), ...updates });
    await saveInventory(nextInventory);
  };

  const removeInventoryItem = async (item, index) => {
    const inventoryIndex = inventory.findIndex((candidate, i) => candidate === item || getItemKey(candidate, i) === getItemKey(item, index));
    if (inventoryIndex < 0) {
      toast.info('Only backpack items can be removed here.');
      return;
    }
    const nextInventory = [...inventory];
    nextInventory.splice(inventoryIndex, 1);
    await saveInventory(nextInventory, 'Item removed');
  };

  const quantityActions = (item, index) => {
    const qty = Number(getItemQuantity(item) ?? 1) || 1;
    return (
      <>
        <button type="button" onClick={() => updateInventoryItem(item, index, { quantity: Math.max(1, qty - 1), qty: Math.max(1, qty - 1) })} disabled={savingItems}>- Qty</button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { quantity: qty + 1, qty: qty + 1 })} disabled={savingItems}>+ Qty</button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { favorite: !isFavorite(item), favourite: !isFavorite(item) })} disabled={savingItems}>
          {isFavorite(item) ? 'Unfav' : 'Fav'}
        </button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { type: isConsumableLike(item) ? 'Item' : 'Consumable' })} disabled={savingItems}>
          {isConsumableLike(item) ? 'Not Consumable' : 'Consumable'}
        </button>
        <button type="button" onClick={() => removeInventoryItem(item, index)} disabled={savingItems}>Remove</button>
      </>
    );
  };

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <h2>Equipped</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12 }}>Atk Bonus</label>
            <input type="number" value={equippedAttackBonus} onChange={e => setEquippedAttackBonus(Number(e.target.value) || 0)} style={{ width: 70 }} />
            <button type="button" onClick={() => setShowAddItem(prev => !prev)}>{showAddItem ? 'Close Add Item' : 'Add Item'}</button>
          </div>
        </div>
        <div className="clean-sheet-item-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getEquippedItem(equipped, slot);
            return item ? (
              <ItemCard
                key={slot}
                slot={label}
                item={item}
                actions={(<>
                  {String(item?.type || '').toLowerCase().includes('weapon') && <button type="button" onClick={() => makeWeaponRoll(item)}>Attack Roll</button>}
                  <button type="button" onClick={() => clearSlot(slot)} disabled={savingSlot === slot}>Clear Slot</button>
                </>)}
              />
            ) : (
              <div key={slot} className="clean-sheet-item-card clean-sheet-empty-slot">
                <span className="clean-sheet-item-slot">{label}</span>
                <strong>Empty</strong>
                <p>Select an item below to assign this slot.</p>
              </div>
            );
          })}
        </div>
      </section>

      {showAddItem && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Add Item</h2>
          <form className="clean-sheet-add-item-form" onSubmit={addItem}>
            <input value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))} placeholder="Item name" />
            <select value={newItem.type} onChange={e => setNewItem(prev => ({ ...prev, type: e.target.value }))}>
              <option>Item</option>
              <option>Weapon</option>
              <option>Armour</option>
              <option>Shield</option>
              <option>Consumable</option>
              <option>Magic Item</option>
            </select>
            <input type="number" min="1" value={newItem.quantity} onChange={e => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))} placeholder="Qty" />
            <textarea value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} placeholder="Description or effect" />
            <label className="clean-sheet-checkbox-row">
              <input type="checkbox" checked={newItem.favorite} onChange={e => setNewItem(prev => ({ ...prev, favorite: e.target.checked, favourite: e.target.checked }))} />
              Favourite this item
            </label>
            <button type="submit" disabled={savingItems}>Save Item</button>
          </form>
        </section>
      )}

      <section className="clean-sheet-panel">
        <h2>Currency</h2>
        <CurrencyBlock currency={character?.currency || {}} gold={character?.gold} />
      </section>

      {favoriteItems.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Favourite Items</h2>
          <div className="clean-sheet-item-grid">
            {favoriteItems.map((item, index) => <ItemCard key={getItemKey(item, index)} item={item} />)}
          </div>
        </section>
      )}

      {consumables.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Consumables</h2>
          <div className="clean-sheet-item-grid">
            {consumables.map((item, index) => <ItemCard key={getItemKey(item, index)} item={item} />)}
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <h2>Carried Items</h2>
          <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items…" />
        </div>
        {filteredInventory.length > 0 ? (
          <div className="clean-sheet-item-grid">
            {filteredInventory.map((item, index) => (
              <ItemCard
                key={getItemKey(item, index)}
                item={item}
                actions={(
                  <>
                    {EQUIP_SLOTS.map(([slot, label]) => (
                      <button key={slot} type="button" onClick={() => equipItem(slot, item)} disabled={savingSlot === slot}>
                        Set {label}
                      </button>
                    ))}
                    {quantityActions(item, index)}
                  </>
                )}
              />
            ))}
          </div>
        ) : (
          <p className="clean-sheet-muted">No carried items found yet.</p>
        )}
      </section>
    </div>
  );
}

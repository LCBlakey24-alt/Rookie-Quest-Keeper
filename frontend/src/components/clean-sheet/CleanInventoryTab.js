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
  attunement_required: false,
  attuned: false,
  attack_bonus: 0,
  ac_bonus: 0,
  stat_bonuses: {
    strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0,
  },
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
    attunement_required: Boolean(item?.attunement_required || item?.requires_attunement),
    attuned: Boolean(item?.attuned),
    attack_bonus: Number(item?.attack_bonus ?? 0) || 0,
    ac_bonus: Number(item?.ac_bonus ?? 0) || 0,
    stat_bonuses: {
      strength: Number(item?.stat_bonuses?.strength ?? 0) || 0,
      dexterity: Number(item?.stat_bonuses?.dexterity ?? 0) || 0,
      constitution: Number(item?.stat_bonuses?.constitution ?? 0) || 0,
      intelligence: Number(item?.stat_bonuses?.intelligence ?? 0) || 0,
      wisdom: Number(item?.stat_bonuses?.wisdom ?? 0) || 0,
      charisma: Number(item?.stat_bonuses?.charisma ?? 0) || 0,
    },
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
        {item?.attunement_required && <span className="clean-sheet-item-slot">{item?.attuned ? 'Attuned' : 'Needs Attunement'}</span>}
      </div>
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {(Number(item?.attack_bonus || 0) !== 0 || Number(item?.ac_bonus || 0) !== 0) && (
        <p style={{ marginTop: 4 }}>
          {Number(item?.attack_bonus || 0) !== 0 ? `Atk ${Number(item?.attack_bonus) > 0 ? '+' : ''}${Number(item?.attack_bonus)}` : ''}
          {Number(item?.attack_bonus || 0) !== 0 && Number(item?.ac_bonus || 0) !== 0 ? ' • ' : ''}
          {Number(item?.ac_bonus || 0) !== 0 ? `AC ${Number(item?.ac_bonus) > 0 ? '+' : ''}${Number(item?.ac_bonus)}` : ''}
        </p>
      )}
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
  const [recomputingEffects, setRecomputingEffects] = useState(false);
  const attunedCount = useMemo(
    () => allCarriedItems.filter(item => item?.attunement_required && item?.attuned).length,
    [allCarriedItems]
  );

  const favoriteItems = useMemo(() => allCarriedItems.filter(isFavorite), [allCarriedItems]);
  const consumables = useMemo(() => allCarriedItems.filter(isConsumableLike), [allCarriedItems]);
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allCarriedItems;
    return allCarriedItems.filter(item => `${getItemName(item)} ${getItemDetail(item)}`.toLowerCase().includes(q));
  }, [allCarriedItems, itemSearch]);

  const makeWeaponRoll = (item) => {
    if (item?.attunement_required && !item?.attuned) {
      toast.error(`${getItemName(item)} must be attuned before you can use its magical attack bonuses.`);
      return;
    }
    const itemBonus = Number(item?.attack_bonus ?? 0) || 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    const totalBonus = (Number(equippedAttackBonus) || 0) + itemBonus;
    const total = roll + totalBonus;
    toast.success(`${getItemName(item)} attack: ${roll}${totalBonus ? ` + ${totalBonus}` : ''} = ${total}`);
  };

  const recalcCharacterItemEffects = async (nextInventory = inventory, nextEquipped = equipped) => {
    setRecomputingEffects(true);
    const baseStats = {
      strength: Number(character?.stats?.strength || 0),
      dexterity: Number(character?.stats?.dexterity || 0),
      constitution: Number(character?.stats?.constitution || 0),
      intelligence: Number(character?.stats?.intelligence || 0),
      wisdom: Number(character?.stats?.wisdom || 0),
      charisma: Number(character?.stats?.charisma || 0),
    };
    const allItems = [...(character?.equipment || []), ...nextInventory];
    const activeItems = allItems.filter(i => !i?.attunement_required || i?.attuned);
    const equippedItems = EQUIP_SLOTS.map(([slot]) => getEquippedItem(nextEquipped, slot)).filter(Boolean);
    const bonuses = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 };
    let acBonus = 0;
    let attackBonus = 0;
    activeItems.forEach((item) => {
      bonuses.strength += Number(item?.stat_bonuses?.strength || 0);
      bonuses.dexterity += Number(item?.stat_bonuses?.dexterity || 0);
      bonuses.constitution += Number(item?.stat_bonuses?.constitution || 0);
      bonuses.intelligence += Number(item?.stat_bonuses?.intelligence || 0);
      bonuses.wisdom += Number(item?.stat_bonuses?.wisdom || 0);
      bonuses.charisma += Number(item?.stat_bonuses?.charisma || 0);
    });
    equippedItems.forEach((item) => {
      if (!item?.attunement_required || item?.attuned) {
        acBonus += Number(item?.ac_bonus || 0);
        attackBonus += Number(item?.attack_bonus || 0);
      }
    });
    const payload = {
      inventory: nextInventory,
      equipped: nextEquipped,
      item_effects: {
        stat_bonuses: bonuses,
        ac_bonus: acBonus,
        attack_bonus: attackBonus,
        updated_at: new Date().toISOString(),
      },
      derived_stats_from_items: {
        ...baseStats,
        strength: baseStats.strength + bonuses.strength,
        dexterity: baseStats.dexterity + bonuses.dexterity,
        constitution: baseStats.constitution + bonuses.constitution,
        intelligence: baseStats.intelligence + bonuses.intelligence,
        wisdom: baseStats.wisdom + bonuses.wisdom,
        charisma: baseStats.charisma + bonuses.charisma,
      },
    };
    try {
      await apiClient.patch(`/characters/${character.id}`, payload);
      onCharacterUpdate?.(payload);
    } finally {
      setRecomputingEffects(false);
    }
  };

  const saveEquipped = async (nextEquipped, slotLabel) => {
    setSavingSlot(slotLabel);
    try {
      await recalcCharacterItemEffects(inventory, nextEquipped);
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
      await recalcCharacterItemEffects(nextInventory, equipped);
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

  const inferEquipSlot = (item) => {
    const text = `${String(item?.type || '')} ${getItemName(item)}`.toLowerCase();
    if (text.includes('shield')) return 'shield';
    if (text.includes('armour') || text.includes('armor')) return 'armor';
    if (text.includes('off hand') || text.includes('offhand')) return 'offHand';
    if (text.includes('weapon') || text.includes('sword') || text.includes('bow') || text.includes('axe') || text.includes('mace') || text.includes('staff') || text.includes('dagger')) return 'mainHand';
    return null;
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
    if (updates?.attuned === true && !item?.attuned) {
      const wouldBeAttuned = allCarriedItems.filter(i => i?.attunement_required && i?.attuned).length + 1;
      if (wouldBeAttuned > 3) {
        toast.error('You can only attune to 3 items at a time.');
        return;
      }
    }
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
            {recomputingEffects && <span className="clean-sheet-muted">Updating item effects…</span>}
          </div>
        </div>
        <p className="clean-sheet-muted" style={{ marginBottom: 10 }}>
          Attunement: <strong>{attunedCount}/3</strong> item slots used
        </p>
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
            <input type="number" value={newItem.attack_bonus} onChange={e => setNewItem(prev => ({ ...prev, attack_bonus: Number(e.target.value) || 0 }))} placeholder="Attack bonus" />
            <input type="number" value={newItem.ac_bonus} onChange={e => setNewItem(prev => ({ ...prev, ac_bonus: Number(e.target.value) || 0 }))} placeholder="AC bonus" />
            <div className="clean-sheet-currency-grid" style={{ marginBottom: 8 }}>
              <input type="number" value={newItem.stat_bonuses?.strength || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), strength: Number(e.target.value) || 0 } }))} placeholder="STR bonus" />
              <input type="number" value={newItem.stat_bonuses?.dexterity || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), dexterity: Number(e.target.value) || 0 } }))} placeholder="DEX bonus" />
              <input type="number" value={newItem.stat_bonuses?.constitution || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), constitution: Number(e.target.value) || 0 } }))} placeholder="CON bonus" />
              <input type="number" value={newItem.stat_bonuses?.intelligence || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), intelligence: Number(e.target.value) || 0 } }))} placeholder="INT bonus" />
              <input type="number" value={newItem.stat_bonuses?.wisdom || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), wisdom: Number(e.target.value) || 0 } }))} placeholder="WIS bonus" />
              <input type="number" value={newItem.stat_bonuses?.charisma || 0} onChange={e => setNewItem(prev => ({ ...prev, stat_bonuses: { ...(prev.stat_bonuses || {}), charisma: Number(e.target.value) || 0 } }))} placeholder="CHA bonus" />
            </div>
            <textarea value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} placeholder="Description or effect" />
            <label className="clean-sheet-checkbox-row">
              <input type="checkbox" checked={newItem.attunement_required} onChange={e => setNewItem(prev => ({ ...prev, attunement_required: e.target.checked, attuned: e.target.checked ? prev.attuned : false }))} />
              Requires attunement
            </label>
            {newItem.attunement_required && (
              <label className="clean-sheet-checkbox-row">
                <input type="checkbox" checked={newItem.attuned} onChange={e => setNewItem(prev => ({ ...prev, attuned: e.target.checked }))} />
                Currently attuned
              </label>
            )}
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

      <section className="clean-sheet-panel">
        <h2>Active Item Effects</h2>
        <div className="clean-sheet-currency-grid">
          <div><span>Atk Bonus</span><strong>{Number(character?.item_effects?.attack_bonus || 0)}</strong></div>
          <div><span>AC Bonus</span><strong>{Number(character?.item_effects?.ac_bonus || 0)}</strong></div>
          <div><span>STR</span><strong>{Number(character?.item_effects?.stat_bonuses?.strength || 0)}</strong></div>
          <div><span>DEX</span><strong>{Number(character?.item_effects?.stat_bonuses?.dexterity || 0)}</strong></div>
          <div><span>CON</span><strong>{Number(character?.item_effects?.stat_bonuses?.constitution || 0)}</strong></div>
          <div><span>INT</span><strong>{Number(character?.item_effects?.stat_bonuses?.intelligence || 0)}</strong></div>
          <div><span>WIS</span><strong>{Number(character?.item_effects?.stat_bonuses?.wisdom || 0)}</strong></div>
          <div><span>CHA</span><strong>{Number(character?.item_effects?.stat_bonuses?.charisma || 0)}</strong></div>
        </div>
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
              (() => {
                const inferredSlot = inferEquipSlot(item);
                const inferredLabel = EQUIP_SLOTS.find(([s]) => s === inferredSlot)?.[1] || '';
                return (
                  <ItemCard
                    key={getItemKey(item, index)}
                    item={item}
                    actions={(
                      <>
                        {inferredSlot && (
                          <button type="button" onClick={() => equipItem(inferredSlot, item)} disabled={savingSlot === inferredSlot}>
                            Quick Equip {inferredLabel}
                          </button>
                        )}
                        {item?.attunement_required && (
                          <button type="button" onClick={() => updateInventoryItem(item, index, { attuned: !item?.attuned })} disabled={savingItems}>
                            {item?.attuned ? 'Unattune' : 'Attune'}
                          </button>
                        )}
                        {EQUIP_SLOTS.map(([slot, label]) => (
                          <button key={slot} type="button" onClick={() => equipItem(slot, item)} disabled={savingSlot === slot}>
                            Set {label}
                          </button>
                        ))}
                        {quantityActions(item, index)}
                      </>
                    )}
                  />
                );
              })()
            ))}
          </div>
        ) : (
          <p className="clean-sheet-muted">No carried items found yet.</p>
        )}
      </section>
    </div>
  );
}

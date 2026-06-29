import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { deriveArmorClass, deriveWeaponAttack } from '@/data/characterCombatDerivations';
import { ALL_ARMOR, ALL_WEAPONS } from '@/data/equipmentDatabase';

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
  damage_dice: '',
  damage_type: '',
  equip_slot: '',
  equipped: false,
  is_equipped: false,
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

function requiresAttunement(item) {
  return Boolean(item?.attunement_required || item?.requires_attunement);
}

function isAttuned(item) {
  return Boolean(item?.attuned || item?.is_attuned);
}

function isGrantedEquipped(item) {
  return Boolean(item?.equipped || item?.is_equipped || item?.granted_equipped || item?.ready_to_use);
}

function getEquippedItem(equipped = {}, slot) {
  if (slot === 'mainHand') return equipped.mainHand || equipped.main_hand || equipped.weapon;
  if (slot === 'offHand') return equipped.offHand || equipped.off_hand;
  if (slot === 'armor') return equipped.armor || equipped.armour;
  return equipped[slot];
}

function getItemKey(item, index = '') {
  return `${item?.id || getItemName(item).toLowerCase()}-${index}`;
}

function sameItem(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return getItemName(a).toLowerCase() === getItemName(b).toLowerCase();
}

function normaliseItem(item) {
  if (typeof item === 'string') return { name: item, type: 'Item', quantity: 1, description: '' };
  const attunementRequired = requiresAttunement(item);
  const equippedSlot = item?.equipped_slot || item?.equip_slot || '';
  return {
    ...item,
    name: getItemName(item),
    type: item?.type || item?.category || item?.item_type || 'Item',
    item_type: item?.item_type || item?.type || item?.category || 'Item',
    quantity: Number(getItemQuantity(item) ?? 1) || 1,
    description: item?.description || item?.desc || '',
    attunement_required: attunementRequired,
    requires_attunement: attunementRequired,
    attuned: Boolean(item?.attuned || item?.is_attuned),
    is_attuned: Boolean(item?.attuned || item?.is_attuned),
    equipped: Boolean(item?.equipped || item?.is_equipped),
    is_equipped: Boolean(item?.equipped || item?.is_equipped),
    equipped_slot: equippedSlot,
    equip_slot: item?.equip_slot || equippedSlot,
    ready_to_use: Boolean(item?.ready_to_use || item?.equipped || item?.is_equipped || item?.attuned),
    attack_bonus: Number(item?.attack_bonus ?? 0) || 0,
    ac_bonus: Number(item?.ac_bonus ?? 0) || 0,
    damage_dice: item?.damage_dice || '',
    damage_type: item?.damage_type || '',
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

function normaliseReferenceItem(item) {
  const isArmor = ['light', 'medium', 'heavy', 'shield'].includes(String(item?.category || '').toLowerCase()) || item?.ac || item?.acBonus;
  const isShield = String(item?.category || '').toLowerCase() === 'shield' || String(item?.name || '').toLowerCase().includes('shield');
  const damageParts = String(item?.damage || '').match(/(\d+d\d+|\d+)\s*([a-z]+)?/i);
  return normaliseItem({
    name: item?.name || 'Equipment',
    type: isShield ? 'Shield' : isArmor ? 'Armour' : 'Weapon',
    quantity: 1,
    description: [item?.category, Array.isArray(item?.properties) ? item.properties.join(', ') : item?.properties, item?.cost ? `Cost: ${item.cost}` : ''].filter(Boolean).join(' • '),
    damage_dice: damageParts && !isArmor ? damageParts[1] : '',
    damage_type: damageParts && !isArmor ? (item?.damageType || damageParts[2] || '') : '',
    range: item?.range || '',
    properties: Array.isArray(item?.properties) ? item.properties.join(', ') : item?.properties || '',
    ac_bonus: 0,
  });
}

function inferEquipSlot(item) {
  if (item?.equipped_slot) return item.equipped_slot;
  if (item?.equip_slot) return item.equip_slot;
  const text = `${String(item?.type || item?.item_type || '')} ${getItemName(item)}`.toLowerCase();
  if (text.includes('shield')) return 'shield';
  if (text.includes('armour') || text.includes('armor') || text.includes('mail') || text.includes('plate') || text.includes('leather') || text.includes('scale') || text.includes('chain') || text.includes('hide')) return 'armor';
  if (text.includes('off hand') || text.includes('offhand')) return 'offHand';
  if (text.includes('weapon') || text.includes('sword') || text.includes('bow') || text.includes('crossbow') || text.includes('axe') || text.includes('mace') || text.includes('staff') || text.includes('dagger') || text.includes('spear') || text.includes('lance') || text.includes('hammer') || text.includes('rapier') || text.includes('club') || text.includes('flail') || text.includes('halberd') || text.includes('pike') || text.includes('trident') || text.includes('whip')) return 'mainHand';
  if (item?.damage_dice) return 'mainHand';
  if (item?.ac_bonus && !item?.attack_bonus) return 'armor';
  return null;
}

function ItemCard({ item, slot, actions }) {
  const quantity = getItemQuantity(item);
  const damageDice = item?.damage_dice;
  const damageType = item?.damage_type;
  const attackBonus = Number(item?.attack_bonus || 0);
  const acBonus = Number(item?.ac_bonus || 0);
  return (
    <div className={`clean-sheet-item-card ${isFavorite(item) ? 'favorite' : ''} ${isConsumableLike(item) ? 'consumable' : ''}`}>
      <div className="clean-sheet-item-card-top">
        {slot && <span className="clean-sheet-item-slot">{slot}</span>}
        {isFavorite(item) && <span className="clean-sheet-item-slot favorite">Favourite</span>}
        {isConsumableLike(item) && <span className="clean-sheet-item-slot consumable">Consumable</span>}
        {requiresAttunement(item) && <span className="clean-sheet-item-slot">{isAttuned(item) ? 'Attuned' : 'Needs Attunement'}</span>}
        {isGrantedEquipped(item) && <span className="clean-sheet-item-slot">Ready</span>}
      </div>
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {damageDice && <em>{damageDice}{damageType ? ` ${damageType}` : ''}{attackBonus !== 0 ? ` (${attackBonus >= 0 ? '+' : ''}${attackBonus} to hit)` : ''}</em>}
      {!damageDice && acBonus !== 0 && <em>AC {acBonus >= 0 ? '+' : ''}{acBonus}</em>}
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
  return <div className="clean-sheet-currency-grid">{Object.entries(values).map(([coin, value]) => <div key={coin}><span>{coin.toUpperCase()}</span><strong>{Number(value) || 0}</strong></div>)}</div>;
}

export default function CleanInventoryTab({ character, onCharacterUpdate }) {
  const [savingSlot, setSavingSlot] = useState('');
  const [savingItems, setSavingItems] = useState(false);
  const [syncingGranted, setSyncingGranted] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);
  const [itemSearch, setItemSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('all');
  const [selectedReferenceKey, setSelectedReferenceKey] = useState('');

  const equipped = character?.equipped || {};
  const equipment = character?.equipment || [];
  const inventory = character?.inventory || [];
  const allCarriedItems = [...equipment, ...inventory];

  useEffect(() => {
    if (!character?.id || syncingGranted || !Array.isArray(inventory) || inventory.length === 0) return;
    const nextEquipped = { ...equipped };
    let changed = false;

    inventory.forEach(rawItem => {
      if (!isGrantedEquipped(rawItem)) return;
      const item = normaliseItem(rawItem);
      const slot = inferEquipSlot(item);
      if (!slot) return;
      const currentSlotItem = getEquippedItem(nextEquipped, slot);
      if (sameItem(currentSlotItem, item)) return;
      nextEquipped[slot] = { ...item, equip_slot: slot, equipped_slot: slot, equipped: true, is_equipped: true };
      if (slot === 'mainHand') nextEquipped.main_hand = nextEquipped[slot];
      if (slot === 'offHand') nextEquipped.off_hand = nextEquipped[slot];
      if (slot === 'armor') nextEquipped.armour = nextEquipped[slot];
      changed = true;
    });

    if (!changed) return;
    const armorClass = deriveArmorClass({ ...character, equipped: nextEquipped }, { ignoreStoredAc: true });
    setSyncingGranted(true);
    apiClient.patch(`/characters/${character.id}`, { equipped: nextEquipped, armor_class: armorClass })
      .then(() => {
        onCharacterUpdate?.({ equipped: nextEquipped, armor_class: armorClass });
        toast.success('GM-granted equipment is ready', { description: 'Equipped/ready items have been placed into your active slots.' });
      })
      .catch(error => toast.error(error?.response?.data?.detail || 'Could not prepare GM-granted equipment'))
      .finally(() => setSyncingGranted(false));
  }, [character, inventory, equipped, syncingGranted, onCharacterUpdate]);

  const favoriteItems = useMemo(() => allCarriedItems.filter(isFavorite), [allCarriedItems]);
  const consumables = useMemo(() => allCarriedItems.filter(isConsumableLike), [allCarriedItems]);
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allCarriedItems;
    return allCarriedItems.filter(item => `${getItemName(item)} ${getItemDetail(item)}`.toLowerCase().includes(q));
  }, [allCarriedItems, itemSearch]);

  const referenceMatches = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return [...ALL_WEAPONS, ...ALL_ARMOR].filter(item => `${item.name} ${item.category || ''} ${item.damage || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [itemSearch]);

  const referenceCatalog = useMemo(() => ([
    ...ALL_WEAPONS.map(item => ({ key: `weapon-${item.id || item.name}`, kind: 'weapon', label: item.name, item })),
    ...ALL_ARMOR.map(item => ({ key: `${String(item.category || 'armor') === 'shield' ? 'shield' : 'armor'}-${item.id || item.name}`, kind: String(item.category || '').toLowerCase() === 'shield' ? 'shield' : 'armor', label: item.name, item })),
  ]), []);

  const filteredReferenceCatalog = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    return referenceCatalog.filter(entry => equipmentTypeFilter === 'all' || entry.kind === equipmentTypeFilter).filter(entry => !q || `${entry.label} ${entry.kind} ${entry.item?.category || ''} ${entry.item?.damage || ''}`.toLowerCase().includes(q)).slice(0, 80);
  }, [equipmentSearch, equipmentTypeFilter, referenceCatalog]);

  const selectedReferenceEntry = useMemo(() => referenceCatalog.find(entry => entry.key === selectedReferenceKey) || null, [referenceCatalog, selectedReferenceKey]);
  const selectedReference = selectedReferenceEntry?.item || null;
  const selectedReferenceItem = selectedReference ? normaliseReferenceItem(selectedReference) : null;
  const selectedReferenceSlot = selectedReferenceItem ? inferEquipSlot(selectedReferenceItem) : null;
  const selectedReferenceAttack = selectedReferenceItem && selectedReferenceSlot === 'mainHand' ? deriveWeaponAttack(selectedReferenceItem, character, Number(character?.proficiency_bonus) || 2) : null;
  const selectedReferenceAc = selectedReferenceItem && ['armor', 'shield'].includes(selectedReferenceSlot) ? deriveArmorClass({ ...character, equipped: { ...equipped, [selectedReferenceSlot]: selectedReferenceItem } }, { ignoreStoredAc: true }) : null;
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);

  const makeWeaponRoll = (item) => {
    const attack = deriveWeaponAttack(item, character, proficiencyBonus);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + Number(attack.attackMod || 0);
    toast.success(`${attack.title} attack: ${roll} ${attack.attackText} = ${total}`, { description: `${attack.damageText} ${attack.damageType || ''} damage if it hits` });
  };

  const saveEquipped = async (nextEquipped, slotLabel) => {
    setSavingSlot(slotLabel);
    try {
      const derivedAc = deriveArmorClass({ ...character, equipped: nextEquipped }, { ignoreStoredAc: true });
      await apiClient.patch(`/characters/${character.id}`, { equipped: nextEquipped, armor_class: derivedAc });
      onCharacterUpdate?.({ equipped: nextEquipped, armor_class: derivedAc });
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
    const nextEquipped = { ...equipped, [slot]: normaliseItem({ ...normaliseItem(item), equip_slot: slot, equipped_slot: slot, equipped: true, is_equipped: true }) };
    if (slot === 'mainHand') nextEquipped.main_hand = nextEquipped[slot];
    if (slot === 'offHand') nextEquipped.off_hand = nextEquipped[slot];
    if (slot === 'armor') nextEquipped.armour = nextEquipped[slot];
    saveEquipped(nextEquipped, slot);
  };

  const clearSlot = (slot) => {
    const nextEquipped = { ...equipped };
    delete nextEquipped[slot];
    if (slot === 'mainHand') { delete nextEquipped.main_hand; delete nextEquipped.weapon; }
    if (slot === 'offHand') delete nextEquipped.off_hand;
    if (slot === 'armor') delete nextEquipped.armour;
    saveEquipped(nextEquipped, slot);
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) { toast.error('Item name is required'); return; }
    const item = normaliseItem({ ...newItem, name: newItem.name.trim() });
    const ok = await saveInventory([...inventory, item], 'Item added');
    if (ok) { setNewItem(blankItem); setShowAddItem(false); }
  };

  const addReferenceItem = async (referenceItem, shouldEquip = false) => {
    const item = normaliseReferenceItem(referenceItem);
    const nextInventory = [...inventory, item];
    const slot = inferEquipSlot(item);
    const equippedItem = shouldEquip && slot ? { ...item, equip_slot: slot, equipped_slot: slot, equipped: true, is_equipped: true } : null;
    const nextEquipped = equippedItem ? { ...equipped, [slot]: equippedItem } : equipped;
    if (equippedItem && slot === 'mainHand') nextEquipped.main_hand = equippedItem;
    if (equippedItem && slot === 'offHand') nextEquipped.off_hand = equippedItem;
    if (equippedItem && slot === 'armor') nextEquipped.armour = equippedItem;
    const updates = shouldEquip && slot ? { inventory: nextInventory, equipped: nextEquipped, armor_class: deriveArmorClass({ ...character, equipped: nextEquipped }, { ignoreStoredAc: true }) } : { inventory: nextInventory };
    setSavingItems(true);
    try {
      await apiClient.patch(`/characters/${character.id}`, updates);
      onCharacterUpdate?.(updates);
      toast.success(shouldEquip && slot ? `${item.name} added and equipped` : `${item.name} added`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add equipment');
    } finally {
      setSavingItems(false);
    }
  };

  const updateInventoryItem = async (item, index, updates) => {
    const nextInventory = [...inventory];
    const inventoryIndex = inventory.findIndex((candidate, i) => candidate === item || getItemKey(candidate, i) === getItemKey(item, index));
    if (inventoryIndex < 0) { toast.info('Only backpack items can be edited here. Equipped starter gear can still be assigned to slots.'); return; }
    nextInventory[inventoryIndex] = normaliseItem({ ...normaliseItem(nextInventory[inventoryIndex]), ...updates });
    await saveInventory(nextInventory);
  };

  const removeInventoryItem = async (item, index) => {
    const inventoryIndex = inventory.findIndex((candidate, i) => candidate === item || getItemKey(candidate, i) === getItemKey(item, index));
    if (inventoryIndex < 0) { toast.info('Only backpack items can be removed here.'); return; }
    const nextInventory = [...inventory];
    nextInventory.splice(inventoryIndex, 1);
    await saveInventory(nextInventory, 'Item removed');
  };

  const quantityActions = (item, index) => {
    const qty = Number(getItemQuantity(item) ?? 1) || 1;
    const slot = inferEquipSlot(item);
    return (
      <>
        {slot && <button type="button" onClick={() => equipItem(slot, item)} disabled={savingItems}>Equip</button>}
        {requiresAttunement(item) && <button type="button" onClick={() => updateInventoryItem(item, index, { attuned: !isAttuned(item), is_attuned: !isAttuned(item) })} disabled={savingItems}>{isAttuned(item) ? 'Unattune' : 'Attune'}</button>}
        <button type="button" onClick={() => updateInventoryItem(item, index, { quantity: Math.max(1, qty - 1), qty: Math.max(1, qty - 1) })} disabled={savingItems}>- Qty</button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { quantity: qty + 1, qty: qty + 1 })} disabled={savingItems}>+ Qty</button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { favorite: !isFavorite(item), favourite: !isFavorite(item) })} disabled={savingItems}>{isFavorite(item) ? 'Unfav' : 'Fav'}</button>
        <button type="button" onClick={() => updateInventoryItem(item, index, { type: isConsumableLike(item) ? 'Item' : 'Consumable' })} disabled={savingItems}>{isConsumableLike(item) ? 'Not Consumable' : 'Consumable'}</button>
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
            <span style={{ fontSize: 12, color: 'var(--cs-text-soft)' }}>{syncingGranted ? 'Preparing GM-granted equipment…' : 'Equipping armour recalculates AC. Equipping weapons adds combat attacks.'}</span>
            <button type="button" onClick={() => setShowAddItem(prev => !prev)}>{showAddItem ? 'Close Add Item' : 'Add Item'}</button>
          </div>
        </div>
        <div className="clean-sheet-item-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getEquippedItem(equipped, slot);
            return item ? <ItemCard key={slot} slot={label} item={item} actions={<>{(['mainHand', 'offHand'].includes(slot) || item?.damage_dice || item?.damage || String(item?.type || '').toLowerCase().includes('weapon')) && <button type="button" onClick={() => makeWeaponRoll(item)}>Attack Roll</button>}<button type="button" onClick={() => clearSlot(slot)} disabled={savingSlot === slot}>Clear Slot</button></>} /> : <div key={slot} className="clean-sheet-item-card clean-sheet-empty-slot"><span className="clean-sheet-item-slot">{label}</span><strong>Empty</strong><p>Select an item below to assign this slot.</p></div>;
          })}
        </div>
      </section>

      {showAddItem && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Add Item</h2>
          <form className="clean-sheet-add-item-form" onSubmit={addItem}>
            <input value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))} placeholder="Item name" />
            <select value={newItem.type} onChange={e => setNewItem(prev => ({ ...prev, type: e.target.value }))}><option>Item</option><option>Weapon</option><option>Armour</option><option>Shield</option><option>Consumable</option><option>Magic Item</option></select>
            <input type="number" min="1" value={newItem.quantity} onChange={e => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))} placeholder="Qty" />
            <input type="text" value={newItem.damage_dice} onChange={e => setNewItem(prev => ({ ...prev, damage_dice: e.target.value }))} placeholder="Damage dice (e.g. 1d6, 2d8+3)" />
            <select value={newItem.damage_type} onChange={e => setNewItem(prev => ({ ...prev, damage_type: e.target.value }))}><option value="">Damage type</option>{['slashing','piercing','bludgeoning','fire','cold','lightning','acid','poison','necrotic','radiant','psychic','thunder','force'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
            <input type="number" value={newItem.attack_bonus} onChange={e => setNewItem(prev => ({ ...prev, attack_bonus: Number(e.target.value) || 0 }))} placeholder="Attack bonus (+1, +2…)" />
            <input type="number" value={newItem.ac_bonus} onChange={e => setNewItem(prev => ({ ...prev, ac_bonus: Number(e.target.value) || 0 }))} placeholder="AC bonus (+1, +2…)" />
            <textarea value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} placeholder="Description or effect" />
            <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.attunement_required} onChange={e => setNewItem(prev => ({ ...prev, attunement_required: e.target.checked, requires_attunement: e.target.checked, attuned: e.target.checked ? prev.attuned : false }))} />Requires attunement</label>
            {newItem.attunement_required && <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.attuned} onChange={e => setNewItem(prev => ({ ...prev, attuned: e.target.checked, is_attuned: e.target.checked }))} />Currently attuned</label>}
            <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.favorite} onChange={e => setNewItem(prev => ({ ...prev, favorite: e.target.checked, favourite: e.target.checked }))} />Favourite this item</label>
            <button type="submit" disabled={savingItems}>Save Item</button>
          </form>
        </section>
      )}

      <section className="clean-sheet-panel"><h2>Currency</h2><CurrencyBlock currency={character?.currency || {}} gold={character?.gold} /></section>
      <section className="clean-sheet-panel"><h2>Active Item Effects</h2><div className="clean-sheet-currency-grid"><div><span>Atk Bonus</span><strong>{Number(character?.item_effects?.attack_bonus || 0)}</strong></div><div><span>AC Bonus</span><strong>{Number(character?.item_effects?.ac_bonus || 0)}</strong></div><div><span>STR</span><strong>{Number(character?.item_effects?.stat_bonuses?.strength || 0)}</strong></div><div><span>DEX</span><strong>{Number(character?.item_effects?.stat_bonuses?.dexterity || 0)}</strong></div><div><span>CON</span><strong>{Number(character?.item_effects?.stat_bonuses?.constitution || 0)}</strong></div><div><span>INT</span><strong>{Number(character?.item_effects?.stat_bonuses?.intelligence || 0)}</strong></div><div><span>WIS</span><strong>{Number(character?.item_effects?.stat_bonuses?.wisdom || 0)}</strong></div><div><span>CHA</span><strong>{Number(character?.item_effects?.stat_bonuses?.charisma || 0)}</strong></div></div></section>

      {favoriteItems.length > 0 && <section className="clean-sheet-panel clean-sheet-wide"><h2>Favourite Items</h2><div className="clean-sheet-item-grid">{favoriteItems.map((item, index) => <ItemCard key={getItemKey(item, index)} item={item} />)}</div></section>}
      {consumables.length > 0 && <section className="clean-sheet-panel clean-sheet-wide"><h2>Consumables</h2><div className="clean-sheet-item-grid">{consumables.map((item, index) => <ItemCard key={getItemKey(item, index)} item={item} />)}</div></section>}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header"><h2>Add Equipment from List</h2><span style={{ fontSize: 12, color: 'var(--cs-text-soft)' }}>Pick a weapon, armour, or shield and add it straight to this character.</span></div>
        <div className="clean-sheet-equipment-tools"><input value={equipmentSearch} onChange={event => setEquipmentSearch(event.target.value)} placeholder="Search weapons, armour, shields…" /><select value={equipmentTypeFilter} onChange={event => setEquipmentTypeFilter(event.target.value)} aria-label="Filter equipment type"><option value="all">All equipment</option><option value="weapon">Weapons</option><option value="armor">Armour</option><option value="shield">Shields</option></select></div>
        <div className="clean-sheet-equipment-picker"><select value={selectedReferenceKey} onChange={event => setSelectedReferenceKey(event.target.value)}><option value="">Select equipment…</option>{filteredReferenceCatalog.map(entry => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select><button type="button" disabled={!selectedReference || savingItems} onClick={() => selectedReference && addReferenceItem(selectedReference, false)}>Add to Inventory</button><button type="button" disabled={!selectedReference || savingItems || !selectedReferenceSlot} onClick={() => selectedReference && addReferenceItem(selectedReference, true)}>Add & Equip</button></div>
        {selectedReferenceItem && <div className="clean-sheet-equipment-preview"><div><span>Selected</span><strong>{selectedReferenceItem.name}</strong><em>{selectedReferenceItem.description || selectedReferenceEntry?.kind}</em></div><div><span>Will use</span><strong>{selectedReferenceSlot ? (EQUIP_SLOTS.find(([slot]) => slot === selectedReferenceSlot)?.[1] || selectedReferenceSlot) : 'Inventory only'}</strong><em>{selectedReferenceAttack ? `${selectedReferenceAttack.attackText} to hit • ${selectedReferenceAttack.damageText} ${selectedReferenceAttack.damageType}` : selectedReferenceAc ? `AC becomes ${selectedReferenceAc}` : 'No slot detected'}</em></div></div>}
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header"><h2>Carried Items</h2><input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items…" /></div>
        {referenceMatches.length > 0 && <div className="clean-sheet-reference-match-grid">{referenceMatches.map(item => { const refItem = normaliseReferenceItem(item); const slot = inferEquipSlot(refItem); return <div key={`${item.category || item.type || 'gear'}-${item.name}`} className="clean-sheet-reference-match"><div><strong>{item.name}</strong><span>{item.damage || item.ac ? `${item.damage || `AC ${item.ac}`}` : item.category}</span></div><button type="button" onClick={() => addReferenceItem(item, false)} disabled={savingItems}>Add</button>{slot && <button type="button" onClick={() => addReferenceItem(item, true)} disabled={savingItems}>Add & Equip</button>}</div>; })}</div>}
        <div className="clean-sheet-item-grid">{filteredInventory.length ? filteredInventory.map((item, index) => <ItemCard key={getItemKey(item, index)} item={item} actions={quantityActions(item, index)} />) : <p className="clean-sheet-empty-note">No carried items match your search.</p>}</div>
      </section>
    </div>
  );
}

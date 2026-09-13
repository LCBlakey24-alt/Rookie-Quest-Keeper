import React, { useEffect, useMemo, useState } from 'react';
import { Backpack, Coins, Plus, Search, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import { deriveArmorClass, deriveWeaponAttack } from '@/data/characterCombatDerivations';
import {
  buildCarriedInventoryView,
  buildCurrencyUpdate,
  clearInventorySlotState,
  equipInventoryState,
  findInventoryItemIndex,
  getCanonicalEquippedItem,
  inventoryItemIdentity,
  normaliseCurrencyState,
  removeInventoryItemState,
  setCanonicalInventorySlot,
  syncInventoryWithEquipment,
  updateInventoryItemState,
} from '@/data/characterInventoryState';
import {
  ADVENTURING_GEAR,
  ALL_ARMOR,
  ALL_TOOLS,
  ALL_WEAPONS,
} from '@/data/equipmentDatabase';
import './CleanSheetInventoryMobileOverrides.css';

const EQUIP_SLOTS = [
  ['mainHand', 'Main Hand'],
  ['offHand', 'Off Hand'],
  ['armor', 'Armour'],
  ['gauntlets', 'Gauntlets'],
  ['boots', 'Boots'],
];

const SLOT_LABELS = {
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  armor: 'Armour',
  gauntlets: 'Gauntlets',
  boots: 'Boots',
  shield: 'Off Hand',
};

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
};

const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function itemName(item) {
  if (!item) return 'Unknown item';
  if (typeof item === 'string') return item;
  return item.name || item.item_name || item.label || item.title || 'Unknown item';
}

function itemDescription(item) {
  if (!item || typeof item === 'string') return '';
  return item.description || item.desc || item.type || item.category || item.rarity || '';
}

function itemQuantity(item) {
  if (!item || typeof item === 'string') return 1;
  return Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1;
}

function isFavorite(item) {
  return Boolean(item?.favorite || item?.favourite || item?.is_favorite || item?.is_favourite);
}

function requiresAttunement(item) {
  return Boolean(item?.attunement_required || item?.requires_attunement);
}

function isAttuned(item) {
  return Boolean(item?.attuned || item?.is_attuned);
}

function isConsumable(item) {
  const haystack = `${itemName(item)} ${item?.type || ''} ${item?.category || ''}`.toLowerCase();
  return /consumable|potion|healing|scroll/.test(haystack);
}

function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot || 'Slot';
}

function inferEquipSlot(item) {
  const explicit = item?.equipped_slot || item?.equip_slot;
  if (explicit) return explicit === 'shield' ? 'offHand' : explicit;
  const text = `${item?.type || ''} ${item?.item_type || ''} ${itemName(item)}`.toLowerCase();
  if (text.includes('shield')) return 'offHand';
  if (/gauntlet|glove|bracer/.test(text)) return 'gauntlets';
  if (/boot|shoe|sandal/.test(text)) return 'boots';
  if (/armour|armor|mail|plate|leather|scale|chain|hide/.test(text)) return 'armor';
  if (/off hand|offhand/.test(text)) return 'offHand';
  if (/weapon|sword|bow|crossbow|axe|mace|staff|dagger|spear|lance|hammer|rapier|club|flail|halberd|pike|trident|whip/.test(text)) return 'mainHand';
  if (item?.damage_dice || item?.damage) return 'mainHand';
  return '';
}

function makeItemId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normaliseItem(item, source = '') {
  if (typeof item === 'string') {
    return {
      name: item,
      type: 'Item',
      item_type: 'Item',
      quantity: 1,
      description: source === 'starting' ? 'Starting equipment' : '',
      source,
    };
  }
  const name = itemName(item);
  const type = item?.type || item?.category || item?.item_type || 'Item';
  const equipSlot = inferEquipSlot(item);
  return {
    ...item,
    name,
    type,
    item_type: item?.item_type || type,
    quantity: itemQuantity(item),
    qty: itemQuantity(item),
    description: item?.description || item?.desc || '',
    source: item?.source || source,
    favorite: isFavorite(item),
    favourite: isFavorite(item),
    attunement_required: requiresAttunement(item),
    requires_attunement: requiresAttunement(item),
    attuned: isAttuned(item),
    is_attuned: isAttuned(item),
    equipped: Boolean(item?.equipped || item?.is_equipped),
    is_equipped: Boolean(item?.equipped || item?.is_equipped),
    equip_slot: equipSlot,
    equipped_slot: equipSlot,
    attack_bonus: Number(item?.attack_bonus ?? 0) || 0,
    ac_bonus: Number(item?.ac_bonus ?? item?.acBonus ?? 0) || 0,
    damage_dice: item?.damage_dice || item?.damage || '',
    damage_type: item?.damage_type || item?.damageType || '',
  };
}

function normaliseReferenceItem(entry) {
  const item = entry?.item || entry || {};
  const kind = entry?.kind || item?.kind || '';
  const category = String(item?.category || kind).toLowerCase();
  const typeText = String(item?.type || item?.item_type || kind).toLowerCase();
  const isShield = category === 'shield' || typeText === 'shield' || String(item?.name || '').toLowerCase().includes('shield');
  const isArmor = ['light', 'medium', 'heavy', 'armor', 'armour', 'shield'].includes(category) || item?.ac || item?.acBonus;
  const damageParts = String(item?.damage || item?.damage_dice || '').match(/(\d+d\d+|\d+)\s*([a-z]+)?/i);
  const isWeapon = Boolean(damageParts) || typeText.includes('weapon') || category.includes('melee') || category.includes('ranged');
  const type = isShield ? 'Shield' : isArmor ? 'Armour' : isWeapon ? 'Weapon' : item?.type || kind || 'Item';
  return normaliseItem({
    ...item,
    id: item.id || makeItemId('equipment'),
    name: item.name || 'Equipment',
    type,
    item_type: type,
    quantity: 1,
    description: [
      item.description,
      item.category,
      Array.isArray(item.properties) ? item.properties.join(', ') : item.properties,
      item.cost ? `Cost: ${item.cost}` : '',
    ].filter(Boolean).join(' • '),
    damage_dice: damageParts && isWeapon ? damageParts[1] : '',
    damage_type: damageParts && isWeapon ? item.damageType || damageParts[2] || '' : '',
    properties: Array.isArray(item.properties) ? item.properties.join(', ') : item.properties || '',
    range: item.range || '',
    ac_bonus: Number(item.ac_bonus ?? item.acBonus ?? (isShield ? 2 : 0)) || 0,
  }, 'inventory');
}

function InventoryItemCard({ item, actions, slot }) {
  const damageDice = item?.damage_dice || item?.damage;
  const damageType = item?.damage_type || item?.damageType || '';
  return (
    <article className={`clean-sheet-item-card ${isFavorite(item) ? 'favorite' : ''} ${isConsumable(item) ? 'consumable' : ''}`}>
      <div className="clean-sheet-item-card-top">
        {slot && <span className="clean-sheet-item-slot">{slot}</span>}
        {item?.source === 'starting' && <span className="clean-sheet-item-slot">Starter</span>}
        {isFavorite(item) && <span className="clean-sheet-item-slot favorite">Favourite</span>}
        {isConsumable(item) && <span className="clean-sheet-item-slot consumable">Consumable</span>}
        {requiresAttunement(item) && <span className="clean-sheet-item-slot">{isAttuned(item) ? 'Attuned' : 'Needs Attunement'}</span>}
        {(item?.equipped || item?.is_equipped) && <span className="clean-sheet-item-slot">Equipped</span>}
      </div>
      <strong>{itemName(item)}</strong>
      {itemDescription(item) && <p>{itemDescription(item)}</p>}
      {damageDice && <em>{damageDice}{damageType ? ` ${damageType}` : ''}</em>}
      {!damageDice && Number(item?.ac_bonus || 0) !== 0 && <em>AC +{Number(item.ac_bonus || 0)}</em>}
      <em>Qty {itemQuantity(item)}</em>
      {actions && <div className="clean-sheet-item-actions">{actions}</div>}
    </article>
  );
}

export default function CleanInventoryTabV2({ character, onCharacterUpdate, onRoll }) {
  const [saving, setSaving] = useState(false);
  const [savingSlot, setSavingSlot] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);
  const [itemSearch, setItemSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('all');
  const [selectedReferenceKey, setSelectedReferenceKey] = useState('');
  const [currencyDraft, setCurrencyDraft] = useState(() => normaliseCurrencyState(character));

  useEffect(() => {
    setCurrencyDraft(normaliseCurrencyState(character));
  }, [character?.currency, character?.gold]);

  const equipped = character?.equipped || {};
  const inventory = useMemo(
    () => toArray(character?.inventory).map((item) => normaliseItem(item, 'inventory')),
    [character?.inventory],
  );
  const equipment = useMemo(
    () => toArray(character?.equipment).map((item) => normaliseItem(item, 'equipment')),
    [character?.equipment],
  );
  const starting = useMemo(
    () => toArray(character?.starting_equipment || character?.startingEquipment).map((item) => normaliseItem(item, 'starting')),
    [character?.starting_equipment, character?.startingEquipment],
  );
  const allCarriedItems = useMemo(
    () => buildCarriedInventoryView({ inventory, equipment, starting, equipped }).map((item) => normaliseItem(item, item.source)),
    [inventory, equipment, starting, equipped],
  );
  const attunedItems = useMemo(() => allCarriedItems.filter(isAttuned), [allCarriedItems]);
  const attunementItems = useMemo(() => allCarriedItems.filter(requiresAttunement), [allCarriedItems]);
  const favoriteItems = useMemo(() => allCarriedItems.filter(isFavorite), [allCarriedItems]);
  const currency = useMemo(() => normaliseCurrencyState(character), [character]);
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return allCarriedItems;
    return allCarriedItems.filter((item) => `${itemName(item)} ${itemDescription(item)} ${slotLabel(inferEquipSlot(item))}`.toLowerCase().includes(query));
  }, [allCarriedItems, itemSearch]);

  const referenceCatalog = useMemo(() => [
    ...ALL_WEAPONS.map((item) => ({ key: `weapon-${item.id || item.name}`, kind: 'weapon', label: item.name, item })),
    ...ALL_ARMOR.map((item) => {
      const shield = String(item.category || '').toLowerCase() === 'shield';
      return { key: `${shield ? 'shield' : 'armor'}-${item.id || item.name}`, kind: shield ? 'shield' : 'armor', label: item.name, item };
    }),
    ...ADVENTURING_GEAR.map((item) => ({ key: `gear-${item.id || item.name}`, kind: 'gear', label: item.name, item })),
    ...ALL_TOOLS.map((item) => ({ key: `tool-${item.id || item.name}`, kind: 'tool', label: item.name, item })),
  ], []);

  const filteredCatalog = useMemo(() => {
    const query = equipmentSearch.trim().toLowerCase();
    return referenceCatalog
      .filter((entry) => equipmentTypeFilter === 'all' || entry.kind === equipmentTypeFilter)
      .filter((entry) => !query || `${entry.label} ${entry.kind} ${entry.item?.category || ''} ${entry.item?.description || ''}`.toLowerCase().includes(query))
      .slice(0, 120);
  }, [equipmentSearch, equipmentTypeFilter, referenceCatalog]);

  const selectedReference = referenceCatalog.find((entry) => entry.key === selectedReferenceKey) || null;
  const selectedReferenceItem = selectedReference ? normaliseReferenceItem(selectedReference) : null;
  const selectedReferenceSlot = selectedReferenceItem ? inferEquipSlot(selectedReferenceItem) : '';
  const selectedPreviewEquipped = selectedReferenceItem && selectedReferenceSlot
    ? setCanonicalInventorySlot(equipped, selectedReferenceSlot, selectedReferenceItem)
    : equipped;
  const selectedReferenceAc = selectedReferenceItem && ['armor', 'offHand'].includes(selectedReferenceSlot)
    ? deriveArmorClass({ ...character, equipped: selectedPreviewEquipped }, { ignoreStoredAc: true })
    : null;
  const selectedReferenceAttack = selectedReferenceItem && selectedReferenceSlot === 'mainHand'
    ? deriveWeaponAttack(selectedReferenceItem, character, proficiencyBonus)
    : null;

  const patchCharacter = async (updates, success = 'Inventory updated') => {
    if (!character?.id || saving) return false;
    setSaving(true);
    try {
      const response = await apiClient.patch(`/characters/${character.id}`, updates);
      const serverCharacter = response?.data?.character || response?.data;
      onCharacterUpdate?.(serverCharacter && typeof serverCharacter === 'object' ? serverCharacter : updates);
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not update inventory');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveInventoryEquipment = async (state, message = 'Equipment updated') => {
    const nextInventory = syncInventoryWithEquipment(state.inventory, state.equipped);
    const armorClass = deriveArmorClass({ ...character, inventory: nextInventory, equipped: state.equipped }, { ignoreStoredAc: true });
    return patchCharacter({ inventory: nextInventory, equipped: state.equipped, armor_class: armorClass }, message);
  };

  const equipItem = async (item, requestedSlot = '') => {
    const slot = requestedSlot || inferEquipSlot(item);
    if (!slot) {
      toast.info('No equipment slot could be detected for this item.');
      return;
    }
    setSavingSlot(slot);
    const state = equipInventoryState({ inventory, equipped, item, slot });
    await saveInventoryEquipment(state, `${itemName(item)} equipped`);
    setSavingSlot('');
  };

  const clearSlot = async (slot) => {
    setSavingSlot(slot);
    const state = clearInventorySlotState({ inventory, equipped, slot });
    await saveInventoryEquipment(state, `${slotLabel(slot)} cleared`);
    setSavingSlot('');
  };

  const addCustomItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    const item = normaliseItem({ ...newItem, id: makeItemId('custom'), name: newItem.name.trim() }, 'inventory');
    const nextInventory = [...inventory, item];
    const ok = await patchCharacter({ inventory: nextInventory }, `${item.name} added`);
    if (ok) {
      setNewItem(blankItem);
      setShowAddItem(false);
    }
  };

  const addReferenceItem = async (shouldEquip = false) => {
    if (!selectedReferenceItem) return;
    const item = { ...selectedReferenceItem, id: makeItemId('equipment'), source: 'inventory' };
    const nextInventory = [...inventory, item];
    if (shouldEquip && selectedReferenceSlot) {
      const state = equipInventoryState({ inventory: nextInventory, equipped, item, slot: selectedReferenceSlot });
      const ok = await saveInventoryEquipment(state, `${item.name} added and equipped`);
      if (ok) setSelectedReferenceKey('');
      return;
    }
    const ok = await patchCharacter({ inventory: nextInventory }, `${item.name} added`);
    if (ok) setSelectedReferenceKey('');
  };

  const updateInventoryItem = async (item, updates, success = 'Item updated') => {
    const state = updateInventoryItemState({ inventory, equipped, item, updates });
    if (!state.updated) {
      toast.info('Only backpack items can be edited. Starting/GM-granted items stay read-only here.');
      return;
    }
    await saveInventoryEquipment(state, success);
  };

  const removeItem = async (item) => {
    const state = removeInventoryItemState({ inventory, equipped, item });
    if (!state.removed) {
      toast.info('Only backpack items can be removed.');
      return;
    }
    await saveInventoryEquipment(state, `${itemName(item)} removed`);
  };

  const toggleAttunement = async (item) => {
    if (!isAttuned(item) && attunedItems.length >= 3) {
      toast.error('This character already has 3 attuned items. Unattune one first.');
      return;
    }
    await updateInventoryItem(item, { attuned: !isAttuned(item), is_attuned: !isAttuned(item) }, isAttuned(item) ? 'Item unattuned' : 'Item attuned');
  };

  const changeQuantity = async (item, delta) => {
    const next = itemQuantity(item) + delta;
    if (next <= 0) {
      await removeItem(item);
      return;
    }
    await updateInventoryItem(item, { quantity: next, qty: next }, 'Quantity updated');
  };

  const saveCurrency = async () => {
    let working = { ...character };
    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach((coin) => {
      const update = buildCurrencyUpdate(working, coin, currencyDraft[coin]);
      working = { ...working, ...update };
    });
    const ok = await patchCharacter({ currency: working.currency, gold: working.gold }, 'Currency updated');
    if (ok) setCurrencyDraft(normaliseCurrencyState(working));
  };

  const makeWeaponRoll = (item) => {
    const attack = deriveWeaponAttack(item, character, proficiencyBonus);
    if (onRoll) {
      onRoll(`${attack.title} Attack`, Number(attack.attackMod || 0));
      toast.info(`${attack.damageText} ${attack.damageType || ''} damage on hit`);
      return;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
    toast.success(`${attack.title} attack: ${roll + Number(attack.attackMod || 0)}`, {
      description: `${roll} on d20 ${attack.attackText} • ${attack.damageText} ${attack.damageType || ''} damage on hit`,
    });
  };

  const itemActions = (item) => {
    const inInventory = findInventoryItemIndex(inventory, item, equipped) >= 0;
    const slot = inferEquipSlot(item);
    return (
      <>
        {slot && <button type="button" onClick={() => equipItem(item, slot)} disabled={saving}>Equip {slotLabel(slot)}</button>}
        {(slot === 'mainHand' || item?.damage_dice || item?.damage) && <button type="button" onClick={() => makeWeaponRoll(item)} disabled={saving}>Attack</button>}
        {requiresAttunement(item) && inInventory && <button type="button" onClick={() => toggleAttunement(item)} disabled={saving}>{isAttuned(item) ? 'Unattune' : 'Attune'}</button>}
        {inInventory && <button type="button" onClick={() => changeQuantity(item, -1)} disabled={saving}>- Qty</button>}
        {inInventory && <button type="button" onClick={() => changeQuantity(item, 1)} disabled={saving}>+ Qty</button>}
        {inInventory && <button type="button" onClick={() => updateInventoryItem(item, { favorite: !isFavorite(item), favourite: !isFavorite(item) }, isFavorite(item) ? 'Favourite removed' : 'Favourite added')} disabled={saving}>{isFavorite(item) ? 'Unfav' : 'Fav'}</button>}
        {inInventory && <button type="button" onClick={() => removeItem(item)} disabled={saving}>Remove</button>}
      </>
    );
  };

  return (
    <div className="clean-sheet-grid clean-sheet-inventory-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Inventory</h2>
            <p>One carried item state now drives equipment, armour class, quantities, attunement, and currency.</p>
          </div>
          <button type="button" onClick={() => setShowAddItem((value) => !value)}><Plus size={15} /> {showAddItem ? 'Close Add Item' : 'Add Item'}</button>
        </div>
        <div className="clean-sheet-inventory-summary">
          <div><Backpack size={16} /><span>Total Items</span><strong>{allCarriedItems.length}</strong></div>
          <div><Shield size={16} /><span>Equipped</span><strong>{EQUIP_SLOTS.filter(([slot]) => getCanonicalEquippedItem(equipped, slot)).length}/{EQUIP_SLOTS.length}</strong></div>
          <div><Sparkles size={16} /><span>Attuned</span><strong>{attunedItems.length}/3</strong></div>
          <div><Coins size={16} /><span>Gold</span><strong>{currency.gp}</strong></div>
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-equipped-slots-section">
        <div className="clean-sheet-inventory-header"><div><h2>Equipped Slots</h2><p>Equipping and clearing a slot now updates the matching backpack item too.</p></div></div>
        <div className="clean-sheet-equipped-slot-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getCanonicalEquippedItem(equipped, slot);
            return item ? (
              <InventoryItemCard
                key={slot}
                item={normaliseItem(item, 'equipped')}
                slot={label}
                actions={<><button type="button" onClick={() => makeWeaponRoll(item)} disabled={slot !== 'mainHand' && !item?.damage_dice}>Attack Roll</button><button type="button" onClick={() => clearSlot(slot)} disabled={savingSlot === slot || saving}>Clear Slot</button></>}
              />
            ) : (
              <article key={slot} className="clean-sheet-item-card clean-sheet-empty-slot"><span className="clean-sheet-item-slot">{label}</span><strong>Empty</strong><p>Equip a carried item below.</p></article>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header"><div><h2>Currency</h2><p>Edit coin totals directly. Gold stays compatible with the legacy top-level gold field.</p></div><button type="button" onClick={saveCurrency} disabled={saving}>Save Currency</button></div>
        <div className="clean-sheet-currency-grid">
          {['cp', 'sp', 'ep', 'gp', 'pp'].map((coin) => (
            <label key={coin}>
              <span>{coin.toUpperCase()}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={currencyDraft[coin]}
                onChange={(event) => setCurrencyDraft((current) => ({ ...current, [coin]: Math.max(0, Number(event.target.value) || 0) }))}
              />
            </label>
          ))}
        </div>
      </section>

      {showAddItem && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Add Item</h2>
          <form className="clean-sheet-add-item-form" onSubmit={addCustomItem}>
            <input value={newItem.name} onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))} placeholder="Item name" />
            <select value={newItem.type} onChange={(event) => setNewItem((current) => ({ ...current, type: event.target.value }))}>
              {['Item', 'Weapon', 'Armour', 'Shield', 'Gauntlets', 'Boots', 'Consumable', 'Magic Item'].map((type) => <option key={type}>{type}</option>)}
            </select>
            <input type="number" min="1" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: Math.max(1, Number(event.target.value) || 1) }))} placeholder="Qty" />
            <select value={newItem.equip_slot} onChange={(event) => setNewItem((current) => ({ ...current, equip_slot: event.target.value }))}>
              <option value="">No slot</option>
              {EQUIP_SLOTS.map(([slot, label]) => <option key={slot} value={slot}>{label}</option>)}
            </select>
            <input value={newItem.damage_dice} onChange={(event) => setNewItem((current) => ({ ...current, damage_dice: event.target.value }))} placeholder="Damage dice e.g. 1d8" />
            <input value={newItem.damage_type} onChange={(event) => setNewItem((current) => ({ ...current, damage_type: event.target.value }))} placeholder="Damage type" />
            <input type="number" value={newItem.attack_bonus} onChange={(event) => setNewItem((current) => ({ ...current, attack_bonus: Number(event.target.value) || 0 }))} placeholder="Attack bonus" />
            <input type="number" value={newItem.ac_bonus} onChange={(event) => setNewItem((current) => ({ ...current, ac_bonus: Number(event.target.value) || 0 }))} placeholder="AC bonus" />
            <textarea value={newItem.description} onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))} placeholder="Description or effect" />
            <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.attunement_required} onChange={(event) => setNewItem((current) => ({ ...current, attunement_required: event.target.checked, attuned: event.target.checked ? current.attuned : false }))} /> Requires attunement</label>
            {newItem.attunement_required && <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.attuned} onChange={(event) => setNewItem((current) => ({ ...current, attuned: event.target.checked }))} /> Currently attuned</label>}
            <label className="clean-sheet-checkbox-row"><input type="checkbox" checked={newItem.favorite} onChange={(event) => setNewItem((current) => ({ ...current, favorite: event.target.checked }))} /> Favourite this item</label>
            <button type="submit" disabled={saving}>Save Item</button>
          </form>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-attunement-section">
        <div className="clean-sheet-inventory-header"><div><h2>Attuned Items</h2><p>Standard three-item attunement limit is enforced for backpack items.</p></div><span className="clean-sheet-item-slot">{attunedItems.length}/3</span></div>
        <div className="clean-sheet-item-grid">
          {attunementItems.length ? attunementItems.map((item, index) => <InventoryItemCard key={`${inventoryItemIdentity(item)}-${index}`} item={item} actions={itemActions(item)} />) : <p className="clean-sheet-empty-note">No attunement items recorded yet.</p>}
        </div>
      </section>

      {favoriteItems.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide"><h2>Favourite Items</h2><div className="clean-sheet-item-grid">{favoriteItems.map((item, index) => <InventoryItemCard key={`fav-${inventoryItemIdentity(item)}-${index}`} item={item} actions={itemActions(item)} />)}</div></section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header"><div><h2>Add Equipment from List</h2><p>Search built-in weapons, armour, gear and tools, then add or add-and-equip atomically.</p></div></div>
        <div className="clean-sheet-equipment-tools">
          <label><Search size={15} /><input value={equipmentSearch} onChange={(event) => setEquipmentSearch(event.target.value)} placeholder="Search equipment, gear, tools…" /></label>
          <select value={equipmentTypeFilter} onChange={(event) => setEquipmentTypeFilter(event.target.value)} aria-label="Filter equipment type">
            <option value="all">All equipment</option><option value="weapon">Weapons</option><option value="armor">Armour</option><option value="shield">Shields</option><option value="gear">Gear</option><option value="tool">Tools</option>
          </select>
        </div>
        <div className="clean-sheet-equipment-picker">
          <select value={selectedReferenceKey} onChange={(event) => setSelectedReferenceKey(event.target.value)}><option value="">Select equipment…</option>{filteredCatalog.map((entry) => <option key={entry.key} value={entry.key}>{entry.label} ({entry.kind})</option>)}</select>
          <button type="button" disabled={!selectedReferenceItem || saving} onClick={() => addReferenceItem(false)}>Add to Inventory</button>
          <button type="button" disabled={!selectedReferenceItem || !selectedReferenceSlot || saving} onClick={() => addReferenceItem(true)}>Add & Equip</button>
        </div>
        {selectedReferenceItem && (
          <div className="clean-sheet-equipment-preview">
            <div><span>Selected</span><strong>{selectedReferenceItem.name}</strong><em>{selectedReferenceItem.description || selectedReference?.kind}</em></div>
            <div><span>Will use</span><strong>{selectedReferenceSlot ? slotLabel(selectedReferenceSlot) : 'Inventory only'}</strong><em>{selectedReferenceAttack ? `${selectedReferenceAttack.attackText} to hit • ${selectedReferenceAttack.damageText} ${selectedReferenceAttack.damageType}` : selectedReferenceAc ? `AC becomes ${selectedReferenceAc}` : 'No slot detected'}</em></div>
          </div>
        )}
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header"><div><h2>All Items</h2><p>Equipped items are overlaid onto their carried copy instead of duplicated.</p></div><input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search carried items…" /></div>
        <div className="clean-sheet-item-grid">
          {filteredItems.length ? filteredItems.map((item, index) => <InventoryItemCard key={`${inventoryItemIdentity(item)}-${index}`} item={item} slot={(item.equipped || item.is_equipped) ? slotLabel(inferEquipSlot(item)) : ''} actions={itemActions(item)} />) : <p className="clean-sheet-empty-note">No carried items match your search.</p>}
        </div>
      </section>
    </div>
  );
}

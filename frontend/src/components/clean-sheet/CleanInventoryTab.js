import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

const API = API_BASE;
const EQUIP_SLOTS = [
  ['mainHand', 'Main Hand'],
  ['offHand', 'Off Hand'],
  ['armor', 'Armour'],
  ['shield', 'Shield'],
];

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

function getEquippedItem(equipped = {}, slot) {
  if (slot === 'mainHand') return equipped.mainHand || equipped.main_hand || equipped.weapon;
  if (slot === 'offHand') return equipped.offHand || equipped.off_hand;
  if (slot === 'armor') return equipped.armor || equipped.armour;
  return equipped[slot];
}

function getItemKey(item, index = '') {
  return `${getItemName(item).toLowerCase()}-${index}`;
}

function ItemCard({ item, slot, actions }) {
  const quantity = getItemQuantity(item);
  return (
    <div className="clean-sheet-item-card">
      {slot && <span className="clean-sheet-item-slot">{slot}</span>}
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
  const equipped = character?.equipped || {};
  const equipment = character?.equipment || [];
  const inventory = character?.inventory || [];
  const allCarriedItems = [...equipment, ...inventory];

  const saveEquipped = async (nextEquipped, slotLabel) => {
    setSavingSlot(slotLabel);
    try {
      await axios.patch(`${API}/characters/${character.id}`, { equipped: nextEquipped });
      onCharacterUpdate?.({ equipped: nextEquipped });
      toast.success('Equipment updated');
    } catch (error) {
      toast.error('Could not update equipment');
    } finally {
      setSavingSlot('');
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

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Equipped</h2>
        <div className="clean-sheet-item-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getEquippedItem(equipped, slot);
            return item ? (
              <ItemCard
                key={slot}
                slot={label}
                item={item}
                actions={<button type="button" onClick={() => clearSlot(slot)} disabled={savingSlot === slot}>Clear Slot</button>}
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

      <section className="clean-sheet-panel">
        <h2>Currency</h2>
        <CurrencyBlock currency={character?.currency || {}} gold={character?.gold} />
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Carried Items</h2>
        {allCarriedItems.length > 0 ? (
          <div className="clean-sheet-item-grid">
            {allCarriedItems.map((item, index) => (
              <ItemCard
                key={getItemKey(item, index)}
                item={item}
                actions={EQUIP_SLOTS.map(([slot, label]) => (
                  <button key={slot} type="button" onClick={() => equipItem(slot, item)} disabled={savingSlot === slot}>
                    Set {label}
                  </button>
                ))}
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

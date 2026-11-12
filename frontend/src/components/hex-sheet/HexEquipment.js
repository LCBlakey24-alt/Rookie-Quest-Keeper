import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getEquippedWeaponAttack } from '@/components/clean-sheet/cleanCombatTabUtils';
import { deriveArmorClass } from '@/data/characterCombatDerivations';
import {
  buildCarriedInventoryView,
  buildCurrencyUpdate,
  clearInventorySlotState,
  equipInventoryState,
  inventoryItemIdentity,
  normaliseCurrencyState,
  syncInventoryWithEquipment,
  updateInventoryItemState,
} from '@/data/characterInventoryState';
import { rollDiceNotation } from '@/data/diceRoller';
import {
  ATTUNEMENT_LIMIT,
  BODY_SLOTS,
  carriedWeight,
  carryingCapacity,
  isAttuned,
  isTwoHanded,
  itemQuantity,
  itemWeight,
  offHandBlocked,
  requiresAttunement,
  slotsForItem,
  slotsToClear,
} from '@/data/equipmentLoadout';

// Short labels so five coins fit across a phone; the input names are in full.
const COINS = [['pp', 'Plat'], ['gp', 'Gold'], ['ep', 'Elec'], ['sp', 'Silver'], ['cp', 'Copper']];
const COIN_NAMES = { pp: 'Platinum', gp: 'Gold', ep: 'Electrum', sp: 'Silver', cp: 'Copper' };
const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
const nameOf = (item) => (typeof item === 'string' ? item : item?.name || 'Item');
const signed = (value) => (value >= 0 ? `+${value}` : `${value}`);
const slotLabel = (id) => BODY_SLOTS.find((slot) => slot.id === id)?.label || id;

/**
 * Equipment on the hexagonal sheet: what the character wears and holds,
 * laid out like a body, then money, carrying weight and the backpack.
 *
 * Every change goes through the classic inventory's own state helpers and
 * the sheet's save queue (`onSave`), and recalculates Armour Class, so a
 * character edited here looks the same on the classic sheet.
 */
export default function HexEquipment({ character, proficiencyBonus, onRoll, onPresent, onSave }) {
  const [selected, setSelected] = useState(null);
  const [choosing, setChoosing] = useState(false);
  const [coins, setCoins] = useState(null);
  const [busy, setBusy] = useState(false);

  const equipped = useMemo(() => character?.equipped || {}, [character]);
  const inventory = useMemo(() => (Array.isArray(character?.inventory) ? character.inventory : []), [character]);
  const carried = useMemo(() => buildCarriedInventoryView({
    inventory,
    equipment: character?.equipment,
    starting: character?.starting_equipment,
    equipped,
  }), [inventory, character, equipped]);
  // The carried view marks each worn copy, so a spare same-named item (a
  // second Dagger) stays in the backpack.
  const backpack = carried.filter((item) => !(item && typeof item === 'object' && (item.equipped || item.is_equipped)));
  const attunedCount = carried.filter(isAttuned).length;
  const currency = normaliseCurrencyState(character || {});
  const weight = carriedWeight(carried, currency);
  const capacity = carryingCapacity(character);
  const overCapacity = weight > capacity;

  const save = async (state, message) => {
    if (busy) return false;
    setBusy(true);
    const nextInventory = syncInventoryWithEquipment(state.inventory, state.equipped);
    const armorClass = deriveArmorClass({ ...character, inventory: nextInventory, equipped: state.equipped }, { ignoreStoredAc: true });
    const ok = await onSave({ inventory: nextInventory, equipped: state.equipped, armor_class: armorClass }, { success: message, error: 'Could not update equipment' });
    setBusy(false);
    return ok;
  };

  const equip = async (item, slot) => {
    let state = { inventory, equipped };
    slotsToClear(equipped, item, slot).forEach((clear) => {
      state = clearInventorySlotState({ ...state, slot: clear });
    });
    state = equipInventoryState({ ...state, item, slot });
    const ok = await save(state, `${nameOf(item)} equipped`);
    if (ok) setChoosing(false);
  };

  const unequip = async (slot) => {
    const ok = await save(clearInventorySlotState({ inventory, equipped, slot }), `${slotLabel(slot)} emptied`);
    if (ok) setChoosing(false);
  };

  const updateItem = async (item, updates, message) => {
    const state = updateInventoryItemState({ inventory, equipped, item, updates });
    if (!state.updated) {
      toast.info('Starting and GM-granted items can only be changed from the classic inventory.');
      return;
    }
    await save(state, message);
  };

  const toggleAttunement = (item) => {
    if (!isAttuned(item) && attunedCount >= ATTUNEMENT_LIMIT) {
      toast.error(`Already attuned to ${ATTUNEMENT_LIMIT} items. End an attunement first.`);
      return;
    }
    const next = !isAttuned(item);
    updateItem(item, { attuned: next, is_attuned: next }, next ? `Attuned to ${nameOf(item)}` : `Attunement to ${nameOf(item)} ended`);
  };

  const useCharge = (item, delta) => {
    const max = Number(item.charges_max);
    const now = Math.max(0, Math.min(max, Number(item.charges ?? max) + delta));
    updateItem(item, { charges: now }, delta < 0 ? `${nameOf(item)}: ${now} of ${max} charges left` : `${nameOf(item)}: ${now} of ${max} charges`);
  };

  const weaponFor = (slot) => {
    if (slot !== 'mainHand' && slot !== 'offHand') return null;
    const strengthMod = mod(character?.strength);
    const dexterityMod = mod(character?.dexterity);
    return getEquippedWeaponAttack(character, slot, strengthMod, dexterityMod, Math.max(strengthMod, dexterityMod), proficiencyBonus);
  };

  const rollDamage = (attack) => {
    const { count, sides, modifier = 0, label } = attack.damage || {};
    if (!count || !sides || sides < 2) {
      toast.info(`${attack.title}: ${attack.damageText}`);
      return;
    }
    const result = rollDiceNotation(`${count}d${sides}${modifier ? signed(modifier) : ''}`);
    if (!result.valid) return;
    onPresent({ label: label || `${attack.title} Damage`, rolls: result.rolls, modifier: result.modifier, total: result.total, sides });
  };

  const saveCoins = async () => {
    let working = { ...character };
    COINS.forEach(([coin]) => {
      working = { ...working, ...buildCurrencyUpdate(working, coin, coins[coin]) };
    });
    setBusy(true);
    const ok = await onSave({ currency: working.currency, gold: working.gold }, { success: 'Money updated', error: 'Could not update money' });
    setBusy(false);
    if (ok) setCoins(null);
  };

  const item = selected ? equipped[selected] : null;
  const attack = item ? weaponFor(selected) : null;
  const fitting = selected ? backpack.filter((candidate) => slotsForItem(candidate).includes(selected)) : [];
  const blocked = offHandBlocked(equipped);

  return (
    <div className="hex-equip" data-testid="hex-equipment">
      <section className="hex-equip__body" aria-label="Worn and held">
        {BODY_SLOTS.map((slot) => {
          const worn = equipped[slot.id];
          const lockedByTwoHander = slot.id === 'offHand' && blocked;
          return (
            <button
              key={slot.id}
              type="button"
              className={`hex-equip__slot hex-equip__slot--${slot.id}${worn ? ' is-filled' : ''}${worn && isAttuned(worn) ? ' is-attuned' : ''}${selected === slot.id ? ' is-selected' : ''}`}
              onClick={() => { setSelected(selected === slot.id ? null : slot.id); setChoosing(false); }}
              aria-pressed={selected === slot.id}
              aria-label={`${slot.label}: ${worn ? nameOf(worn) : lockedByTwoHander ? 'two-handed weapon' : 'empty'}${worn && isAttuned(worn) ? ', attuned' : ''}`}
              data-testid={`hex-slot-${slot.id}`}
            >
              <span className="hex-equip__slot-face">
                <small>{slot.label}</small>
                <strong>{worn ? nameOf(worn) : lockedByTwoHander ? 'Both hands' : '—'}</strong>
              </span>
            </button>
          );
        })}
      </section>

      {selected && (
        <section className="hex-equip__panel" aria-label={`${slotLabel(selected)} slot`} data-testid="hex-slot-panel">
          <header>
            <small>{slotLabel(selected)}</small>
            <h3>{item ? nameOf(item) : 'Nothing here'}</h3>
            {item && (
              <p>
                {[item.type, attack?.details, item.ac_bonus ? `AC ${signed(Number(item.ac_bonus))}` : null, itemWeight(item) ? `${itemWeight(item)} lb` : null, isTwoHanded(item) ? 'Two-handed' : null]
                  .filter(Boolean).join(' · ')}
              </p>
            )}
            {item && requiresAttunement(item) && (
              <p className={isAttuned(item) ? 'hex-equip__attuned' : 'hex-equip__unattuned'}>
                {isAttuned(item) ? 'Attuned' : 'Needs attunement to work'} · {attunedCount} of {ATTUNEMENT_LIMIT} attuned
              </p>
            )}
          </header>

          <div className="hex-equip__actions">
            {attack && (
              <>
                <button type="button" className="is-primary" onClick={() => onRoll(attack.attackLabel, attack.attackMod)} data-testid="hex-slot-attack">Attack {signed(attack.attackMod)}</button>
                <button type="button" onClick={() => rollDamage(attack)} data-testid="hex-slot-damage">Damage {attack.damageText}</button>
              </>
            )}
            {item && Number(item.charges_max) > 0 && (
              <>
                <button type="button" onClick={() => useCharge(item, -1)} disabled={busy || Number(item.charges ?? item.charges_max) <= 0} data-testid="hex-slot-charge">
                  Use charge ({Number(item.charges ?? item.charges_max)}/{Number(item.charges_max)})
                </button>
                <button type="button" onClick={() => useCharge(item, 1)} disabled={busy || Number(item.charges ?? item.charges_max) >= Number(item.charges_max)}>Regain charge</button>
              </>
            )}
            {item && requiresAttunement(item) && (
              <button type="button" onClick={() => toggleAttunement(item)} disabled={busy} data-testid="hex-slot-attune">{isAttuned(item) ? 'End attunement' : 'Attune'}</button>
            )}
            <button type="button" onClick={() => setChoosing((open) => !open)} disabled={busy} aria-expanded={choosing} data-testid="hex-slot-change">{item ? 'Change' : 'Equip something'}</button>
            {item && <button type="button" onClick={() => unequip(selected)} disabled={busy} data-testid="hex-slot-unequip">Unequip</button>}
          </div>

          {choosing && (
            <ul className="hex-equip__choices" aria-label={`Items that fit the ${slotLabel(selected)} slot`}>
              {fitting.length ? fitting.map((candidate) => (
                <li key={inventoryItemIdentity(candidate) || nameOf(candidate)}>
                  <button type="button" onClick={() => equip(candidate, selected)} disabled={busy} data-testid={`hex-equip-choice-${nameOf(candidate)}`}>
                    <strong>{nameOf(candidate)}</strong>
                    {isTwoHanded(candidate) && <span>Two-handed: frees the off hand</span>}
                  </button>
                </li>
              )) : <li className="hex-equip__empty">Nothing in the backpack fits here.</li>}
            </ul>
          )}
        </section>
      )}

      <section className="hex-equip__card" aria-label="Money">
        <header>
          <h3>Money</h3>
          {coins
            ? <button type="button" onClick={saveCoins} disabled={busy} data-testid="hex-money-save">Save</button>
            : <button type="button" onClick={() => setCoins(currency)} data-testid="hex-money-edit">Edit</button>}
        </header>
        <div className="hex-equip__coins">
          {COINS.map(([coin, label]) => (
            <label key={coin} className={`hex-equip__coin hex-equip__coin--${coin}`}>
              <span title={COIN_NAMES[coin]}>{label}</span>
              {coins
                ? <input type="number" min="0" inputMode="numeric" value={coins[coin]} aria-label={`${COIN_NAMES[coin]} pieces`} onChange={(event) => setCoins((prev) => ({ ...prev, [coin]: event.target.value }))} />
                : <strong data-testid={`hex-coin-${coin}`}>{Number(currency[coin]) || 0}</strong>}
            </label>
          ))}
        </div>
      </section>

      <section className={`hex-equip__card${overCapacity ? ' is-over' : ''}`} aria-label="Carrying" data-testid="hex-weight">
        <header>
          <h3>Carrying</h3>
          <span>{weight} / {capacity} lb</span>
        </header>
        <div className="hex-equip__bar" role="meter" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={weight} aria-label="Weight carried">
          <i style={{ width: `${Math.min(100, (weight / capacity) * 100)}%` }} />
        </div>
        <p>{overCapacity ? 'Over your carrying capacity. Drop something or ask the GM how it slows you.' : `Capacity is Strength × 15. Coins count at 50 to the pound.`}</p>
      </section>

      <section className="hex-equip__card" aria-label="Backpack">
        <header>
          <h3>Backpack</h3>
          <span>{backpack.length} item{backpack.length === 1 ? '' : 's'} · attuned {attunedCount}/{ATTUNEMENT_LIMIT}</span>
        </header>
        <ul className="hex-equip__pack">
          {backpack.length ? backpack.map((packed, index) => {
            const slots = slotsForItem(packed);
            const free = slots.find((slot) => !equipped[slot]) || slots[0];
            return (
              <li key={`${inventoryItemIdentity(packed)}-${index}`} className={isAttuned(packed) ? 'is-attuned' : ''}>
                <div>
                  <strong>{nameOf(packed)}{itemQuantity(packed) > 1 ? ` ×${itemQuantity(packed)}` : ''}</strong>
                  <span>{[packed.type, itemWeight(packed) ? `${Math.round(itemWeight(packed) * itemQuantity(packed) * 10) / 10} lb` : null, requiresAttunement(packed) ? (isAttuned(packed) ? 'Attuned' : 'Attunement') : null].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="hex-equip__pack-actions">
                  {requiresAttunement(packed) && <button type="button" onClick={() => toggleAttunement(packed)} disabled={busy}>{isAttuned(packed) ? 'End' : 'Attune'}</button>}
                  {free && <button type="button" onClick={() => equip(packed, free)} disabled={busy} data-testid={`hex-pack-equip-${nameOf(packed)}`}>Equip · {slotLabel(free)}</button>}
                </div>
              </li>
            );
          }) : <li className="hex-equip__empty">Nothing in the backpack.</li>}
        </ul>
      </section>
    </div>
  );
}

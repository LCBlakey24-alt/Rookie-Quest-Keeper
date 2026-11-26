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
  removeInventoryItemState,
  syncInventoryWithEquipment,
  updateInventoryItemState,
} from '@/data/characterInventoryState';
import { rollDiceNotation } from '@/data/diceRoller';
import usePlayerRulesOptions from '@/hooks/usePlayerRulesOptions';
import { activeItemDefences, homebrewItemSummary, inventoryItemFromHomebrew } from '@/data/homebrewItemModel';
import { customInventoryItem, hasSheetItem, inventoryItemFromCatalog, searchSheetItems } from '@/data/sheetItemCatalog';
import GlowPolygon, { GlowFilter, useSvgId } from './GlowPolygon';
import {
  ATTUNEMENT_LIMIT,
  BODY_SLOTS,
  carriedWeight,
  carryingCapacity,
  isAttuned,
  isTwoHanded,
  itemQuantity,
  LEGACY_WORN_SLOTS,
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
const LEGACY_LABELS = { neck: 'Neck', shoulders: 'Cloak', gauntlets: 'Hands', wrists: 'Bracers', waist: 'Belt', ring1: 'Ring', ring2: 'Ring' };
const slotLabel = (id) => BODY_SLOTS.find((slot) => slot.id === id)?.label || LEGACY_LABELS[id] || id;

function SlotGlow() {
  const filterId = useSvgId('hex-equipment-glow');
  return (
    <svg className="hex-equip__slot-glow" viewBox="0 0 100 115.47" preserveAspectRatio="none" aria-hidden="true">
      <GlowFilter id={filterId} />
      <GlowPolygon points="50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675" filterId={filterId} />
    </svg>
  );
}

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
  const [addingHomebrew, setAddingHomebrew] = useState(false);
  const [homebrewSearch, setHomebrewSearch] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  // Homebrew items: the player's own, plus the GM's shared with this campaign.
  // Loaded only when the picker opens.
  const homebrew = usePlayerRulesOptions({ campaignId: character?.campaign_id || undefined, enabled: addingHomebrew });

  const equipped = useMemo(() => character?.equipped || {}, [character]);
  const inventory = useMemo(() => (Array.isArray(character?.inventory) ? character.inventory : []), [character]);
  const carried = useMemo(() => buildCarriedInventoryView({
    inventory,
    equipment: character?.equipment,
    starting: character?.starting_equipment,
    equipped,
  }), [inventory, character, equipped]);
  // The carried view marks each worn copy, so a spare same-named item (a
  // second Dagger) stays in the list. Only the five slots are shown as
  // hexagons; anything an older save still has in a ring, cloak or other
  // slot is listed with the gear (marked as worn) so it is never hidden.
  const slotKeys = new Set(BODY_SLOTS.map((slot) => equipped[slot.id]).filter(Boolean).map(inventoryItemIdentity));
  const isWornFlag = (item) => Boolean(item && typeof item === 'object' && (item.equipped || item.is_equipped));
  const backpack = carried.filter((item) => !isWornFlag(item) || !slotKeys.has(inventoryItemIdentity(item)));
  const legacySlotOf = (item) => LEGACY_WORN_SLOTS.find((slot) => equipped[slot] && inventoryItemIdentity(equipped[slot]) === inventoryItemIdentity(item));
  const attunedCount = carried.filter(isAttuned).length;
  const currency = normaliseCurrencyState(character || {});
  const weight = carriedWeight(carried, currency);
  const capacity = carryingCapacity(character);
  const overCapacity = weight > capacity;

  const save = async (state, message) => {
    if (busy) return false;
    setBusy(true);
    const nextInventory = syncInventoryWithEquipment(state.inventory, state.equipped);
    // A manually set AC is the player's own number: equipment changes leave
    // it alone. Otherwise the AC follows the equipment.
    const keepsOwnAc = character?.armor_class_manual === true || character?.armor_class_source === 'manual';
    const updates = { inventory: nextInventory, equipped: state.equipped };
    if (!keepsOwnAc) updates.armor_class = deriveArmorClass({ ...character, inventory: nextInventory, equipped: state.equipped }, { ignoreStoredAc: true });
    const ok = await onSave(updates, { success: message, error: 'Could not update equipment' });
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

  // Rolls the weapon's damage plus any extra damage (e.g. +1d6 fire) as one result.
  const rollDamage = (attack, damage = attack.damage) => {
    const { count, sides, modifier = 0, label } = damage || {};
    if (!count || !sides || sides < 2) {
      toast.info(`${attack.title}: ${attack.damageText}`);
      return;
    }
    const result = rollDiceNotation(`${count}d${sides}${modifier ? signed(modifier) : ''}`);
    if (!result.valid) return;
    const extras = (attack.extraDamage || []).map((row) => ({ row, roll: rollDiceNotation(row.dice) })).filter(({ roll }) => roll.valid);
    const extraText = extras.map(({ row, roll }) => ` + ${roll.total} ${row.type}`).join('');
    onPresent({
      label: `${label || `${attack.title} Damage`}${extras.length ? ` (${result.total} ${damage.damageType || ''}${extraText})` : ''}`,
      rolls: [...result.rolls, ...extras.flatMap(({ roll }) => roll.rolls)],
      modifier: result.modifier,
      total: result.total + extras.reduce((sum, { roll }) => sum + roll.total, 0),
      sides,
    });
  };

  const addHomebrewItem = async (doc) => {
    const added = inventoryItemFromHomebrew(doc);
    const ok = await save({ inventory: [...inventory, added], equipped }, `${nameOf(added)} added to your equipment`);
    if (ok) { setAddingHomebrew(false); setHomebrewSearch(''); }
  };
  // Ordinary items picked up in play: an SRD weapon, armour or piece of
  // gear from the catalogue, or anything else by name.
  const addCarriedItem = async (item) => {
    if (!item) return;
    const ok = await save({ inventory: [...inventory, item], equipped }, `${nameOf(item)} added to your equipment`);
    if (ok) { setAddingItem(false); setItemSearch(''); }
  };
  // Only what the player added here can be removed here; starting and
  // GM-granted items stay under the classic inventory's rules.
  const addedHere = (item) => Boolean(item?.id) && ['srd_5_1', 'user_original'].includes(item?.source);
  const removeCarriedItem = async (item) => {
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${nameOf(item)} from your equipment?`)) return;
    const state = removeInventoryItemState({ inventory, equipped, item });
    if (!state.removed) return;
    await save({ inventory: state.inventory, equipped: state.equipped }, `${nameOf(item)} removed`);
  };
  const catalogMatches = addingItem ? searchSheetItems(itemSearch, 24) : [];
  const customName = itemSearch.replace(/\s+/g, ' ').trim();

  const homebrewItems = (Array.isArray(homebrew.options?.items) ? homebrew.options.items : [])
    .filter((doc) => !homebrewSearch.trim() || String(doc.name || '').toLowerCase().includes(homebrewSearch.trim().toLowerCase()));
  const defences = activeItemDefences(character || {});

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
              <SlotGlow />
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
                {attack.versatileDamage && selected === 'mainHand' && !equipped.offHand && (
                  <button type="button" onClick={() => rollDamage(attack, attack.versatileDamage)} data-testid="hex-slot-damage-two-hands">
                    Two hands {attack.versatileDamage.count}d{attack.versatileDamage.sides}{attack.versatileDamage.modifier ? signed(attack.versatileDamage.modifier) : ''}
                  </button>
                )}
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
              )) : <li className="hex-equip__empty">Nothing in your equipment fits here.</li>}
            </ul>
          )}
        </section>
      )}

      {defences.any && (
        <section className="hex-equip__card hex-equip__defences" aria-label="Defences from items" data-testid="hex-defences">
          <header><h3>Defences</h3><span>from your items</span></header>
          <ul>
            {defences.resistances.length > 0 && <li><strong>Resistant</strong> {defences.resistances.join(', ')} <small>half damage</small></li>}
            {defences.immunities.length > 0 && <li><strong>Immune</strong> {defences.immunities.join(', ')} <small>no damage</small></li>}
            {defences.vulnerabilities.length > 0 && <li><strong>Vulnerable</strong> {defences.vulnerabilities.join(', ')} <small>double damage</small></li>}
            {defences.conditionImmunities.length > 0 && <li><strong>Can&apos;t be</strong> {defences.conditionImmunities.join(', ')}</li>}
            {defences.saveBonus !== 0 && <li><strong>Saving throws</strong> {signed(defences.saveBonus)} to all</li>}
          </ul>
          <p>From {defences.sources.join(', ')}.</p>
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

      <section className="hex-equip__card" aria-label="Equipment">
        <header>
          <h3>Equipment</h3>
          <span>{backpack.length} item{backpack.length === 1 ? '' : 's'} · attuned {attunedCount}/{ATTUNEMENT_LIMIT}</span>
          <button type="button" onClick={() => { setAddingItem((open) => !open); setAddingHomebrew(false); }} aria-expanded={addingItem} disabled={busy} data-testid="hex-add-item">
            {addingItem ? 'Close' : 'Add item'}
          </button>
          <button type="button" onClick={() => { setAddingHomebrew((open) => !open); setAddingItem(false); }} aria-expanded={addingHomebrew} disabled={busy} data-testid="hex-add-homebrew">
            {addingHomebrew ? 'Close' : 'Add homebrew item'}
          </button>
        </header>
        {addingItem && (
          <div className="hex-equip__homebrew" data-testid="hex-item-picker">
            <input type="search" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search weapons, armour and gear" aria-label="Search items to add" autoFocus />
            <ul>
              {catalogMatches.map((entry) => (
                <li key={`${entry.kind}-${entry.name}`}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{[entry.kind, entry.summary, entry.weight ? `${entry.weight} lb` : ''].filter(Boolean).join(' · ')}</span>
                  </div>
                  <button type="button" onClick={() => addCarriedItem(inventoryItemFromCatalog(entry))} disabled={busy} data-testid={`hex-item-add-${entry.name}`}>Add</button>
                </li>
              ))}
              {customName && !hasSheetItem(customName) && (
                <li>
                  <div>
                    <strong>{customName}</strong>
                    <span>Your own item, added by name</span>
                  </div>
                  <button type="button" onClick={() => addCarriedItem(customInventoryItem(customName))} disabled={busy} data-testid="hex-item-add-custom">Add</button>
                </li>
              )}
            </ul>
            {!customName && <p>Type a name to add something that is not listed.</p>}
          </div>
        )}
        {addingHomebrew && (
          <div className="hex-equip__homebrew" data-testid="hex-homebrew-picker">
            <input type="search" value={homebrewSearch} onChange={(event) => setHomebrewSearch(event.target.value)} placeholder="Search your homebrew items" aria-label="Search homebrew items" />
            {homebrew.loading ? <p>Loading your homebrew…</p>
              : homebrew.error ? <p>Could not load homebrew items. <button type="button" onClick={homebrew.refresh}>Try again</button></p>
                : homebrewItems.length === 0 ? <p>No homebrew items yet. Make one in the Homebrew Workshop under Items &amp; Equipment{character?.campaign_id ? ', or ask your GM to share one with this campaign' : ''}.</p>
                  : (
                    <ul>
                      {homebrewItems.map((doc) => (
                        <li key={doc.id}>
                          <div>
                            <strong>{doc.name}</strong>
                            <span>{[doc.is_campaign_content ? 'From your GM' : 'Yours', homebrewItemSummary(doc)].filter(Boolean).join(' · ')}</span>
                          </div>
                          <button type="button" onClick={() => addHomebrewItem(doc)} disabled={busy} data-testid={`hex-homebrew-add-${doc.name}`}>Add</button>
                        </li>
                      ))}
                    </ul>
                  )}
          </div>
        )}
        <ul className="hex-equip__pack">
          {backpack.length ? backpack.map((packed, index) => {
            const slots = slotsForItem(packed);
            const free = slots.find((slot) => !equipped[slot]) || slots[0];
            const oldSlot = isWornFlag(packed) ? legacySlotOf(packed) : null;
            return (
              <li key={`${inventoryItemIdentity(packed)}-${index}`} className={isAttuned(packed) ? 'is-attuned' : ''}>
                <div>
                  <strong>{nameOf(packed)}{itemQuantity(packed) > 1 ? ` ×${itemQuantity(packed)}` : ''}</strong>
                  <span>{[packed.type, oldSlot ? `Worn · ${slotLabel(oldSlot)}` : null, itemWeight(packed) ? `${Math.round(itemWeight(packed) * itemQuantity(packed) * 10) / 10} lb` : null, requiresAttunement(packed) ? (isAttuned(packed) ? 'Attuned' : 'Attunement') : null].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="hex-equip__pack-actions">
                  {requiresAttunement(packed) && <button type="button" onClick={() => toggleAttunement(packed)} disabled={busy}>{isAttuned(packed) ? 'End' : 'Attune'}</button>}
                  {packed.homebrew_kind === 'wearable' && !requiresAttunement(packed) && !slots.length && (
                    <button type="button" onClick={() => updateItem(packed, { worn: !packed.worn }, packed.worn ? `${nameOf(packed)} taken off` : `Wearing ${nameOf(packed)}`)} disabled={busy} aria-pressed={Boolean(packed.worn)}>{packed.worn ? 'Take off' : 'Wear'}</button>
                  )}
                  {free && !oldSlot && <button type="button" onClick={() => equip(packed, free)} disabled={busy} data-testid={`hex-pack-equip-${nameOf(packed)}`}>Equip · {slotLabel(free)}</button>}
                  {addedHere(packed) && <button type="button" onClick={() => removeCarriedItem(packed)} disabled={busy} aria-label={`Remove ${nameOf(packed)}`} data-testid={`hex-pack-remove-${nameOf(packed)}`}>Remove</button>}
                </div>
              </li>
            );
          }) : <li className="hex-equip__empty">Nothing else carried.</li>}
        </ul>
      </section>
    </div>
  );
}

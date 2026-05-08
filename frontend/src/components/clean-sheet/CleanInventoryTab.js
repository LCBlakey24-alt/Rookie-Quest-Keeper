import React from 'react';

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

function getEquippedEntries(equipped = {}) {
  return [
    ['Main Hand', equipped.mainHand || equipped.main_hand || equipped.weapon],
    ['Off Hand', equipped.offHand || equipped.off_hand],
    ['Armour', equipped.armor || equipped.armour],
    ['Shield', equipped.shield],
  ].filter(([, item]) => item);
}

function ItemCard({ item, slot }) {
  const quantity = getItemQuantity(item);
  return (
    <div className="clean-sheet-item-card">
      {slot && <span className="clean-sheet-item-slot">{slot}</span>}
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {quantity !== null && <em>Qty {quantity}</em>}
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

export default function CleanInventoryTab({ character }) {
  const equippedEntries = getEquippedEntries(character?.equipped || {});
  const equipment = character?.equipment || [];
  const inventory = character?.inventory || [];
  const allCarriedItems = [...equipment, ...inventory];

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel">
        <h2>Equipped</h2>
        {equippedEntries.length > 0 ? (
          <div className="clean-sheet-item-grid">
            {equippedEntries.map(([slot, item]) => <ItemCard key={slot} slot={slot} item={item} />)}
          </div>
        ) : (
          <p className="clean-sheet-muted">No equipped items found yet.</p>
        )}
      </section>

      <section className="clean-sheet-panel">
        <h2>Currency</h2>
        <CurrencyBlock currency={character?.currency || {}} gold={character?.gold} />
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Carried Items</h2>
        {allCarriedItems.length > 0 ? (
          <div className="clean-sheet-item-grid">
            {allCarriedItems.map((item, index) => <ItemCard key={`${getItemName(item)}-${index}`} item={item} />)}
          </div>
        ) : (
          <p className="clean-sheet-muted">No carried items found yet.</p>
        )}
      </section>
    </div>
  );
}

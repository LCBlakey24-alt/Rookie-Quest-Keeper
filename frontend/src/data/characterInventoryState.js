const normaliseKey = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export const INVENTORY_SLOT_ALIASES = {
  mainHand: ['mainHand', 'main_hand', 'weapon'],
  offHand: ['offHand', 'off_hand', 'shield'],
  armor: ['armor', 'armour'],
  gauntlets: ['gauntlets', 'gloves'],
  boots: ['boots'],
};

function itemName(item) {
  if (typeof item === 'string') return item;
  return item?.name || item?.item_name || item?.label || item?.title || '';
}

function stableItemId(item = {}) {
  if (!item || typeof item === 'string') return '';
  return item.id || item.item_id || item.itemId || item.uuid || item.instance_id || item.instanceId || '';
}

export function inventoryItemIdentity(item = {}) {
  if (!item) return '';
  if (typeof item === 'string') return `name:${normaliseKey(item)}`;
  const id = stableItemId(item);
  if (id) return `id:${String(id)}`;
  const name = normaliseKey(itemName(item));
  return name ? `name:${name}` : '';
}

export function sameInventoryItem(left, right) {
  const leftId = inventoryItemIdentity(left);
  const rightId = inventoryItemIdentity(right);
  return Boolean(leftId && rightId && leftId === rightId);
}

export function canonicalInventorySlot(slot = '') {
  const key = normaliseKey(slot);
  if (['mainhand', 'weapon'].includes(key)) return 'mainHand';
  if (['offhand', 'shield'].includes(key)) return 'offHand';
  if (['armor', 'armour'].includes(key)) return 'armor';
  if (['gauntlets', 'gloves', 'bracers'].includes(key)) return 'gauntlets';
  if (['boots', 'shoes', 'sandals'].includes(key)) return 'boots';
  return slot || '';
}

export function getCanonicalEquippedItem(equipped = {}, slot = '') {
  const canonical = canonicalInventorySlot(slot);
  const aliases = INVENTORY_SLOT_ALIASES[canonical] || [canonical];
  return aliases.map((key) => equipped?.[key]).find(Boolean) || null;
}

export function setCanonicalInventorySlot(equipped = {}, slot = '', item = null) {
  const canonical = canonicalInventorySlot(slot);
  if (!canonical) return { ...(equipped || {}) };
  const next = { ...(equipped || {}) };
  const aliases = INVENTORY_SLOT_ALIASES[canonical] || [canonical];
  aliases.forEach((key) => delete next[key]);
  if (item) {
    next[canonical] = {
      ...(typeof item === 'string' ? { name: item } : item),
      equip_slot: canonical,
      equipped_slot: canonical,
      equipped: true,
      is_equipped: true,
    };
  }
  return next;
}

function equippedAssignments(equipped = {}) {
  return Object.keys(INVENTORY_SLOT_ALIASES).flatMap((slot) => {
    const item = getCanonicalEquippedItem(equipped, slot);
    return item ? [{ slot, item, identity: inventoryItemIdentity(item) }] : [];
  });
}

function clearEquippedFlags(raw) {
  if (!raw || typeof raw === 'string') return raw;
  if (raw?.equipped || raw?.is_equipped || raw?.equip_slot || raw?.equipped_slot) {
    const next = { ...raw, equipped: false, is_equipped: false };
    delete next.equip_slot;
    delete next.equipped_slot;
    return next;
  }
  return raw;
}

export function syncInventoryWithEquipment(inventory = [], equipped = {}) {
  const assignments = equippedAssignments(equipped);
  const usedAssignments = new Set();

  return toArray(inventory).map((raw) => {
    if (typeof raw === 'string') return raw;
    const identity = inventoryItemIdentity(raw);
    const assignmentIndex = assignments.findIndex((entry, index) => (
      !usedAssignments.has(index) && entry.identity && entry.identity === identity
    ));
    if (assignmentIndex >= 0) {
      usedAssignments.add(assignmentIndex);
      const assignment = assignments[assignmentIndex];
      return {
        ...raw,
        equipped: true,
        is_equipped: true,
        equip_slot: assignment.slot,
        equipped_slot: assignment.slot,
      };
    }
    return clearEquippedFlags(raw);
  });
}

export function equipInventoryState({ inventory = [], equipped = {}, item, slot = '' } = {}) {
  const canonical = canonicalInventorySlot(slot || item?.equip_slot || item?.equipped_slot);
  if (!canonical || !item) return { inventory: toArray(inventory), equipped: { ...(equipped || {}) } };
  const nextEquipped = setCanonicalInventorySlot(equipped, canonical, item);
  return {
    equipped: nextEquipped,
    inventory: syncInventoryWithEquipment(inventory, nextEquipped),
  };
}

export function clearInventorySlotState({ inventory = [], equipped = {}, slot = '' } = {}) {
  const nextEquipped = setCanonicalInventorySlot(equipped, slot, null);
  return {
    equipped: nextEquipped,
    inventory: syncInventoryWithEquipment(inventory, nextEquipped),
  };
}

export function removeInventoryItemState({ inventory = [], equipped = {}, item } = {}) {
  const identity = inventoryItemIdentity(item);
  let removed = false;
  const nextInventory = toArray(inventory).filter((candidate) => {
    if (!removed && identity && inventoryItemIdentity(candidate) === identity) {
      removed = true;
      return false;
    }
    return true;
  });

  let nextEquipped = { ...(equipped || {}) };
  equippedAssignments(equipped).forEach(({ slot, identity: equippedIdentity }) => {
    if (identity && equippedIdentity === identity) nextEquipped = setCanonicalInventorySlot(nextEquipped, slot, null);
  });

  return {
    inventory: syncInventoryWithEquipment(nextInventory, nextEquipped),
    equipped: nextEquipped,
    removed,
  };
}

function nameIdentityCounts(items = []) {
  return toArray(items).reduce((counts, item) => {
    const identity = inventoryItemIdentity(item);
    if (!identity.startsWith('name:')) return counts;
    counts.set(identity, (counts.get(identity) || 0) + 1);
    return counts;
  }, new Map());
}

function mergeMaxCounts(target, source) {
  source.forEach((count, identity) => {
    target.set(identity, Math.max(target.get(identity) || 0, count));
  });
  return target;
}

export function buildCarriedInventoryView({ inventory = [], equipment = [], starting = [], equipped = {} } = {}) {
  const sources = [
    { source: 'inventory', items: toArray(inventory) },
    { source: 'equipment', items: toArray(equipment) },
    { source: 'starting', items: toArray(starting) },
  ];
  const assignments = equippedAssignments(equipped);

  // Older saves often copied the same name-only item into inventory, equipment,
  // and starting_equipment. Use the largest occurrence count from any one source
  // instead of summing all three, while still preserving legitimate duplicates
  // such as two legacy Daggers in the same backpack.
  const desiredNameCounts = new Map();
  sources.forEach(({ items }) => mergeMaxCounts(desiredNameCounts, nameIdentityCounts(items)));
  mergeMaxCounts(desiredNameCounts, nameIdentityCounts(assignments.map((entry) => entry.item)));

  const seenIds = new Set();
  const emittedNameCounts = new Map();
  const output = [];

  sources.forEach(({ source, items }) => {
    items.forEach((item) => {
      const identity = inventoryItemIdentity(item);
      if (!identity) {
        const base = typeof item === 'string' ? { name: item } : { ...item };
        output.push({ ...base, source: base.source || source });
        return;
      }

      if (identity.startsWith('id:')) {
        if (seenIds.has(identity)) return;
        seenIds.add(identity);
      } else {
        const emitted = emittedNameCounts.get(identity) || 0;
        const desired = desiredNameCounts.get(identity) || 1;
        if (emitted >= desired) return;
        emittedNameCounts.set(identity, emitted + 1);
      }

      const base = typeof item === 'string' ? { name: item } : { ...item };
      output.push({ ...base, source: base.source || source });
    });
  });

  const usedAssignments = new Set();
  const overlaid = output.map((item) => {
    const identity = inventoryItemIdentity(item);
    const assignmentIndex = assignments.findIndex((entry, index) => (
      !usedAssignments.has(index) && entry.identity && entry.identity === identity
    ));
    if (assignmentIndex < 0) return clearEquippedFlags(item);
    usedAssignments.add(assignmentIndex);
    const assignment = assignments[assignmentIndex];
    return {
      ...item,
      equipped: true,
      is_equipped: true,
      equip_slot: assignment.slot,
      equipped_slot: assignment.slot,
    };
  });

  assignments.forEach(({ slot, item }, index) => {
    if (usedAssignments.has(index)) return;
    const base = typeof item === 'string' ? { name: item } : { ...item };
    overlaid.push({
      ...base,
      source: base.source || 'equipped',
      equipped: true,
      is_equipped: true,
      equip_slot: slot,
      equipped_slot: slot,
    });
  });

  return overlaid;
}

export function normaliseCurrencyState(character = {}) {
  const currency = character.currency || {};
  return {
    cp: Math.max(0, Number(currency.copper ?? currency.cp ?? 0) || 0),
    sp: Math.max(0, Number(currency.silver ?? currency.sp ?? 0) || 0),
    ep: Math.max(0, Number(currency.electrum ?? currency.ep ?? 0) || 0),
    gp: Math.max(0, Number(currency.gold ?? currency.gp ?? character.gold ?? 0) || 0),
    pp: Math.max(0, Number(currency.platinum ?? currency.pp ?? 0) || 0),
  };
}

export function buildCurrencyUpdate(character = {}, coin = 'gp', value = 0) {
  const safeCoin = ['cp', 'sp', 'ep', 'gp', 'pp'].includes(coin) ? coin : 'gp';
  const next = { ...normaliseCurrencyState(character), [safeCoin]: Math.max(0, Math.floor(Number(value) || 0)) };
  return {
    currency: {
      cp: next.cp,
      sp: next.sp,
      ep: next.ep,
      gp: next.gp,
      pp: next.pp,
      copper: next.cp,
      silver: next.sp,
      electrum: next.ep,
      gold: next.gp,
      platinum: next.pp,
    },
    gold: next.gp,
  };
}

/**
 * The ordinary items a player can add to their sheet in play: the SRD 5.1
 * weapons, armour, shield and adventuring gear (data/srdEquipment.js), plus
 * anything else by name ("Strange brass key").
 *
 * Catalogue items are built with the same helper the creator's starting
 * equipment uses, so a dagger added here is a real weapon the Combat page
 * can attack with and a chain shirt changes Armour Class when worn. A custom
 * item is a named thing in the pack and nothing more: no statistics are
 * invented for it.
 */

import {
  ADVENTURING_GEAR, ALL_WEAPONS, HEAVY_ARMOR, LIGHT_ARMOR, MEDIUM_ARMOR, SHIELDS,
} from './srdEquipment';
import { itemFromEquipmentLabel } from './startingEquipmentItems';

const newItemId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`);

// "Crossbow, light" is how the SRD table lists it; the rules helpers know it as "Light Crossbow".
const ruleName = (name) => {
  const match = String(name).match(/^(.+),\s*(.+)$/);
  return match ? `${match[2].charAt(0).toUpperCase()}${match[2].slice(1)} ${match[1]}` : String(name);
};

const entry = (kind, summary) => (row) => ({
  name: ruleName(row.name),
  kind,
  summary: summary(row),
  weight: Number(row.weight) || 0,
});

/** Every catalogue item, weapons first, then armour, then gear. */
export const SHEET_ITEM_CATALOG = [
  ...ALL_WEAPONS.map(entry('Weapon', (row) => row.damage)),
  ...[...LIGHT_ARMOR, ...MEDIUM_ARMOR, ...HEAVY_ARMOR].map(entry('Armour', (row) => `AC ${row.ac}`)),
  ...SHIELDS.map(entry('Shield', (row) => `${row.ac} AC`)),
  ...ADVENTURING_GEAR.map(entry('Gear', () => '')),
];

/** Catalogue items matching a search, best matches first, at most `limit`. */
export function searchSheetItems(query = '', limit = 30) {
  const text = String(query).trim().toLowerCase();
  if (!text) return SHEET_ITEM_CATALOG.slice(0, limit);
  const starts = [];
  const contains = [];
  SHEET_ITEM_CATALOG.forEach((item) => {
    const name = item.name.toLowerCase();
    if (name.startsWith(text)) starts.push(item);
    else if (name.includes(text) || item.kind.toLowerCase() === text) contains.push(item);
  });
  return [...starts, ...contains].slice(0, limit);
}

/** Is there a catalogue item with exactly this name? */
export function hasSheetItem(name = '') {
  const text = String(name).trim().toLowerCase();
  return SHEET_ITEM_CATALOG.some((item) => item.name.toLowerCase() === text);
}

/** A catalogue entry as an inventory item, ready to equip or carry. */
export function inventoryItemFromCatalog(catalogItem) {
  const built = itemFromEquipmentLabel(catalogItem.name)[0] || { name: catalogItem.name, type: 'Item', item_type: 'item', quantity: 1 };
  return {
    ...built,
    id: newItemId(),
    weight: Number(built.weight) || catalogItem.weight || 0,
    equipped: false,
    source: 'srd_5_1',
  };
}

/** Something not in the catalogue, by name only. */
export function customInventoryItem(name = '') {
  const clean = String(name).replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!clean) return null;
  return { id: newItemId(), name: clean, type: 'Item', item_type: 'item', quantity: 1, description: '', equipped: false, source: 'user_original' };
}

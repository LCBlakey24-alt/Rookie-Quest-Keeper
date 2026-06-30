import { ALL_ARMOR, ALL_WEAPONS } from "../data/equipmentDatabase";
import { deriveArmorClass } from "../data/characterCombatDerivations";

export const EMPTY_CURRENCY = { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 };
export const EMPTY_EQUIPPED = { armor: null, shield: null, mainHand: null, offHand: null };

const arr = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export const equipmentNameKey = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const allEquipmentReferences = [...ALL_WEAPONS, ...ALL_ARMOR];

export function findEquipmentReference(name = "") {
  const key = equipmentNameKey(name);
  if (!key) return null;
  return (
    allEquipmentReferences.find((item) => equipmentNameKey(item.name) === key) ||
    allEquipmentReferences.find((item) => key.includes(equipmentNameKey(item.name)) || equipmentNameKey(item.name).includes(key))
  );
}

export function inferCreatorEquipSlot(item) {
  if (!item) return null;
  const explicitSlot = item.equipped_slot || item.equip_slot;
  if (explicitSlot === "main_hand") return "mainHand";
  if (explicitSlot === "off_hand") return "offHand";
  if (explicitSlot === "armour") return "armor";
  if (explicitSlot) return explicitSlot;
  const text = `${item.type || ""} ${item.item_type || ""} ${item.category || ""} ${item.name || item}`.toLowerCase();
  if (text.includes("shield")) return "shield";
  if (/\b(armor|armour|mail|plate|leather|hide|scale)\b/.test(text)) return "armor";
  if (item.damage_dice || item.damage || /\b(sword|bow|crossbow|axe|mace|staff|dagger|spear|lance|hammer|rapier|club|flail|halberd|pike|trident|whip|sling|dart|javelin)\b/.test(text)) return "mainHand";
  return null;
}

export function normaliseCreatorEquipmentItem(item, source = "starting") {
  const rawName = typeof item === "string" ? item : item?.name || item?.item_name || item?.label || "";
  const name = String(rawName || "").trim();
  const ref = findEquipmentReference(name);
  const isWeapon = Boolean(ref?.damage);
  const isShield = String(ref?.category || "").toLowerCase() === "shield" || /shield/i.test(name);
  const isArmor = !isShield && (Boolean(ref?.ac || ref?.acBonus) || /\b(armor|armour|mail|plate|leather|hide|scale)\b/i.test(name));
  const damageParts = String(ref?.damage || "").match(/(\d+d\d+|\d+)\s*([a-z]+)?/i);
  const type = item?.type || item?.item_type || (isShield ? "Shield" : isArmor ? "Armour" : isWeapon ? "Weapon" : "Item");
  const normalised = {
    ...(typeof item === "object" && item ? item : {}),
    name,
    type,
    item_type: item?.item_type || type,
    quantity: Number(item?.quantity ?? item?.qty ?? item?.count ?? 1) || 1,
    description: item?.description || item?.desc || (source === "starting" ? "Starting equipment" : ""),
    source,
    equipped: Boolean(item?.equipped || item?.is_equipped),
    is_equipped: Boolean(item?.equipped || item?.is_equipped),
    equip_slot: item?.equip_slot || item?.equipped_slot || "",
    equipped_slot: item?.equipped_slot || item?.equip_slot || "",
    ready_to_use: Boolean(item?.ready_to_use || item?.equipped || item?.is_equipped),
    damage_dice: item?.damage_dice || (damageParts && isWeapon ? damageParts[1] : ""),
    damage_type: item?.damage_type || ref?.damageType || (damageParts && isWeapon ? damageParts[2] || "" : ""),
    properties: item?.properties || (Array.isArray(ref?.properties) ? ref.properties.join(", ") : ref?.properties || ""),
    range: item?.range || ref?.range || "",
    ac_bonus: Number(item?.ac_bonus ?? (isShield ? 2 : 0)) || 0,
  };
  const slot = inferCreatorEquipSlot(normalised);
  if (slot) {
    normalised.equip_slot = normalised.equip_slot || slot;
    normalised.equipped_slot = normalised.equipped_slot || slot;
  }
  return normalised;
}

export function buildCanonicalEquipped(items = []) {
  const equipped = { ...EMPTY_EQUIPPED };
  arr(items).forEach((item) => {
    const slot = inferCreatorEquipSlot(item);
    const confident = slot === "armor" || slot === "shield" || item.type === "Weapon" || item.damage_dice;
    if (!slot || !confident || equipped[slot]) return;
    const equippedItem = { ...item, equip_slot: slot, equipped_slot: slot, equipped: true, is_equipped: true, ready_to_use: true };
    equipped[slot] = equippedItem;
    item.equipped = true;
    item.is_equipped = true;
    item.ready_to_use = true;
    item.equip_slot = slot;
    item.equipped_slot = slot;
  });
  return equipped;
}

export function buildCreatorEquipmentPayload(equipmentList = [], mode = "recommended") {
  const starting = arr(equipmentList).map((item) => String(typeof item === "string" ? item : item?.name || "").trim()).filter(Boolean);
  const currency = { ...EMPTY_CURRENCY };
  if (mode === "gold") currency.gold = 10;
  const objects = mode === "gold" ? [] : starting.map((item) => normaliseCreatorEquipmentItem(item, mode === "custom" ? "custom" : "starting"));
  const seen = new Set();
  const deduped = objects.filter((item) => {
    const key = equipmentNameKey(item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    equipment_choice: mode,
    starting_equipment: mode === "gold" ? ["Starting gold instead of equipment — confirm shopping with GM"] : starting,
    equipment: deduped,
    inventory: deduped,
    equipped: buildCanonicalEquipped(deduped),
    currency,
    gold: currency.gold,
  };
}

export function calculateCreatedCharacterArmorClass(characterBase, equipmentPayload) {
  return deriveArmorClass({ ...characterBase, equipped: equipmentPayload?.equipped || EMPTY_EQUIPPED }, { ignoreStoredAc: true });
}

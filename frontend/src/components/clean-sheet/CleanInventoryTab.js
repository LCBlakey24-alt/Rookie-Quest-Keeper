import React, { useMemo, useState } from "react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import {
  Backpack,
  Coins,
  Plus,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

import {
  deriveArmorClass,
  deriveWeaponAttack,
} from "@/data/characterCombatDerivations";
import { ALL_ARMOR, ALL_WEAPONS } from "@/data/equipmentDatabase";
import "./CleanSheetInventoryMobileOverrides.css";

const EQUIP_SLOTS = [
  ["mainHand", "Main Hand"],
  ["offHand", "Off Hand"],
  ["armor", "Armour"],
  ["gauntlets", "Gauntlets"],
  ["boots", "Boots"],
];

const SLOT_LABELS = {
  mainHand: "Main Hand",
  main_hand: "Main Hand",
  weapon: "Main Hand",
  offHand: "Off Hand",
  off_hand: "Off Hand",
  shield: "Off Hand",
  armor: "Armour",
  armour: "Armour",
  gauntlets: "Gauntlets",
  gloves: "Gauntlets",
  boots: "Boots",
};

const blankItem = {
  name: "",
  type: "Item",
  quantity: 1,
  description: "",
  favorite: false,
  attunement_required: false,
  attuned: false,
  attack_bonus: 0,
  ac_bonus: 0,
  damage_dice: "",
  damage_type: "",
  equip_slot: "",
  equipped: false,
  is_equipped: false,
};

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalizeKey = (value = "") => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

function getItemName(item) {
  if (!item) return "Unknown item";
  if (typeof item === "string") return item;
  return item.name || item.item_name || item.label || item.title || "Unknown item";
}

function getItemDetail(item) {
  if (!item || typeof item === "string") return "";
  return item.description || item.desc || item.type || item.category || item.rarity || "";
}

function getItemQuantity(item) {
  if (!item || typeof item === "string") return 1;
  return item.quantity ?? item.qty ?? item.count ?? 1;
}

function isFavorite(item) {
  if (!item || typeof item === "string") return false;
  return Boolean(item.favorite || item.favourite || item.is_favorite || item.is_favourite);
}

function isConsumableLike(item) {
  const name = getItemName(item).toLowerCase();
  const type = String(item?.type || item?.category || item?.item_type || "").toLowerCase();
  return type.includes("consumable") || type.includes("potion") || name.includes("potion") || name.includes("healing");
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

function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot || "Slot";
}

function getEquippedItem(equipped = {}, slot) {
  if (slot === "mainHand") return equipped.mainHand || equipped.main_hand || equipped.weapon;
  if (slot === "offHand") return equipped.offHand || equipped.off_hand || equipped.shield;
  if (slot === "armor") return equipped.armor || equipped.armour;
  if (slot === "gauntlets") return equipped.gauntlets || equipped.gloves;
  if (slot === "boots") return equipped.boots;
  if (slot === "shield") return equipped.shield;
  return equipped[slot];
}

function setCanonicalEquippedSlot(equipped = {}, slot, item) {
  const next = { ...equipped };

  if (slot === "mainHand") {
    if (item) next.mainHand = item;
    else delete next.mainHand;
    delete next.main_hand;
    delete next.weapon;
    return next;
  }

  if (slot === "offHand") {
    if (item) next.offHand = item;
    else delete next.offHand;
    delete next.off_hand;
    if (!item) delete next.shield;
    return next;
  }

  if (slot === "shield") {
    if (item) next.shield = item;
    else delete next.shield;
    delete next.offHand;
    delete next.off_hand;
    return next;
  }

  if (slot === "armor") {
    if (item) next.armor = item;
    else delete next.armor;
    delete next.armour;
    return next;
  }

  if (slot === "gauntlets") {
    if (item) next.gauntlets = item;
    else delete next.gauntlets;
    delete next.gloves;
    return next;
  }

  if (item) next[slot] = item;
  else delete next[slot];
  return next;
}

function normaliseItem(item, source = "") {
  if (typeof item === "string") {
    return {
      name: item,
      type: "Item",
      item_type: "Item",
      quantity: 1,
      description: source === "starting" ? "Starting equipment" : "",
      source,
    };
  }

  const name = getItemName(item);
  const type = item?.type || item?.category || item?.item_type || "Item";
  const equippedSlot = item?.equipped_slot || item?.equip_slot || "";
  return {
    ...item,
    name,
    type,
    item_type: item?.item_type || type,
    quantity: Number(getItemQuantity(item) ?? 1) || 1,
    description: item?.description || item?.desc || "",
    source: item?.source || source,
    attunement_required: requiresAttunement(item),
    requires_attunement: requiresAttunement(item),
    attuned: isAttuned(item),
    is_attuned: isAttuned(item),
    equipped: Boolean(item?.equipped || item?.is_equipped),
    is_equipped: Boolean(item?.equipped || item?.is_equipped),
    equipped_slot: equippedSlot,
    equip_slot: item?.equip_slot || equippedSlot,
    ready_to_use: Boolean(item?.ready_to_use || item?.equipped || item?.is_equipped || item?.attuned),
    attack_bonus: Number(item?.attack_bonus ?? 0) || 0,
    ac_bonus: Number(item?.ac_bonus ?? 0) || 0,
    damage_dice: item?.damage_dice || "",
    damage_type: item?.damage_type || "",
  };
}

function normaliseReferenceItem(item) {
  const category = String(item?.category || "").toLowerCase();
  const isShield = category === "shield" || String(item?.name || "").toLowerCase().includes("shield");
  const isArmor = ["light", "medium", "heavy", "shield"].includes(category) || item?.ac || item?.acBonus;
  const damageParts = String(item?.damage || "").match(/(\d+d\d+|\d+)\s*([a-z]+)?/i);

  return normaliseItem(
    {
      name: item?.name || "Equipment",
      type: isShield ? "Shield" : isArmor ? "Armour" : "Weapon",
      quantity: 1,
      description: [
        item?.category,
        Array.isArray(item?.properties) ? item.properties.join(", ") : item?.properties,
        item?.cost ? `Cost: ${item.cost}` : "",
      ].filter(Boolean).join(" • "),
      damage_dice: damageParts && !isArmor ? damageParts[1] : "",
      damage_type: damageParts && !isArmor ? item?.damageType || damageParts[2] || "" : "",
      range: item?.range || "",
      properties: Array.isArray(item?.properties) ? item.properties.join(", ") : item?.properties || "",
      ac_bonus: 0,
    },
    "reference",
  );
}

function inferEquipSlot(item) {
  if (item?.equipped_slot) return item.equipped_slot;
  if (item?.equip_slot) return item.equip_slot;

  const text = `${String(item?.type || item?.item_type || "")} ${getItemName(item)}`.toLowerCase();
  if (text.includes("shield")) return "shield";
  if (text.includes("gauntlet") || text.includes("glove") || text.includes("bracer")) return "gauntlets";
  if (text.includes("boot") || text.includes("shoe") || text.includes("sandal")) return "boots";
  if (
    text.includes("armour") ||
    text.includes("armor") ||
    text.includes("mail") ||
    text.includes("plate") ||
    text.includes("leather") ||
    text.includes("scale") ||
    text.includes("chain") ||
    text.includes("hide")
  ) return "armor";
  if (text.includes("off hand") || text.includes("offhand")) return "offHand";
  if (
    text.includes("weapon") ||
    text.includes("sword") ||
    text.includes("bow") ||
    text.includes("crossbow") ||
    text.includes("axe") ||
    text.includes("mace") ||
    text.includes("staff") ||
    text.includes("dagger") ||
    text.includes("spear") ||
    text.includes("lance") ||
    text.includes("hammer") ||
    text.includes("rapier") ||
    text.includes("club") ||
    text.includes("flail") ||
    text.includes("halberd") ||
    text.includes("pike") ||
    text.includes("trident") ||
    text.includes("whip")
  ) return "mainHand";
  if (item?.damage_dice) return "mainHand";
  if (item?.ac_bonus && !item?.attack_bonus) return "armor";
  return "";
}

function itemKey(item, index = "") {
  return `${item?.id || normalizeKey(getItemName(item))}-${item?.source || ""}-${index}`;
}

function dedupeItems(items = []) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = `${normalizeKey(getItemName(item))}-${item?.source || ""}-${index < 0 ? index : ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function ItemCard({ item, slot, actions }) {
  const quantity = getItemQuantity(item);
  const damageDice = item?.damage_dice || item?.damage;
  const damageType = item?.damage_type || item?.damageType || "";
  const attackBonus = Number(item?.attack_bonus || 0);
  const acBonus = Number(item?.ac_bonus || 0);
  const source = item?.source;

  return (
    <article className={`clean-sheet-item-card ${isFavorite(item) ? "favorite" : ""} ${isConsumableLike(item) ? "consumable" : ""}`}>
      <div className="clean-sheet-item-card-top">
        {slot && <span className="clean-sheet-item-slot">{slot}</span>}
        {source === "starting" && <span className="clean-sheet-item-slot">Starter</span>}
        {isFavorite(item) && <span className="clean-sheet-item-slot favorite">Favourite</span>}
        {isConsumableLike(item) && <span className="clean-sheet-item-slot consumable">Consumable</span>}
        {requiresAttunement(item) && (
          <span className="clean-sheet-item-slot">{isAttuned(item) ? "Attuned" : "Needs Attunement"}</span>
        )}
        {isGrantedEquipped(item) && <span className="clean-sheet-item-slot">Ready</span>}
      </div>
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {damageDice && (
        <em>{damageDice}{damageType ? ` ${damageType}` : ""}{attackBonus !== 0 ? ` (${attackBonus >= 0 ? "+" : ""}${attackBonus} to hit)` : ""}</em>
      )}
      {!damageDice && acBonus !== 0 && <em>AC {acBonus >= 0 ? "+" : ""}{acBonus}</em>}
      {quantity !== null && <em>Qty {quantity}</em>}
      {actions && <div className="clean-sheet-item-actions">{actions}</div>}
    </article>
  );
}

function EquipmentSlotCard({ slot, label, item, actions }) {
  return item ? (
    <ItemCard slot={label} item={normaliseItem(item, "equipped")} actions={actions} />
  ) : (
    <article className="clean-sheet-item-card clean-sheet-empty-slot">
      <span className="clean-sheet-item-slot">{label}</span>
      <strong>Empty</strong>
      <p>Select an item below to assign this slot.</p>
    </article>
  );
}

export default function CleanInventoryTab({ character, onCharacterUpdate, onRoll }) {
  const [savingSlot, setSavingSlot] = useState("");
  const [savingItems, setSavingItems] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);
  const [itemSearch, setItemSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("all");
  const [selectedReferenceKey, setSelectedReferenceKey] = useState("");

  const equipped = character?.equipped || {};
  const starterGear = useMemo(
    () => toArray(character?.starting_equipment || character?.startingEquipment).map((item) => normaliseItem(item, "starting")),
    [character],
  );
  const equipment = useMemo(
    () => toArray(character?.equipment).map((item) => normaliseItem(item, "equipment")),
    [character],
  );
  const inventory = useMemo(
    () => toArray(character?.inventory).map((item) => normaliseItem(item, "inventory")),
    [character],
  );
  const equippedItems = useMemo(
    () => EQUIP_SLOTS.map(([slot]) => getEquippedItem(equipped, slot)).filter(Boolean).map((item) => normaliseItem(item, "equipped")),
    [equipped],
  );
  const allCarriedItems = useMemo(
    () => dedupeItems([...equippedItems, ...equipment, ...starterGear, ...inventory]),
    [equippedItems, equipment, starterGear, inventory],
  );
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);

  const favoriteItems = useMemo(() => allCarriedItems.filter(isFavorite), [allCarriedItems]);
  const attunedItems = useMemo(() => allCarriedItems.filter(isAttuned), [allCarriedItems]);
  const attunementRequired = useMemo(() => allCarriedItems.filter(requiresAttunement), [allCarriedItems]);
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allCarriedItems;
    return allCarriedItems.filter((item) => `${getItemName(item)} ${getItemDetail(item)} ${slotLabel(inferEquipSlot(item))}`.toLowerCase().includes(q));
  }, [allCarriedItems, itemSearch]);

  const referenceCatalog = useMemo(
    () => [
      ...ALL_WEAPONS.map((item) => ({ key: `weapon-${item.id || item.name}`, kind: "weapon", label: item.name, item })),
      ...ALL_ARMOR.map((item) => ({
        key: `${String(item.category || "armor") === "shield" ? "shield" : "armor"}-${item.id || item.name}`,
        kind: String(item.category || "").toLowerCase() === "shield" ? "shield" : "armor",
        label: item.name,
        item,
      })),
    ],
    [],
  );

  const filteredReferenceCatalog = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    return referenceCatalog
      .filter((entry) => equipmentTypeFilter === "all" || entry.kind === equipmentTypeFilter)
      .filter((entry) => !q || `${entry.label} ${entry.kind} ${entry.item?.category || ""} ${entry.item?.damage || ""}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [equipmentSearch, equipmentTypeFilter, referenceCatalog]);

  const selectedReferenceEntry = useMemo(
    () => referenceCatalog.find((entry) => entry.key === selectedReferenceKey) || null,
    [referenceCatalog, selectedReferenceKey],
  );
  const selectedReference = selectedReferenceEntry?.item || null;
  const selectedReferenceItem = selectedReference ? normaliseReferenceItem(selectedReference) : null;
  const selectedReferenceSlot = selectedReferenceItem ? inferEquipSlot(selectedReferenceItem) : null;
  const selectedReferenceAttack = selectedReferenceItem && selectedReferenceSlot === "mainHand"
    ? deriveWeaponAttack(selectedReferenceItem, character, proficiencyBonus)
    : null;
  const selectedReferenceAc = selectedReferenceItem && ["armor", "shield"].includes(selectedReferenceSlot)
    ? deriveArmorClass({ ...character, equipped: setCanonicalEquippedSlot(equipped, selectedReferenceSlot, selectedReferenceItem) }, { ignoreStoredAc: true })
    : null;

  const patchCharacter = async (updates, success = "Inventory updated") => {
    if (!character?.id) {
      toast.error("Open a saved character before changing inventory.");
      return false;
    }
    setSavingItems(true);
    try {
      await apiClient.patch(`/characters/${character.id}`, updates);
      onCharacterUpdate?.(updates);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not update inventory");
      return false;
    } finally {
      setSavingItems(false);
    }
  };

  const saveEquipped = async (nextEquipped, slotLabelText) => {
    setSavingSlot(slotLabelText);
    const derivedAc = deriveArmorClass({ ...character, equipped: nextEquipped }, { ignoreStoredAc: true });
    const ok = await patchCharacter({ equipped: nextEquipped, armor_class: derivedAc }, "Equipment updated");
    setSavingSlot("");
    return ok;
  };

  const equipItem = (slot, rawItem) => {
    const item = normaliseItem(rawItem);
    const effectiveSlot = slot || inferEquipSlot(item);
    const equippedItem = {
      ...item,
      equip_slot: effectiveSlot,
      equipped_slot: effectiveSlot,
      equipped: true,
      is_equipped: true,
    };
    const nextEquipped = setCanonicalEquippedSlot(equipped, effectiveSlot, equippedItem);
    saveEquipped(nextEquipped, effectiveSlot);
  };

  const clearSlot = (slot) => {
    let nextEquipped = setCanonicalEquippedSlot(equipped, slot, null);
    if (slot === "offHand") nextEquipped = setCanonicalEquippedSlot(nextEquipped, "shield", null);
    saveEquipped(nextEquipped, slot);
  };

  const saveInventory = async (nextInventory, message = "Inventory updated") => patchCharacter({ inventory: nextInventory }, message);

  const addItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const item = normaliseItem({ ...newItem, name: newItem.name.trim() }, "inventory");
    const ok = await saveInventory([...inventory, item], "Item added");
    if (ok) {
      setNewItem(blankItem);
      setShowAddItem(false);
    }
  };

  const addReferenceItem = async (referenceItem, shouldEquip = false) => {
    const item = normaliseReferenceItem(referenceItem);
    const nextInventory = [...inventory, item];
    const slot = inferEquipSlot(item);
    const equippedItem = shouldEquip && slot ? { ...item, equip_slot: slot, equipped_slot: slot, equipped: true, is_equipped: true } : null;
    const nextEquipped = equippedItem ? setCanonicalEquippedSlot(equipped, slot, equippedItem) : equipped;
    const updates = shouldEquip && slot
      ? { inventory: nextInventory, equipped: nextEquipped, armor_class: deriveArmorClass({ ...character, equipped: nextEquipped }, { ignoreStoredAc: true }) }
      : { inventory: nextInventory };
    const ok = await patchCharacter(updates, shouldEquip && slot ? `${item.name} added and equipped` : `${item.name} added`);
    if (ok) setSelectedReferenceKey("");
  };

  const updateInventoryItem = async (item, updates) => {
    const index = inventory.findIndex((candidate) => normalizeKey(getItemName(candidate)) === normalizeKey(getItemName(item)));
    if (index < 0) {
      toast.info("Equipped/starter gear can be used, but only backpack items can be edited here.");
      return;
    }
    const nextInventory = [...inventory];
    nextInventory[index] = normaliseItem({ ...nextInventory[index], ...updates }, "inventory");
    await saveInventory(nextInventory);
  };

  const removeInventoryItem = async (item) => {
    const index = inventory.findIndex((candidate) => normalizeKey(getItemName(candidate)) === normalizeKey(getItemName(item)));
    if (index < 0) {
      toast.info("Equipped/starter gear can be used, but only backpack items can be removed here.");
      return;
    }
    const nextInventory = [...inventory];
    nextInventory.splice(index, 1);
    await saveInventory(nextInventory, "Item removed");
  };

  const makeWeaponRoll = (item) => {
    const attack = deriveWeaponAttack(item, character, proficiencyBonus);
    if (onRoll) {
      onRoll(`${attack.title} Attack`, Number(attack.attackMod || 0));
      toast.info(`${attack.damageText} ${attack.damageType || ""} damage on hit`);
      return;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
    toast.success(`${attack.title} attack: ${roll} ${attack.attackText} = ${roll + Number(attack.attackMod || 0)}`, {
      description: `${attack.damageText} ${attack.damageType || ""} damage if it hits`,
    });
  };

  const itemActions = (item) => {
    const qty = Number(getItemQuantity(item) ?? 1) || 1;
    const slot = inferEquipSlot(item);
    const isInventoryItem = item.source === "inventory";
    return (
      <>
        {slot && (
          <button type="button" onClick={() => equipItem(slot, item)} disabled={savingItems}>
            Equip {slotLabel(slot)}
          </button>
        )}
        {(slot === "mainHand" || item?.damage_dice || item?.damage || String(item?.type || "").toLowerCase().includes("weapon")) && (
          <button type="button" onClick={() => makeWeaponRoll(item)} disabled={savingItems}>Attack</button>
        )}
        {requiresAttunement(item) && isInventoryItem && (
          <button type="button" onClick={() => updateInventoryItem(item, { attuned: !isAttuned(item), is_attuned: !isAttuned(item) })} disabled={savingItems}>
            {isAttuned(item) ? "Unattune" : "Attune"}
          </button>
        )}
        {isInventoryItem && (
          <button type="button" onClick={() => updateInventoryItem(item, { quantity: Math.max(1, qty - 1), qty: Math.max(1, qty - 1) })} disabled={savingItems}>- Qty</button>
        )}
        {isInventoryItem && (
          <button type="button" onClick={() => updateInventoryItem(item, { quantity: qty + 1, qty: qty + 1 })} disabled={savingItems}>+ Qty</button>
        )}
        {isInventoryItem && (
          <button type="button" onClick={() => updateInventoryItem(item, { favorite: !isFavorite(item), favourite: !isFavorite(item) })} disabled={savingItems}>
            {isFavorite(item) ? "Unfav" : "Fav"}
          </button>
        )}
        {isInventoryItem && (
          <button type="button" onClick={() => updateInventoryItem(item, { type: isConsumableLike(item) ? "Item" : "Consumable" })} disabled={savingItems}>
            {isConsumableLike(item) ? "Not Consumable" : "Consumable"}
          </button>
        )}
        {isInventoryItem && (
          <button type="button" onClick={() => removeInventoryItem(item)} disabled={savingItems}>Remove</button>
        )}
      </>
    );
  };

  const slotActions = (slot, item) => (
    <>
      {item && (slot === "mainHand" || slot === "offHand" || item?.damage_dice || item?.damage || String(item?.type || "").toLowerCase().includes("weapon")) && (
        <button type="button" onClick={() => makeWeaponRoll(item)}>Attack Roll</button>
      )}
      <button type="button" onClick={() => clearSlot(slot)} disabled={savingSlot === slot}>Clear Slot</button>
    </>
  );

  return (
    <div className="clean-sheet-grid clean-sheet-inventory-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Inventory</h2>
            <p>Main hand, off hand, armour, gauntlets, boots, attuned items, and everything carried.</p>
          </div>
          <button type="button" onClick={() => setShowAddItem((prev) => !prev)}>
            <Plus size={15} /> {showAddItem ? "Close Add Item" : "Add Item"}
          </button>
        </div>
        <div className="clean-sheet-inventory-summary">
          <div><Backpack size={16} /><span>Total Items</span><strong>{allCarriedItems.length}</strong></div>
          <div><Shield size={16} /><span>Equipped</span><strong>{EQUIP_SLOTS.filter(([slot]) => getEquippedItem(equipped, slot)).length}/{EQUIP_SLOTS.length}</strong></div>
          <div><Sparkles size={16} /><span>Attuned</span><strong>{attunedItems.length}/3</strong></div>
          <div><Coins size={16} /><span>Gold</span><strong>{Number(character?.currency?.gold ?? character?.gold ?? 0)}</strong></div>
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-equipped-slots-section">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Equipped Slots</h2>
            <p>Fast view of what is actually on the character right now.</p>
          </div>
        </div>
        <div className="clean-sheet-equipped-slot-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getEquippedItem(equipped, slot);
            return <EquipmentSlotCard key={slot} slot={slot} label={label} item={item} actions={item ? slotActions(slot, item) : null} />;
          })}
        </div>
      </section>

      {showAddItem && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Add Item</h2>
          <form className="clean-sheet-add-item-form" onSubmit={addItem}>
            <input value={newItem.name} onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))} placeholder="Item name" />
            <select value={newItem.type} onChange={(e) => setNewItem((prev) => ({ ...prev, type: e.target.value }))}>
              <option>Item</option>
              <option>Weapon</option>
              <option>Armour</option>
              <option>Shield</option>
              <option>Gauntlets</option>
              <option>Boots</option>
              <option>Consumable</option>
              <option>Magic Item</option>
            </select>
            <input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))} placeholder="Qty" />
            <select value={newItem.equip_slot} onChange={(e) => setNewItem((prev) => ({ ...prev, equip_slot: e.target.value, equipped_slot: e.target.value }))}>
              <option value="">No slot</option>
              <option value="mainHand">Main Hand</option>
              <option value="offHand">Off Hand</option>
              <option value="armor">Armour</option>
              <option value="gauntlets">Gauntlets</option>
              <option value="boots">Boots</option>
            </select>
            <input type="text" value={newItem.damage_dice} onChange={(e) => setNewItem((prev) => ({ ...prev, damage_dice: e.target.value }))} placeholder="Damage dice e.g. 1d6" />
            <select value={newItem.damage_type} onChange={(e) => setNewItem((prev) => ({ ...prev, damage_type: e.target.value }))}>
              <option value="">Damage type</option>
              {["slashing", "piercing", "bludgeoning", "fire", "cold", "lightning", "acid", "poison", "necrotic", "radiant", "psychic", "thunder", "force"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input type="number" value={newItem.attack_bonus} onChange={(e) => setNewItem((prev) => ({ ...prev, attack_bonus: Number(e.target.value) || 0 }))} placeholder="Attack bonus" />
            <input type="number" value={newItem.ac_bonus} onChange={(e) => setNewItem((prev) => ({ ...prev, ac_bonus: Number(e.target.value) || 0 }))} placeholder="AC bonus" />
            <textarea value={newItem.description} onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description or effect" />
            <label className="clean-sheet-checkbox-row">
              <input type="checkbox" checked={newItem.attunement_required} onChange={(e) => setNewItem((prev) => ({ ...prev, attunement_required: e.target.checked, requires_attunement: e.target.checked, attuned: e.target.checked ? prev.attuned : false }))} />
              Requires attunement
            </label>
            {newItem.attunement_required && (
              <label className="clean-sheet-checkbox-row">
                <input type="checkbox" checked={newItem.attuned} onChange={(e) => setNewItem((prev) => ({ ...prev, attuned: e.target.checked, is_attuned: e.target.checked }))} />
                Currently attuned
              </label>
            )}
            <label className="clean-sheet-checkbox-row">
              <input type="checkbox" checked={newItem.favorite} onChange={(e) => setNewItem((prev) => ({ ...prev, favorite: e.target.checked, favourite: e.target.checked }))} />
              Favourite this item
            </label>
            <button type="submit" disabled={savingItems}>Save Item</button>
          </form>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-attunement-section">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Attuned Items</h2>
            <p>Track magic items that are currently attuned. Standard tables usually allow three.</p>
          </div>
          <span className="clean-sheet-item-slot">{attunedItems.length}/3</span>
        </div>
        <div className="clean-sheet-item-grid">
          {attunementRequired.length ? attunementRequired.map((item, index) => (
            <ItemCard key={itemKey(item, index)} item={item} actions={itemActions(item)} />
          )) : <p className="clean-sheet-empty-note">No attunement items recorded yet.</p>}
        </div>
      </section>

      <section className="clean-sheet-panel">
        <h2>Currency</h2>
        <CurrencyBlock currency={character?.currency || {}} gold={character?.gold} />
      </section>

      {favoriteItems.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Favourite Items</h2>
          <div className="clean-sheet-item-grid">
            {favoriteItems.map((item, index) => <ItemCard key={itemKey(item, index)} item={item} actions={itemActions(item)} />)}
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Add Equipment from List</h2>
            <p>Pick a weapon, armour, or shield and add it straight to this character.</p>
          </div>
        </div>
        <div className="clean-sheet-equipment-tools">
          <label>
            <Search size={15} />
            <input value={equipmentSearch} onChange={(event) => setEquipmentSearch(event.target.value)} placeholder="Search weapons, armour, shields…" />
          </label>
          <select value={equipmentTypeFilter} onChange={(event) => setEquipmentTypeFilter(event.target.value)} aria-label="Filter equipment type">
            <option value="all">All equipment</option>
            <option value="weapon">Weapons</option>
            <option value="armor">Armour</option>
            <option value="shield">Shields</option>
          </select>
        </div>
        <div className="clean-sheet-equipment-picker">
          <select value={selectedReferenceKey} onChange={(event) => setSelectedReferenceKey(event.target.value)}>
            <option value="">Select equipment…</option>
            {filteredReferenceCatalog.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
          </select>
          <button type="button" disabled={!selectedReference || savingItems} onClick={() => selectedReference && addReferenceItem(selectedReference, false)}>Add to Inventory</button>
          <button type="button" disabled={!selectedReference || savingItems || !selectedReferenceSlot} onClick={() => selectedReference && addReferenceItem(selectedReference, true)}>Add & Equip</button>
        </div>
        {selectedReferenceItem && (
          <div className="clean-sheet-equipment-preview">
            <div>
              <span>Selected</span>
              <strong>{selectedReferenceItem.name}</strong>
              <em>{selectedReferenceItem.description || selectedReferenceEntry?.kind}</em>
            </div>
            <div>
              <span>Will use</span>
              <strong>{selectedReferenceSlot ? slotLabel(selectedReferenceSlot) : "Inventory only"}</strong>
              <em>{selectedReferenceAttack ? `${selectedReferenceAttack.attackText} to hit • ${selectedReferenceAttack.damageText} ${selectedReferenceAttack.damageType}` : selectedReferenceAc ? `AC becomes ${selectedReferenceAc}` : "No slot detected"}</em>
            </div>
          </div>
        )}
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>All Items</h2>
            <p>Everything carried, equipped, starter gear, backpack items, and GM-granted items.</p>
          </div>
          <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Search items…" />
        </div>
        <div className="clean-sheet-item-grid">
          {filteredInventory.length ? filteredInventory.map((item, index) => (
            <ItemCard key={itemKey(item, index)} item={item} slot={slotLabel(inferEquipSlot(item))} actions={itemActions(item)} />
          )) : <p className="clean-sheet-empty-note">No carried items match your search.</p>}
        </div>
      </section>
    </div>
  );
}

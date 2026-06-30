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
  Swords,
} from "lucide-react";

import {
  deriveArmorClass,
  deriveWeaponAttack,
} from "@/data/characterCombatDerivations";
import { ALL_ARMOR, ALL_WEAPONS } from "@/data/equipmentDatabase";

const EQUIP_SLOTS = [
  ["mainHand", "Main Hand"],
  ["offHand", "Off Hand"],
  ["armor", "Armour"],
  ["shield", "Shield"],
];

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

function getItemName(item) {
  if (!item) return "Unknown item";
  if (typeof item === "string") return item;
  return (
    item.name || item.item_name || item.label || item.title || "Unknown item"
  );
}

function getItemDetail(item) {
  if (!item || typeof item === "string") return "";
  return (
    item.description ||
    item.desc ||
    item.type ||
    item.category ||
    item.rarity ||
    ""
  );
}

function getItemQuantity(item) {
  if (!item || typeof item === "string") return 1;
  return item.quantity ?? item.qty ?? item.count ?? 1;
}

function isFavorite(item) {
  if (!item || typeof item === "string") return false;
  return Boolean(
    item.favorite || item.favourite || item.is_favorite || item.is_favourite,
  );
}

function isConsumableLike(item) {
  const name = getItemName(item).toLowerCase();
  const type = String(
    item?.type || item?.category || item?.item_type || "",
  ).toLowerCase();
  return (
    type.includes("consumable") ||
    type.includes("potion") ||
    name.includes("potion") ||
    name.includes("healing")
  );
}

function requiresAttunement(item) {
  return Boolean(item?.attunement_required || item?.requires_attunement);
}

function isAttuned(item) {
  return Boolean(item?.attuned || item?.is_attuned);
}

function isGrantedEquipped(item) {
  return Boolean(
    item?.equipped ||
    item?.is_equipped ||
    item?.granted_equipped ||
    item?.ready_to_use,
  );
}

function getEquippedItem(equipped = {}, slot) {
  if (slot === "mainHand")
    return equipped.mainHand || equipped.main_hand || equipped.weapon;
  if (slot === "offHand") return equipped.offHand || equipped.off_hand;
  if (slot === "armor") return equipped.armor || equipped.armour;
  return equipped[slot];
}

function normaliseItem(item, source = "") {
  if (typeof item === "string")
    return {
      name: item,
      type: "Item",
      item_type: "Item",
      quantity: 1,
      description: source === "starting" ? "Starting equipment" : "",
      source,
    };
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
    ready_to_use: Boolean(
      item?.ready_to_use ||
      item?.equipped ||
      item?.is_equipped ||
      item?.attuned,
    ),
    attack_bonus: Number(item?.attack_bonus ?? 0) || 0,
    ac_bonus: Number(item?.ac_bonus ?? 0) || 0,
    damage_dice: item?.damage_dice || "",
    damage_type: item?.damage_type || "",
  };
}

function normaliseReferenceItem(item) {
  const category = String(item?.category || "").toLowerCase();
  const isShield =
    category === "shield" ||
    String(item?.name || "")
      .toLowerCase()
      .includes("shield");
  const isArmor =
    ["light", "medium", "heavy", "shield"].includes(category) ||
    item?.ac ||
    item?.acBonus;
  const damageParts = String(item?.damage || "").match(
    /(\d+d\d+|\d+)\s*([a-z]+)?/i,
  );
  return normaliseItem(
    {
      name: item?.name || "Equipment",
      type: isShield ? "Shield" : isArmor ? "Armour" : "Weapon",
      quantity: 1,
      description: [
        item?.category,
        Array.isArray(item?.properties)
          ? item.properties.join(", ")
          : item?.properties,
        item?.cost ? `Cost: ${item.cost}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      damage_dice: damageParts && !isArmor ? damageParts[1] : "",
      damage_type:
        damageParts && !isArmor ? item?.damageType || damageParts[2] || "" : "",
      range: item?.range || "",
      properties: Array.isArray(item?.properties)
        ? item.properties.join(", ")
        : item?.properties || "",
      ac_bonus: 0,
    },
    "reference",
  );
}

function inferEquipSlot(item) {
  if (item?.equipped_slot) return item.equipped_slot;
  if (item?.equip_slot) return item.equip_slot;
  const text =
    `${String(item?.type || item?.item_type || "")} ${getItemName(item)}`.toLowerCase();
  if (text.includes("shield")) return "shield";
  if (
    text.includes("armour") ||
    text.includes("armor") ||
    text.includes("mail") ||
    text.includes("plate") ||
    text.includes("leather") ||
    text.includes("scale") ||
    text.includes("chain") ||
    text.includes("hide")
  )
    return "armor";
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
  )
    return "mainHand";
  if (item?.damage_dice) return "mainHand";
  if (item?.ac_bonus && !item?.attack_bonus) return "armor";
  return null;
}

function itemKey(item, index = "") {
  return `${item?.id || getItemName(item).toLowerCase()}-${item?.source || ""}-${index}`;
}

function dedupeItems(items = []) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = `${getItemName(item).toLowerCase()}-${item?.source || ""}-${index < 0 ? index : ""}`;
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
    <article
      className={`clean-sheet-item-card ${isFavorite(item) ? "favorite" : ""} ${isConsumableLike(item) ? "consumable" : ""}`}
    >
      <div className="clean-sheet-item-card-top">
        {slot && <span className="clean-sheet-item-slot">{slot}</span>}
        {source === "starting" && (
          <span className="clean-sheet-item-slot">Starter</span>
        )}
        {isFavorite(item) && (
          <span className="clean-sheet-item-slot favorite">Favourite</span>
        )}
        {isConsumableLike(item) && (
          <span className="clean-sheet-item-slot consumable">Consumable</span>
        )}
        {requiresAttunement(item) && (
          <span className="clean-sheet-item-slot">
            {isAttuned(item) ? "Attuned" : "Needs Attunement"}
          </span>
        )}
        {isGrantedEquipped(item) && (
          <span className="clean-sheet-item-slot">Ready</span>
        )}
      </div>
      <strong>{getItemName(item)}</strong>
      {getItemDetail(item) && <p>{getItemDetail(item)}</p>}
      {damageDice && (
        <em>
          {damageDice}
          {damageType ? ` ${damageType}` : ""}
          {attackBonus !== 0
            ? ` (${attackBonus >= 0 ? "+" : ""}${attackBonus} to hit)`
            : ""}
        </em>
      )}
      {!damageDice && acBonus !== 0 && (
        <em>
          AC {acBonus >= 0 ? "+" : ""}
          {acBonus}
        </em>
      )}
      {quantity !== null && <em>Qty {quantity}</em>}
      {actions && <div className="clean-sheet-item-actions">{actions}</div>}
    </article>
  );
}

export default function CleanInventoryTab({
  character,
  onCharacterUpdate,
  onRoll,
}) {
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
    () =>
      toArray(
        character?.starting_equipment || character?.startingEquipment,
      ).map((item) => normaliseItem(item, "starting")),
    [character],
  );
  const equipment = useMemo(
    () =>
      toArray(character?.equipment).map((item) =>
        normaliseItem(item, "equipment"),
      ),
    [character],
  );
  const inventory = useMemo(
    () =>
      toArray(character?.inventory).map((item) =>
        normaliseItem(item, "inventory"),
      ),
    [character],
  );
  const allCarriedItems = useMemo(
    () => dedupeItems([...equipment, ...starterGear, ...inventory]),
    [equipment, starterGear, inventory],
  );
  const proficiencyBonus =
    Number(character?.proficiency_bonus) ||
    2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);

  const favoriteItems = useMemo(
    () => allCarriedItems.filter(isFavorite),
    [allCarriedItems],
  );
  const consumables = useMemo(
    () => allCarriedItems.filter(isConsumableLike),
    [allCarriedItems],
  );
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allCarriedItems;
    return allCarriedItems.filter((item) =>
      `${getItemName(item)} ${getItemDetail(item)}`.toLowerCase().includes(q),
    );
  }, [allCarriedItems, itemSearch]);

  const referenceCatalog = useMemo(
    () => [
      ...ALL_WEAPONS.map((item) => ({
        key: `weapon-${item.id || item.name}`,
        kind: "weapon",
        label: item.name,
        item,
      })),
      ...ALL_ARMOR.map((item) => ({
        key: `${String(item.category || "armor") === "shield" ? "shield" : "armor"}-${item.id || item.name}`,
        kind:
          String(item.category || "").toLowerCase() === "shield"
            ? "shield"
            : "armor",
        label: item.name,
        item,
      })),
    ],
    [],
  );

  const filteredReferenceCatalog = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    return referenceCatalog
      .filter(
        (entry) =>
          equipmentTypeFilter === "all" || entry.kind === equipmentTypeFilter,
      )
      .filter(
        (entry) =>
          !q ||
          `${entry.label} ${entry.kind} ${entry.item?.category || ""} ${entry.item?.damage || ""}`
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 80);
  }, [equipmentSearch, equipmentTypeFilter, referenceCatalog]);

  const selectedReferenceEntry = useMemo(
    () =>
      referenceCatalog.find((entry) => entry.key === selectedReferenceKey) ||
      null,
    [referenceCatalog, selectedReferenceKey],
  );
  const selectedReference = selectedReferenceEntry?.item || null;
  const selectedReferenceItem = selectedReference
    ? normaliseReferenceItem(selectedReference)
    : null;
  const selectedReferenceSlot = selectedReferenceItem
    ? inferEquipSlot(selectedReferenceItem)
    : null;
  const selectedReferenceAttack =
    selectedReferenceItem && selectedReferenceSlot === "mainHand"
      ? deriveWeaponAttack(selectedReferenceItem, character, proficiencyBonus)
      : null;
  const selectedReferenceAc =
    selectedReferenceItem && ["armor", "shield"].includes(selectedReferenceSlot)
      ? deriveArmorClass(
          {
            ...character,
            equipped: {
              ...equipped,
              [selectedReferenceSlot]: selectedReferenceItem,
            },
          },
          { ignoreStoredAc: true },
        )
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
      toast.error(
        error?.response?.data?.detail || "Could not update inventory",
      );
      return false;
    } finally {
      setSavingItems(false);
    }
  };

  const saveEquipped = async (nextEquipped, slotLabel) => {
    setSavingSlot(slotLabel);
    const derivedAc = deriveArmorClass(
      { ...character, equipped: nextEquipped },
      { ignoreStoredAc: true },
    );
    const ok = await patchCharacter(
      { equipped: nextEquipped, armor_class: derivedAc },
      "Equipment updated",
    );
    setSavingSlot("");
    return ok;
  };

  const equipItem = (slot, rawItem) => {
    const item = normaliseItem(rawItem);
    const equippedItem = {
      ...item,
      equip_slot: slot,
      equipped_slot: slot,
      equipped: true,
      is_equipped: true,
    };
    const nextEquipped = { ...equipped, [slot]: equippedItem };
    if (slot === "mainHand") nextEquipped.main_hand = equippedItem;
    if (slot === "offHand") nextEquipped.off_hand = equippedItem;
    if (slot === "armor") nextEquipped.armour = equippedItem;
    saveEquipped(nextEquipped, slot);
  };

  const clearSlot = (slot) => {
    const nextEquipped = { ...equipped };
    delete nextEquipped[slot];
    if (slot === "mainHand") {
      delete nextEquipped.main_hand;
      delete nextEquipped.weapon;
    }
    if (slot === "offHand") delete nextEquipped.off_hand;
    if (slot === "armor") delete nextEquipped.armour;
    saveEquipped(nextEquipped, slot);
  };

  const saveInventory = async (nextInventory, message = "Inventory updated") =>
    patchCharacter({ inventory: nextInventory }, message);

  const addItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const item = normaliseItem(
      { ...newItem, name: newItem.name.trim() },
      "inventory",
    );
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
    const equippedItem =
      shouldEquip && slot
        ? {
            ...item,
            equip_slot: slot,
            equipped_slot: slot,
            equipped: true,
            is_equipped: true,
          }
        : null;
    const nextEquipped = equippedItem
      ? { ...equipped, [slot]: equippedItem }
      : equipped;
    if (equippedItem && slot === "mainHand")
      nextEquipped.main_hand = equippedItem;
    if (equippedItem && slot === "offHand")
      nextEquipped.off_hand = equippedItem;
    if (equippedItem && slot === "armor") nextEquipped.armour = equippedItem;
    const updates =
      shouldEquip && slot
        ? {
            inventory: nextInventory,
            equipped: nextEquipped,
            armor_class: deriveArmorClass(
              { ...character, equipped: nextEquipped },
              { ignoreStoredAc: true },
            ),
          }
        : { inventory: nextInventory };
    const ok = await patchCharacter(
      updates,
      shouldEquip && slot
        ? `${item.name} added and equipped`
        : `${item.name} added`,
    );
    if (ok) setSelectedReferenceKey("");
  };

  const updateInventoryItem = async (item, updates) => {
    const index = inventory.findIndex(
      (candidate) =>
        getItemName(candidate).toLowerCase() ===
        getItemName(item).toLowerCase(),
    );
    if (index < 0) {
      toast.info(
        "Starter gear can be equipped, but only backpack items can be edited here.",
      );
      return;
    }
    const nextInventory = [...inventory];
    nextInventory[index] = normaliseItem(
      { ...nextInventory[index], ...updates },
      "inventory",
    );
    await saveInventory(nextInventory);
  };

  const removeInventoryItem = async (item) => {
    const index = inventory.findIndex(
      (candidate) =>
        getItemName(candidate).toLowerCase() ===
        getItemName(item).toLowerCase(),
    );
    if (index < 0) {
      toast.info(
        "Starter gear can be equipped, but only backpack items can be removed here.",
      );
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
      toast.info(
        `${attack.damageText} ${attack.damageType || ""} damage on hit`,
      );
      return;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
    toast.success(
      `${attack.title} attack: ${roll} ${attack.attackText} = ${roll + Number(attack.attackMod || 0)}`,
      {
        description: `${attack.damageText} ${attack.damageType || ""} damage if it hits`,
      },
    );
  };

  const itemActions = (item) => {
    const qty = Number(getItemQuantity(item) ?? 1) || 1;
    const slot = inferEquipSlot(item);
    const isInventoryItem = item.source === "inventory";
    return (
      <>
        {slot && (
          <button
            type="button"
            onClick={() => equipItem(slot, item)}
            disabled={savingItems}
          >
            Equip
          </button>
        )}
        {(slot === "mainHand" ||
          item?.damage_dice ||
          item?.damage ||
          String(item?.type || "")
            .toLowerCase()
            .includes("weapon")) && (
          <button
            type="button"
            onClick={() => makeWeaponRoll(item)}
            disabled={savingItems}
          >
            Attack
          </button>
        )}
        {requiresAttunement(item) && isInventoryItem && (
          <button
            type="button"
            onClick={() =>
              updateInventoryItem(item, {
                attuned: !isAttuned(item),
                is_attuned: !isAttuned(item),
              })
            }
            disabled={savingItems}
          >
            {isAttuned(item) ? "Unattune" : "Attune"}
          </button>
        )}
        {isInventoryItem && (
          <button
            type="button"
            onClick={() =>
              updateInventoryItem(item, {
                quantity: Math.max(1, qty - 1),
                qty: Math.max(1, qty - 1),
              })
            }
            disabled={savingItems}
          >
            - Qty
          </button>
        )}
        {isInventoryItem && (
          <button
            type="button"
            onClick={() =>
              updateInventoryItem(item, { quantity: qty + 1, qty: qty + 1 })
            }
            disabled={savingItems}
          >
            + Qty
          </button>
        )}
        {isInventoryItem && (
          <button
            type="button"
            onClick={() =>
              updateInventoryItem(item, {
                favorite: !isFavorite(item),
                favourite: !isFavorite(item),
              })
            }
            disabled={savingItems}
          >
            {isFavorite(item) ? "Unfav" : "Fav"}
          </button>
        )}
        {isInventoryItem && (
          <button
            type="button"
            onClick={() =>
              updateInventoryItem(item, {
                type: isConsumableLike(item) ? "Item" : "Consumable",
              })
            }
            disabled={savingItems}
          >
            {isConsumableLike(item) ? "Not Consumable" : "Consumable"}
          </button>
        )}
        {isInventoryItem && (
          <button
            type="button"
            onClick={() => removeInventoryItem(item)}
            disabled={savingItems}
          >
            Remove
          </button>
        )}
      </>
    );
  };

  return (
    <div className="clean-sheet-grid clean-sheet-inventory-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Equipped</h2>
            <p>
              Equipping armour recalculates AC. Equipping weapons adds usable
              attack rolls.
            </p>
          </div>
          <button type="button" onClick={() => setShowAddItem((prev) => !prev)}>
            <Plus size={15} /> {showAddItem ? "Close Add Item" : "Add Item"}
          </button>
        </div>
        <div className="clean-sheet-item-grid">
          {EQUIP_SLOTS.map(([slot, label]) => {
            const item = getEquippedItem(equipped, slot);
            return item ? (
              <ItemCard
                key={slot}
                slot={label}
                item={normaliseItem(item, "equipped")}
                actions={
                  <>
                    {(["mainHand", "offHand"].includes(slot) ||
                      item?.damage_dice ||
                      item?.damage ||
                      String(item?.type || "")
                        .toLowerCase()
                        .includes("weapon")) && (
                      <button
                        type="button"
                        onClick={() => makeWeaponRoll(item)}
                      >
                        Attack Roll
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => clearSlot(slot)}
                      disabled={savingSlot === slot}
                    >
                      Clear Slot
                    </button>
                  </>
                }
              />
            ) : (
              <article
                key={slot}
                className="clean-sheet-item-card clean-sheet-empty-slot"
              >
                <span className="clean-sheet-item-slot">{label}</span>
                <strong>Empty</strong>
                <p>Select an item below to assign this slot.</p>
              </article>
            );
          })}
        </div>
      </section>

      {showAddItem && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Add Item</h2>
          <form className="clean-sheet-add-item-form" onSubmit={addItem}>
            <input
              value={newItem.name}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Item name"
            />
            <select
              value={newItem.type}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, type: e.target.value }))
              }
            >
              <option>Item</option>
              <option>Weapon</option>
              <option>Armour</option>
              <option>Shield</option>
              <option>Consumable</option>
              <option>Magic Item</option>
            </select>
            <input
              type="number"
              min="1"
              value={newItem.quantity}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  quantity: Number(e.target.value) || 1,
                }))
              }
              placeholder="Qty"
            />
            <input
              type="text"
              value={newItem.damage_dice}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, damage_dice: e.target.value }))
              }
              placeholder="Damage dice e.g. 1d6"
            />
            <select
              value={newItem.damage_type}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, damage_type: e.target.value }))
              }
            >
              <option value="">Damage type</option>
              {[
                "slashing",
                "piercing",
                "bludgeoning",
                "fire",
                "cold",
                "lightning",
                "acid",
                "poison",
                "necrotic",
                "radiant",
                "psychic",
                "thunder",
                "force",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newItem.attack_bonus}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  attack_bonus: Number(e.target.value) || 0,
                }))
              }
              placeholder="Attack bonus"
            />
            <input
              type="number"
              value={newItem.ac_bonus}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  ac_bonus: Number(e.target.value) || 0,
                }))
              }
              placeholder="AC bonus"
            />
            <textarea
              value={newItem.description}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description or effect"
            />
            <label className="clean-sheet-checkbox-row">
              <input
                type="checkbox"
                checked={newItem.attunement_required}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    attunement_required: e.target.checked,
                    requires_attunement: e.target.checked,
                    attuned: e.target.checked ? prev.attuned : false,
                  }))
                }
              />
              Requires attunement
            </label>
            {newItem.attunement_required && (
              <label className="clean-sheet-checkbox-row">
                <input
                  type="checkbox"
                  checked={newItem.attuned}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      attuned: e.target.checked,
                      is_attuned: e.target.checked,
                    }))
                  }
                />
                Currently attuned
              </label>
            )}
            <label className="clean-sheet-checkbox-row">
              <input
                type="checkbox"
                checked={newItem.favorite}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    favorite: e.target.checked,
                    favourite: e.target.checked,
                  }))
                }
              />
              Favourite this item
            </label>
            <button type="submit" disabled={savingItems}>
              Save Item
            </button>
          </form>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-inventory-summary">
        <div>
          <Backpack size={16} />
          <span>Total Items</span>
          <strong>{allCarriedItems.length}</strong>
        </div>
        <div>
          <Shield size={16} />
          <span>Equipped</span>
          <strong>
            {
              EQUIP_SLOTS.filter(([slot]) => getEquippedItem(equipped, slot))
                .length
            }
            /4
          </strong>
        </div>
        <div>
          <Sparkles size={16} />
          <span>Favourites</span>
          <strong>{favoriteItems.length}</strong>
        </div>
        <div>
          <Coins size={16} />
          <span>Gold</span>
          <strong>
            {Number(character?.currency?.gold ?? character?.gold ?? 0)}
          </strong>
        </div>
      </section>

      <section className="clean-sheet-panel">
        <h2>Currency</h2>
        <CurrencyBlock
          currency={character?.currency || {}}
          gold={character?.gold}
        />
      </section>

      {favoriteItems.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Favourite Items</h2>
          <div className="clean-sheet-item-grid">
            {favoriteItems.map((item, index) => (
              <ItemCard
                key={itemKey(item, index)}
                item={item}
                actions={itemActions(item)}
              />
            ))}
          </div>
        </section>
      )}
      {consumables.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Consumables</h2>
          <div className="clean-sheet-item-grid">
            {consumables.map((item, index) => (
              <ItemCard
                key={itemKey(item, index)}
                item={item}
                actions={itemActions(item)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Add Equipment from List</h2>
            <p>
              Pick a weapon, armour, or shield and add it straight to this
              character.
            </p>
          </div>
        </div>
        <div className="clean-sheet-equipment-tools">
          <label>
            <Search size={15} />
            <input
              value={equipmentSearch}
              onChange={(event) => setEquipmentSearch(event.target.value)}
              placeholder="Search weapons, armour, shields…"
            />
          </label>
          <select
            value={equipmentTypeFilter}
            onChange={(event) => setEquipmentTypeFilter(event.target.value)}
            aria-label="Filter equipment type"
          >
            <option value="all">All equipment</option>
            <option value="weapon">Weapons</option>
            <option value="armor">Armour</option>
            <option value="shield">Shields</option>
          </select>
        </div>
        <div className="clean-sheet-equipment-picker">
          <select
            value={selectedReferenceKey}
            onChange={(event) => setSelectedReferenceKey(event.target.value)}
          >
            <option value="">Select equipment…</option>
            {filteredReferenceCatalog.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedReference || savingItems}
            onClick={() =>
              selectedReference && addReferenceItem(selectedReference, false)
            }
          >
            Add to Inventory
          </button>
          <button
            type="button"
            disabled={
              !selectedReference || savingItems || !selectedReferenceSlot
            }
            onClick={() =>
              selectedReference && addReferenceItem(selectedReference, true)
            }
          >
            Add & Equip
          </button>
        </div>
        {selectedReferenceItem && (
          <div className="clean-sheet-equipment-preview">
            <div>
              <span>Selected</span>
              <strong>{selectedReferenceItem.name}</strong>
              <em>
                {selectedReferenceItem.description ||
                  selectedReferenceEntry?.kind}
              </em>
            </div>
            <div>
              <span>Will use</span>
              <strong>
                {selectedReferenceSlot
                  ? EQUIP_SLOTS.find(
                      ([slot]) => slot === selectedReferenceSlot,
                    )?.[1] || selectedReferenceSlot
                  : "Inventory only"}
              </strong>
              <em>
                {selectedReferenceAttack
                  ? `${selectedReferenceAttack.attackText} to hit • ${selectedReferenceAttack.damageText} ${selectedReferenceAttack.damageType}`
                  : selectedReferenceAc
                    ? `AC becomes ${selectedReferenceAc}`
                    : "No slot detected"}
              </em>
            </div>
          </div>
        )}
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-inventory-header">
          <div>
            <h2>Carried Items</h2>
            <p>
              Includes starter gear, saved equipment, backpack items, and
              GM-granted items.
            </p>
          </div>
          <input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items…"
          />
        </div>
        <div className="clean-sheet-item-grid">
          {filteredInventory.length ? (
            filteredInventory.map((item, index) => (
              <ItemCard
                key={itemKey(item, index)}
                item={item}
                actions={itemActions(item)}
              />
            ))
          ) : (
            <p className="clean-sheet-empty-note">
              No carried items match your search.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

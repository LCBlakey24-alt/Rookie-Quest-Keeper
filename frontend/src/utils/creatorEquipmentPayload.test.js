import {
  buildCreatorEquipmentPayload,
  calculateCreatedCharacterArmorClass,
} from "./creatorEquipmentPayload";

const itemNames = (items) => items.map((item) => item.name);

describe("creatorEquipmentPayload", () => {
  it("builds usable recommended equipment and equips obvious weapon and shield slots", () => {
    const payload = buildCreatorEquipmentPayload(
      ["Longsword", "Shield"],
      "recommended",
    );

    expect(payload.starting_equipment).toEqual(["Longsword", "Shield"]);
    expect(itemNames(payload.equipment)).toEqual(["Longsword", "Shield"]);
    expect(itemNames(payload.inventory)).toEqual(["Longsword", "Shield"]);
    expect(payload.equipped.mainHand).toEqual(
      expect.objectContaining({ name: "Longsword", equipped_slot: "mainHand" }),
    );
    expect(payload.equipped.shield).toEqual(
      expect.objectContaining({ name: "Shield", equipped_slot: "shield" }),
    );
    expect(payload.equipped.offHand).toBeNull();
    expect(
      calculateCreatedCharacterArmorClass({ dexterity: 14 }, payload),
    ).toBe(16);
  });

  it("keeps ambiguous custom equipment carried but not auto-equipped", () => {
    const payload = buildCreatorEquipmentPayload(
      ["Rope", "Lucky Pebble"],
      "custom",
    );

    expect(payload.starting_equipment).toEqual(["Rope", "Lucky Pebble"]);
    expect(itemNames(payload.inventory)).toEqual(["Rope", "Lucky Pebble"]);
    expect(payload.equipped).toEqual({
      armor: null,
      shield: null,
      mainHand: null,
      offHand: null,
    });
  });

  it("saves starting gold mode without starter item objects", () => {
    const payload = buildCreatorEquipmentPayload(["ignored"], "gold");

    expect(payload.starting_equipment).toEqual([
      "Starting gold instead of equipment — confirm shopping with GM",
    ]);
    expect(payload.currency.gold).toBe(10);
    expect(payload.gold).toBe(10);
    expect(payload.equipment).toEqual([]);
    expect(payload.inventory).toEqual([]);
  });

  it("deduplicates duplicate item names", () => {
    const payload = buildCreatorEquipmentPayload(
      ["Longsword", "longsword", "Shield", "Shield"],
      "recommended",
    );

    expect(itemNames(payload.inventory)).toEqual(["Longsword", "Shield"]);
    expect(itemNames(payload.equipment)).toEqual(["Longsword", "Shield"]);
  });
});

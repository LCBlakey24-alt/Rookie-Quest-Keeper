// Shared equipment rules for the character sheet and builder.
// This is intentionally SRD/basic-compatible and avoids copying protected item text.

export const WEAPON_RULES = {
  Club: { category: 'simple melee', damage: '1d4', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: ['light'] },
  Dagger: { category: 'simple melee', damage: '1d4', damageType: 'piercing', ability: 'finesse', range: 'Melee / 20/60 ft', properties: ['finesse', 'light', 'thrown'] },
  Greatclub: { category: 'simple melee', damage: '1d8', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: ['two-handed'] },
  Handaxe: { category: 'simple melee', damage: '1d6', damageType: 'slashing', ability: 'strength', range: 'Melee / 20/60 ft', properties: ['light', 'thrown'] },
  Javelin: { category: 'simple melee', damage: '1d6', damageType: 'piercing', ability: 'strength', range: 'Melee / 30/120 ft', properties: ['thrown'] },
  LightHammer: { name: 'Light Hammer', category: 'simple melee', damage: '1d4', damageType: 'bludgeoning', ability: 'strength', range: 'Melee / 20/60 ft', properties: ['light', 'thrown'] },
  Mace: { category: 'simple melee', damage: '1d6', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: [] },
  Quarterstaff: { category: 'simple melee', damage: '1d6', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: ['versatile d8'] },
  Sickle: { category: 'simple melee', damage: '1d4', damageType: 'slashing', ability: 'strength', range: 'Melee', properties: ['light'] },
  Spear: { category: 'simple melee', damage: '1d6', damageType: 'piercing', ability: 'strength', range: 'Melee / 20/60 ft', properties: ['thrown', 'versatile d8'] },
  LightCrossbow: { name: 'Light Crossbow', category: 'simple ranged', damage: '1d8', damageType: 'piercing', ability: 'dexterity', range: '80/320 ft', properties: ['ammunition', 'loading', 'two-handed'] },
  Dart: { category: 'simple ranged', damage: '1d4', damageType: 'piercing', ability: 'dexterity', range: '20/60 ft', properties: ['finesse', 'thrown'] },
  Shortbow: { category: 'simple ranged', damage: '1d6', damageType: 'piercing', ability: 'dexterity', range: '80/320 ft', properties: ['ammunition', 'two-handed'] },
  Sling: { category: 'simple ranged', damage: '1d4', damageType: 'bludgeoning', ability: 'dexterity', range: '30/120 ft', properties: ['ammunition'] },

  Battleaxe: { category: 'martial melee', damage: '1d8', damageType: 'slashing', ability: 'strength', range: 'Melee', properties: ['versatile d10'] },
  Flail: { category: 'martial melee', damage: '1d8', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: [] },
  Glaive: { category: 'martial melee', damage: '1d10', damageType: 'slashing', ability: 'strength', range: 'Reach', properties: ['heavy', 'reach', 'two-handed'] },
  Greataxe: { category: 'martial melee', damage: '1d12', damageType: 'slashing', ability: 'strength', range: 'Melee', properties: ['heavy', 'two-handed'] },
  Greatsword: { category: 'martial melee', damage: '2d6', damageType: 'slashing', ability: 'strength', range: 'Melee', properties: ['heavy', 'two-handed'] },
  Halberd: { category: 'martial melee', damage: '1d10', damageType: 'slashing', ability: 'strength', range: 'Reach', properties: ['heavy', 'reach', 'two-handed'] },
  Lance: { category: 'martial melee', damage: '1d12', damageType: 'piercing', ability: 'strength', range: 'Reach', properties: ['reach', 'special'] },
  Longsword: { category: 'martial melee', damage: '1d8', damageType: 'slashing', ability: 'strength', range: 'Melee', properties: ['versatile d10'] },
  Maul: { category: 'martial melee', damage: '2d6', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: ['heavy', 'two-handed'] },
  Morningstar: { category: 'martial melee', damage: '1d8', damageType: 'piercing', ability: 'strength', range: 'Melee', properties: [] },
  Pike: { category: 'martial melee', damage: '1d10', damageType: 'piercing', ability: 'strength', range: 'Reach', properties: ['heavy', 'reach', 'two-handed'] },
  Rapier: { category: 'martial melee', damage: '1d8', damageType: 'piercing', ability: 'finesse', range: 'Melee', properties: ['finesse'] },
  Scimitar: { category: 'martial melee', damage: '1d6', damageType: 'slashing', ability: 'finesse', range: 'Melee', properties: ['finesse', 'light'] },
  Shortsword: { category: 'martial melee', damage: '1d6', damageType: 'piercing', ability: 'finesse', range: 'Melee', properties: ['finesse', 'light'] },
  Trident: { category: 'martial melee', damage: '1d6', damageType: 'piercing', ability: 'strength', range: 'Melee / 20/60 ft', properties: ['thrown', 'versatile d8'] },
  WarPick: { name: 'War Pick', category: 'martial melee', damage: '1d8', damageType: 'piercing', ability: 'strength', range: 'Melee', properties: [] },
  Warhammer: { category: 'martial melee', damage: '1d8', damageType: 'bludgeoning', ability: 'strength', range: 'Melee', properties: ['versatile d10'] },
  Whip: { category: 'martial melee', damage: '1d4', damageType: 'slashing', ability: 'finesse', range: 'Reach', properties: ['finesse', 'reach'] },
  Blowgun: { category: 'martial ranged', damage: '1', damageType: 'piercing', ability: 'dexterity', range: '25/100 ft', properties: ['ammunition', 'loading'] },
  HandCrossbow: { name: 'Hand Crossbow', category: 'martial ranged', damage: '1d6', damageType: 'piercing', ability: 'dexterity', range: '30/120 ft', properties: ['ammunition', 'light', 'loading'] },
  HeavyCrossbow: { name: 'Heavy Crossbow', category: 'martial ranged', damage: '1d10', damageType: 'piercing', ability: 'dexterity', range: '100/400 ft', properties: ['ammunition', 'heavy', 'loading', 'two-handed'] },
  Longbow: { category: 'martial ranged', damage: '1d8', damageType: 'piercing', ability: 'dexterity', range: '150/600 ft', properties: ['ammunition', 'heavy', 'two-handed'] },
  Net: { category: 'martial ranged', damage: '0', damageType: 'special', ability: 'dexterity', range: '5/15 ft', properties: ['special', 'thrown'] },
};

export function normaliseEquipmentName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findWeaponRule(itemOrName) {
  const rawName = typeof itemOrName === 'string'
    ? itemOrName
    : itemOrName?.name || itemOrName?.item_name || itemOrName?.label || itemOrName?.title || '';
  const normalised = normaliseEquipmentName(rawName);
  const entries = Object.entries(WEAPON_RULES);
  const exact = entries.find(([key, value]) => normaliseEquipmentName(value.name || key) === normalised);
  if (exact) return { key: exact[0], ...exact[1], name: exact[1].name || exact[0] };
  const fuzzy = entries.find(([key, value]) => normalised.includes(normaliseEquipmentName(value.name || key)));
  if (fuzzy) return { key: fuzzy[0], ...fuzzy[1], name: fuzzy[1].name || fuzzy[0] };
  return null;
}

export function getWeaponAbilityMod(rule, strengthMod, dexterityMod) {
  if (!rule) return Math.max(strengthMod, dexterityMod);
  if (rule.ability === 'strength') return strengthMod;
  if (rule.ability === 'dexterity') return dexterityMod;
  if (rule.ability === 'finesse') return Math.max(strengthMod, dexterityMod);
  return Math.max(strengthMod, dexterityMod);
}

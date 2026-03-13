// SRD/OGL-Safe Equipment Database for D&D 5e
// Contains weapons, armor, adventuring gear, and tools

// ==================== WEAPONS ====================
export const WEAPONS = {
  // Simple Melee Weapons
  simple_melee: [
    { id: 'club', name: 'Club', damage: '1d4', damageType: 'bludgeoning', properties: ['light'], weight: 2, cost: '1 sp', category: 'simple_melee' },
    { id: 'dagger', name: 'Dagger', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown'], range: '20/60', weight: 1, cost: '2 gp', category: 'simple_melee' },
    { id: 'greatclub', name: 'Greatclub', damage: '1d8', damageType: 'bludgeoning', properties: ['two-handed'], weight: 10, cost: '2 sp', category: 'simple_melee' },
    { id: 'handaxe', name: 'Handaxe', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown'], range: '20/60', weight: 2, cost: '5 gp', category: 'simple_melee' },
    { id: 'javelin', name: 'Javelin', damage: '1d6', damageType: 'piercing', properties: ['thrown'], range: '30/120', weight: 2, cost: '5 sp', category: 'simple_melee' },
    { id: 'light_hammer', name: 'Light Hammer', damage: '1d4', damageType: 'bludgeoning', properties: ['light', 'thrown'], range: '20/60', weight: 2, cost: '2 gp', category: 'simple_melee' },
    { id: 'mace', name: 'Mace', damage: '1d6', damageType: 'bludgeoning', properties: [], weight: 4, cost: '5 gp', category: 'simple_melee' },
    { id: 'quarterstaff', name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', properties: ['versatile'], versatileDamage: '1d8', weight: 4, cost: '2 sp', category: 'simple_melee' },
    { id: 'sickle', name: 'Sickle', damage: '1d4', damageType: 'slashing', properties: ['light'], weight: 2, cost: '1 gp', category: 'simple_melee' },
    { id: 'spear', name: 'Spear', damage: '1d6', damageType: 'piercing', properties: ['thrown', 'versatile'], versatileDamage: '1d8', range: '20/60', weight: 3, cost: '1 gp', category: 'simple_melee' }
  ],
  
  // Simple Ranged Weapons
  simple_ranged: [
    { id: 'light_crossbow', name: 'Light Crossbow', damage: '1d8', damageType: 'piercing', properties: ['ammunition', 'loading', 'two-handed'], range: '80/320', weight: 5, cost: '25 gp', category: 'simple_ranged' },
    { id: 'dart', name: 'Dart', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'thrown'], range: '20/60', weight: 0.25, cost: '5 cp', category: 'simple_ranged' },
    { id: 'shortbow', name: 'Shortbow', damage: '1d6', damageType: 'piercing', properties: ['ammunition', 'two-handed'], range: '80/320', weight: 2, cost: '25 gp', category: 'simple_ranged' },
    { id: 'sling', name: 'Sling', damage: '1d4', damageType: 'bludgeoning', properties: ['ammunition'], range: '30/120', weight: 0, cost: '1 sp', category: 'simple_ranged' }
  ],
  
  // Martial Melee Weapons
  martial_melee: [
    { id: 'battleaxe', name: 'Battleaxe', damage: '1d8', damageType: 'slashing', properties: ['versatile'], versatileDamage: '1d10', weight: 4, cost: '10 gp', category: 'martial_melee' },
    { id: 'flail', name: 'Flail', damage: '1d8', damageType: 'bludgeoning', properties: [], weight: 2, cost: '10 gp', category: 'martial_melee' },
    { id: 'glaive', name: 'Glaive', damage: '1d10', damageType: 'slashing', properties: ['heavy', 'reach', 'two-handed'], weight: 6, cost: '20 gp', category: 'martial_melee' },
    { id: 'greataxe', name: 'Greataxe', damage: '1d12', damageType: 'slashing', properties: ['heavy', 'two-handed'], weight: 7, cost: '30 gp', category: 'martial_melee' },
    { id: 'greatsword', name: 'Greatsword', damage: '2d6', damageType: 'slashing', properties: ['heavy', 'two-handed'], weight: 6, cost: '50 gp', category: 'martial_melee' },
    { id: 'halberd', name: 'Halberd', damage: '1d10', damageType: 'slashing', properties: ['heavy', 'reach', 'two-handed'], weight: 6, cost: '20 gp', category: 'martial_melee' },
    { id: 'lance', name: 'Lance', damage: '1d12', damageType: 'piercing', properties: ['reach', 'special'], weight: 6, cost: '10 gp', category: 'martial_melee' },
    { id: 'longsword', name: 'Longsword', damage: '1d8', damageType: 'slashing', properties: ['versatile'], versatileDamage: '1d10', weight: 3, cost: '15 gp', category: 'martial_melee' },
    { id: 'maul', name: 'Maul', damage: '2d6', damageType: 'bludgeoning', properties: ['heavy', 'two-handed'], weight: 10, cost: '10 gp', category: 'martial_melee' },
    { id: 'morningstar', name: 'Morningstar', damage: '1d8', damageType: 'piercing', properties: [], weight: 4, cost: '15 gp', category: 'martial_melee' },
    { id: 'pike', name: 'Pike', damage: '1d10', damageType: 'piercing', properties: ['heavy', 'reach', 'two-handed'], weight: 18, cost: '5 gp', category: 'martial_melee' },
    { id: 'rapier', name: 'Rapier', damage: '1d8', damageType: 'piercing', properties: ['finesse'], weight: 2, cost: '25 gp', category: 'martial_melee' },
    { id: 'scimitar', name: 'Scimitar', damage: '1d6', damageType: 'slashing', properties: ['finesse', 'light'], weight: 3, cost: '25 gp', category: 'martial_melee' },
    { id: 'shortsword', name: 'Shortsword', damage: '1d6', damageType: 'piercing', properties: ['finesse', 'light'], weight: 2, cost: '10 gp', category: 'martial_melee' },
    { id: 'trident', name: 'Trident', damage: '1d6', damageType: 'piercing', properties: ['thrown', 'versatile'], versatileDamage: '1d8', range: '20/60', weight: 4, cost: '5 gp', category: 'martial_melee' },
    { id: 'war_pick', name: 'War Pick', damage: '1d8', damageType: 'piercing', properties: [], weight: 2, cost: '5 gp', category: 'martial_melee' },
    { id: 'warhammer', name: 'Warhammer', damage: '1d8', damageType: 'bludgeoning', properties: ['versatile'], versatileDamage: '1d10', weight: 2, cost: '15 gp', category: 'martial_melee' },
    { id: 'whip', name: 'Whip', damage: '1d4', damageType: 'slashing', properties: ['finesse', 'reach'], weight: 3, cost: '2 gp', category: 'martial_melee' }
  ],
  
  // Martial Ranged Weapons
  martial_ranged: [
    { id: 'blowgun', name: 'Blowgun', damage: '1', damageType: 'piercing', properties: ['ammunition', 'loading'], range: '25/100', weight: 1, cost: '10 gp', category: 'martial_ranged' },
    { id: 'hand_crossbow', name: 'Hand Crossbow', damage: '1d6', damageType: 'piercing', properties: ['ammunition', 'light', 'loading'], range: '30/120', weight: 3, cost: '75 gp', category: 'martial_ranged' },
    { id: 'heavy_crossbow', name: 'Heavy Crossbow', damage: '1d10', damageType: 'piercing', properties: ['ammunition', 'heavy', 'loading', 'two-handed'], range: '100/400', weight: 18, cost: '50 gp', category: 'martial_ranged' },
    { id: 'longbow', name: 'Longbow', damage: '1d8', damageType: 'piercing', properties: ['ammunition', 'heavy', 'two-handed'], range: '150/600', weight: 2, cost: '50 gp', category: 'martial_ranged' },
    { id: 'net', name: 'Net', damage: '0', damageType: 'none', properties: ['special', 'thrown'], range: '5/15', weight: 3, cost: '1 gp', category: 'martial_ranged' }
  ]
};

// Flatten weapons into single array for easy lookup
export const ALL_WEAPONS = [
  ...WEAPONS.simple_melee,
  ...WEAPONS.simple_ranged,
  ...WEAPONS.martial_melee,
  ...WEAPONS.martial_ranged
];

// ==================== ARMOR ====================
export const ARMOR = {
  light: [
    { id: 'padded', name: 'Padded Armor', ac: 11, acBonus: 'dex', maxDexBonus: null, stealthDisadvantage: true, weight: 8, cost: '5 gp', category: 'light' },
    { id: 'leather', name: 'Leather Armor', ac: 11, acBonus: 'dex', maxDexBonus: null, stealthDisadvantage: false, weight: 10, cost: '10 gp', category: 'light' },
    { id: 'studded_leather', name: 'Studded Leather', ac: 12, acBonus: 'dex', maxDexBonus: null, stealthDisadvantage: false, weight: 13, cost: '45 gp', category: 'light' }
  ],
  medium: [
    { id: 'hide', name: 'Hide Armor', ac: 12, acBonus: 'dex', maxDexBonus: 2, stealthDisadvantage: false, weight: 12, cost: '10 gp', category: 'medium' },
    { id: 'chain_shirt', name: 'Chain Shirt', ac: 13, acBonus: 'dex', maxDexBonus: 2, stealthDisadvantage: false, weight: 20, cost: '50 gp', category: 'medium' },
    { id: 'scale_mail', name: 'Scale Mail', ac: 14, acBonus: 'dex', maxDexBonus: 2, stealthDisadvantage: true, weight: 45, cost: '50 gp', category: 'medium' },
    { id: 'breastplate', name: 'Breastplate', ac: 14, acBonus: 'dex', maxDexBonus: 2, stealthDisadvantage: false, weight: 20, cost: '400 gp', category: 'medium' },
    { id: 'half_plate', name: 'Half Plate', ac: 15, acBonus: 'dex', maxDexBonus: 2, stealthDisadvantage: true, weight: 40, cost: '750 gp', category: 'medium' }
  ],
  heavy: [
    { id: 'ring_mail', name: 'Ring Mail', ac: 14, acBonus: null, maxDexBonus: 0, stealthDisadvantage: true, strRequirement: 0, weight: 40, cost: '30 gp', category: 'heavy' },
    { id: 'chain_mail', name: 'Chain Mail', ac: 16, acBonus: null, maxDexBonus: 0, stealthDisadvantage: true, strRequirement: 13, weight: 55, cost: '75 gp', category: 'heavy' },
    { id: 'splint', name: 'Splint Armor', ac: 17, acBonus: null, maxDexBonus: 0, stealthDisadvantage: true, strRequirement: 15, weight: 60, cost: '200 gp', category: 'heavy' },
    { id: 'plate', name: 'Plate Armor', ac: 18, acBonus: null, maxDexBonus: 0, stealthDisadvantage: true, strRequirement: 15, weight: 65, cost: '1500 gp', category: 'heavy' }
  ],
  shields: [
    { id: 'shield', name: 'Shield', acBonus: 2, weight: 6, cost: '10 gp', category: 'shield' }
  ]
};

export const ALL_ARMOR = [
  ...ARMOR.light,
  ...ARMOR.medium,
  ...ARMOR.heavy,
  ...ARMOR.shields
];

// ==================== ADVENTURING GEAR ====================
export const ADVENTURING_GEAR = [
  { id: 'backpack', name: 'Backpack', cost: '2 gp', weight: 5, description: 'Holds 30 lbs or 1 cubic foot' },
  { id: 'bedroll', name: 'Bedroll', cost: '1 gp', weight: 7, description: 'Sleeping roll' },
  { id: 'bell', name: 'Bell', cost: '1 gp', weight: 0, description: 'Small bell' },
  { id: 'blanket', name: 'Blanket', cost: '5 sp', weight: 3, description: 'Warm blanket' },
  { id: 'candle', name: 'Candle', cost: '1 cp', weight: 0, description: '5 ft dim light for 1 hour' },
  { id: 'chest', name: 'Chest', cost: '5 gp', weight: 25, description: 'Holds 12 cubic feet' },
  { id: 'climbers_kit', name: "Climber's Kit", cost: '25 gp', weight: 12, description: 'Includes pitons, boot tips, gloves, harness' },
  { id: 'clothes_common', name: 'Clothes, Common', cost: '5 sp', weight: 3, description: 'Common clothing' },
  { id: 'clothes_fine', name: 'Clothes, Fine', cost: '15 gp', weight: 6, description: 'Fine clothing' },
  { id: 'clothes_travelers', name: "Clothes, Traveler's", cost: '2 gp', weight: 4, description: 'Travel clothing' },
  { id: 'component_pouch', name: 'Component Pouch', cost: '25 gp', weight: 2, description: 'Holds spell components' },
  { id: 'crowbar', name: 'Crowbar', cost: '2 gp', weight: 5, description: 'Advantage on Strength checks to pry' },
  { id: 'flask', name: 'Flask', cost: '2 cp', weight: 1, description: 'Holds 1 pint' },
  { id: 'grappling_hook', name: 'Grappling Hook', cost: '2 gp', weight: 4, description: 'Metal hook' },
  { id: 'hammer', name: 'Hammer', cost: '1 gp', weight: 3, description: 'Standard hammer' },
  { id: 'healers_kit', name: "Healer's Kit", cost: '5 gp', weight: 3, description: '10 uses, stabilize creatures' },
  { id: 'holy_symbol', name: 'Holy Symbol', cost: '5 gp', weight: 1, description: 'Spellcasting focus for divine casters' },
  { id: 'hourglass', name: 'Hourglass', cost: '25 gp', weight: 1, description: 'Measures time' },
  { id: 'ink', name: 'Ink (1 oz)', cost: '10 gp', weight: 0, description: 'Writing ink' },
  { id: 'ink_pen', name: 'Ink Pen', cost: '2 cp', weight: 0, description: 'Writing pen' },
  { id: 'lamp', name: 'Lamp', cost: '5 sp', weight: 1, description: '15 ft bright, 30 ft dim light' },
  { id: 'lantern_bullseye', name: 'Lantern, Bullseye', cost: '10 gp', weight: 2, description: '60 ft cone bright, 60 ft dim' },
  { id: 'lantern_hooded', name: 'Lantern, Hooded', cost: '5 gp', weight: 2, description: '30 ft bright, 30 ft dim' },
  { id: 'lock', name: 'Lock', cost: '10 gp', weight: 1, description: 'DC 15 to pick' },
  { id: 'magnifying_glass', name: 'Magnifying Glass', cost: '100 gp', weight: 0, description: 'Start fires, examine small items' },
  { id: 'manacles', name: 'Manacles', cost: '2 gp', weight: 6, description: 'DC 20 to escape or break' },
  { id: 'mess_kit', name: 'Mess Kit', cost: '2 sp', weight: 1, description: 'Eating utensils' },
  { id: 'mirror_steel', name: 'Mirror, Steel', cost: '5 gp', weight: 0.5, description: 'Small steel mirror' },
  { id: 'oil', name: 'Oil (flask)', cost: '1 sp', weight: 1, description: '5 ft fire damage, 5 ft dim light' },
  { id: 'paper', name: 'Paper (sheet)', cost: '2 sp', weight: 0, description: 'Writing paper' },
  { id: 'parchment', name: 'Parchment (sheet)', cost: '1 sp', weight: 0, description: 'Writing parchment' },
  { id: 'piton', name: 'Piton', cost: '5 cp', weight: 0.25, description: 'Iron spike' },
  { id: 'pole', name: 'Pole (10 ft)', cost: '5 cp', weight: 7, description: '10-foot wooden pole' },
  { id: 'potion_healing', name: 'Potion of Healing', cost: '50 gp', weight: 0.5, description: 'Restores 2d4+2 HP', consumable: true, effect: { type: 'heal', dice: '2d4+2' } },
  { id: 'pouch', name: 'Pouch', cost: '5 sp', weight: 1, description: 'Holds 6 lbs' },
  { id: 'rations', name: 'Rations (1 day)', cost: '5 sp', weight: 2, description: 'One day of food' },
  { id: 'rope_hempen', name: 'Rope, Hempen (50 ft)', cost: '1 gp', weight: 10, description: '2 HP, DC 17 to break' },
  { id: 'rope_silk', name: 'Rope, Silk (50 ft)', cost: '10 gp', weight: 5, description: '4 HP, DC 17 to break' },
  { id: 'sack', name: 'Sack', cost: '1 cp', weight: 0.5, description: 'Holds 30 lbs' },
  { id: 'spellbook', name: 'Spellbook', cost: '50 gp', weight: 3, description: 'Wizard spellbook, 100 pages' },
  { id: 'spyglass', name: 'Spyglass', cost: '1000 gp', weight: 1, description: 'Objects appear twice as close' },
  { id: 'tent', name: 'Tent, Two-Person', cost: '2 gp', weight: 20, description: 'Sleeps two' },
  { id: 'tinderbox', name: 'Tinderbox', cost: '5 sp', weight: 1, description: 'Start fires' },
  { id: 'torch', name: 'Torch', cost: '1 cp', weight: 1, description: '20 ft bright, 20 ft dim for 1 hour' },
  { id: 'waterskin', name: 'Waterskin', cost: '2 sp', weight: 5, description: 'Holds 4 pints' },
  { id: 'whetstone', name: 'Whetstone', cost: '1 cp', weight: 1, description: 'Sharpen blades' }
];

// ==================== TOOLS ====================
export const TOOLS = {
  artisan: [
    { id: 'alchemists_supplies', name: "Alchemist's Supplies", cost: '50 gp', weight: 8, description: 'Create alchemical items' },
    { id: 'brewers_supplies', name: "Brewer's Supplies", cost: '20 gp', weight: 9, description: 'Brew beverages' },
    { id: 'calligraphers_supplies', name: "Calligrapher's Supplies", cost: '10 gp', weight: 5, description: 'Write beautifully' },
    { id: 'carpenters_tools', name: "Carpenter's Tools", cost: '8 gp', weight: 6, description: 'Work with wood' },
    { id: 'cartographers_tools', name: "Cartographer's Tools", cost: '15 gp', weight: 6, description: 'Create maps' },
    { id: 'cobblers_tools', name: "Cobbler's Tools", cost: '5 gp', weight: 5, description: 'Make and repair shoes' },
    { id: 'cooks_utensils', name: "Cook's Utensils", cost: '1 gp', weight: 8, description: 'Prepare food' },
    { id: 'glassblowers_tools', name: "Glassblower's Tools", cost: '30 gp', weight: 5, description: 'Work with glass' },
    { id: 'jewelers_tools', name: "Jeweler's Tools", cost: '25 gp', weight: 2, description: 'Work with gems' },
    { id: 'leatherworkers_tools', name: "Leatherworker's Tools", cost: '5 gp', weight: 5, description: 'Work with leather' },
    { id: 'masons_tools', name: "Mason's Tools", cost: '10 gp', weight: 8, description: 'Work with stone' },
    { id: 'painters_supplies', name: "Painter's Supplies", cost: '10 gp', weight: 5, description: 'Create paintings' },
    { id: 'potters_tools', name: "Potter's Tools", cost: '10 gp', weight: 3, description: 'Create pottery' },
    { id: 'smiths_tools', name: "Smith's Tools", cost: '20 gp', weight: 8, description: 'Work with metal' },
    { id: 'tinkers_tools', name: "Tinker's Tools", cost: '50 gp', weight: 10, description: 'Repair items' },
    { id: 'weavers_tools', name: "Weaver's Tools", cost: '1 gp', weight: 5, description: 'Create textiles' },
    { id: 'woodcarvers_tools', name: "Woodcarver's Tools", cost: '1 gp', weight: 5, description: 'Carve wood' }
  ],
  gaming: [
    { id: 'dice_set', name: 'Dice Set', cost: '1 sp', weight: 0, description: 'Gaming dice' },
    { id: 'playing_cards', name: 'Playing Card Set', cost: '5 sp', weight: 0, description: 'Deck of cards' }
  ],
  musical: [
    { id: 'bagpipes', name: 'Bagpipes', cost: '30 gp', weight: 6, description: 'Wind instrument' },
    { id: 'drum', name: 'Drum', cost: '6 gp', weight: 3, description: 'Percussion' },
    { id: 'dulcimer', name: 'Dulcimer', cost: '25 gp', weight: 10, description: 'Stringed instrument' },
    { id: 'flute', name: 'Flute', cost: '2 gp', weight: 1, description: 'Wind instrument' },
    { id: 'horn', name: 'Horn', cost: '3 gp', weight: 2, description: 'Brass instrument' },
    { id: 'lute', name: 'Lute', cost: '35 gp', weight: 2, description: 'Stringed instrument' },
    { id: 'lyre', name: 'Lyre', cost: '30 gp', weight: 2, description: 'Stringed instrument' },
    { id: 'pan_flute', name: 'Pan Flute', cost: '12 gp', weight: 2, description: 'Wind instrument' },
    { id: 'shawm', name: 'Shawm', cost: '2 gp', weight: 1, description: 'Wind instrument' },
    { id: 'viol', name: 'Viol', cost: '30 gp', weight: 1, description: 'Stringed instrument' }
  ],
  other: [
    { id: 'disguise_kit', name: 'Disguise Kit', cost: '25 gp', weight: 3, description: 'Create disguises' },
    { id: 'forgery_kit', name: 'Forgery Kit', cost: '15 gp', weight: 5, description: 'Create forgeries' },
    { id: 'herbalism_kit', name: 'Herbalism Kit', cost: '5 gp', weight: 3, description: 'Create herbal remedies' },
    { id: 'navigators_tools', name: "Navigator's Tools", cost: '25 gp', weight: 2, description: 'Navigate by stars' },
    { id: 'poisoners_kit', name: "Poisoner's Kit", cost: '50 gp', weight: 2, description: 'Create and identify poisons' },
    { id: 'thieves_tools', name: "Thieves' Tools", cost: '25 gp', weight: 1, description: 'Pick locks and disarm traps' }
  ]
};

export const ALL_TOOLS = [
  ...TOOLS.artisan,
  ...TOOLS.gaming,
  ...TOOLS.musical,
  ...TOOLS.other
];

// ==================== PACKS (STARTING EQUIPMENT) ====================
export const EQUIPMENT_PACKS = {
  burglar: {
    name: "Burglar's Pack",
    cost: '16 gp',
    contents: ['backpack', 'bag_of_ball_bearings', 'string', 'bell', 'candle', 'candle', 'candle', 'candle', 'candle', 'crowbar', 'hammer', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'lantern_hooded', 'oil', 'oil', 'rations', 'rations', 'rations', 'rations', 'rations', 'tinderbox', 'waterskin', 'rope_hempen']
  },
  diplomat: {
    name: "Diplomat's Pack",
    cost: '39 gp',
    contents: ['chest', 'case_map', 'case_map', 'clothes_fine', 'ink', 'ink_pen', 'lamp', 'oil', 'oil', 'paper', 'paper', 'paper', 'paper', 'paper', 'perfume', 'sealing_wax', 'soap']
  },
  dungeoneer: {
    name: "Dungeoneer's Pack",
    cost: '12 gp',
    contents: ['backpack', 'crowbar', 'hammer', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'piton', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'tinderbox', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'waterskin', 'rope_hempen']
  },
  entertainer: {
    name: "Entertainer's Pack",
    cost: '40 gp',
    contents: ['backpack', 'bedroll', 'clothes_costume', 'clothes_costume', 'candle', 'candle', 'candle', 'candle', 'candle', 'rations', 'rations', 'rations', 'rations', 'rations', 'waterskin', 'disguise_kit']
  },
  explorer: {
    name: "Explorer's Pack",
    cost: '10 gp',
    contents: ['backpack', 'bedroll', 'mess_kit', 'tinderbox', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'torch', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'rations', 'waterskin', 'rope_hempen']
  },
  priest: {
    name: "Priest's Pack",
    cost: '19 gp',
    contents: ['backpack', 'blanket', 'candle', 'candle', 'candle', 'candle', 'candle', 'candle', 'candle', 'candle', 'candle', 'candle', 'tinderbox', 'alms_box', 'incense', 'incense', 'censer', 'vestments', 'rations', 'rations', 'waterskin']
  },
  scholar: {
    name: "Scholar's Pack",
    cost: '40 gp',
    contents: ['backpack', 'book_lore', 'ink', 'ink_pen', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'parchment', 'bag_sand', 'knife_small']
  }
};

// ==================== CLASS STARTING EQUIPMENT ====================
export const CLASS_STARTING_EQUIPMENT = {
  Barbarian: {
    choices: [
      { options: [{ item: 'greataxe', qty: 1 }, { item: 'any_martial_melee', qty: 1 }] },
      { options: [{ item: 'handaxe', qty: 2 }, { item: 'any_simple', qty: 1 }] }
    ],
    fixed: [
      { item: 'explorer', qty: 1, type: 'pack' },
      { item: 'javelin', qty: 4 }
    ]
  },
  Bard: {
    choices: [
      { options: [{ item: 'rapier', qty: 1 }, { item: 'longsword', qty: 1 }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'diplomat', qty: 1, type: 'pack' }, { item: 'entertainer', qty: 1, type: 'pack' }] },
      { options: [{ item: 'lute', qty: 1 }, { item: 'any_instrument', qty: 1 }] }
    ],
    fixed: [
      { item: 'leather', qty: 1, type: 'armor' },
      { item: 'dagger', qty: 1 }
    ]
  },
  Cleric: {
    choices: [
      { options: [{ item: 'mace', qty: 1 }, { item: 'warhammer', qty: 1, requires: 'martial_weapons' }] },
      { options: [{ item: 'scale_mail', qty: 1, type: 'armor' }, { item: 'leather', qty: 1, type: 'armor' }, { item: 'chain_mail', qty: 1, type: 'armor', requires: 'heavy_armor' }] },
      { options: [{ item: 'light_crossbow', qty: 1, ammo: 20 }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'priest', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'shield', qty: 1, type: 'armor' },
      { item: 'holy_symbol', qty: 1 }
    ]
  },
  Druid: {
    choices: [
      { options: [{ item: 'shield', qty: 1, type: 'armor' }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'scimitar', qty: 1 }, { item: 'any_simple_melee', qty: 1 }] }
    ],
    fixed: [
      { item: 'leather', qty: 1, type: 'armor' },
      { item: 'explorer', qty: 1, type: 'pack' },
      { item: 'druidic_focus', qty: 1 }
    ]
  },
  Fighter: {
    choices: [
      { options: [{ item: 'chain_mail', qty: 1, type: 'armor' }, { item: 'leather', qty: 1, type: 'armor', with: [{ item: 'longbow', qty: 1 }, { item: 'arrows', qty: 20 }] }] },
      { options: [{ item: 'any_martial', qty: 1, with: [{ item: 'shield', qty: 1, type: 'armor' }] }, { item: 'any_martial', qty: 2 }] },
      { options: [{ item: 'light_crossbow', qty: 1, ammo: 20 }, { item: 'handaxe', qty: 2 }] },
      { options: [{ item: 'dungeoneer', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: []
  },
  Monk: {
    choices: [
      { options: [{ item: 'shortsword', qty: 1 }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'dungeoneer', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'dart', qty: 10 }
    ]
  },
  Paladin: {
    choices: [
      { options: [{ item: 'any_martial', qty: 1, with: [{ item: 'shield', qty: 1, type: 'armor' }] }, { item: 'any_martial', qty: 2 }] },
      { options: [{ item: 'javelin', qty: 5 }, { item: 'any_simple_melee', qty: 1 }] },
      { options: [{ item: 'priest', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'chain_mail', qty: 1, type: 'armor' },
      { item: 'holy_symbol', qty: 1 }
    ]
  },
  Ranger: {
    choices: [
      { options: [{ item: 'scale_mail', qty: 1, type: 'armor' }, { item: 'leather', qty: 1, type: 'armor' }] },
      { options: [{ item: 'shortsword', qty: 2 }, { item: 'any_simple_melee', qty: 2 }] },
      { options: [{ item: 'dungeoneer', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'longbow', qty: 1 },
      { item: 'arrows', qty: 20 }
    ]
  },
  Rogue: {
    choices: [
      { options: [{ item: 'rapier', qty: 1 }, { item: 'shortsword', qty: 1 }] },
      { options: [{ item: 'shortbow', qty: 1, ammo: 20 }, { item: 'shortsword', qty: 1 }] },
      { options: [{ item: 'burglar', qty: 1, type: 'pack' }, { item: 'dungeoneer', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'leather', qty: 1, type: 'armor' },
      { item: 'dagger', qty: 2 },
      { item: 'thieves_tools', qty: 1 }
    ]
  },
  Sorcerer: {
    choices: [
      { options: [{ item: 'light_crossbow', qty: 1, ammo: 20 }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'component_pouch', qty: 1 }, { item: 'arcane_focus', qty: 1 }] },
      { options: [{ item: 'dungeoneer', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'dagger', qty: 2 }
    ]
  },
  Warlock: {
    choices: [
      { options: [{ item: 'light_crossbow', qty: 1, ammo: 20 }, { item: 'any_simple', qty: 1 }] },
      { options: [{ item: 'component_pouch', qty: 1 }, { item: 'arcane_focus', qty: 1 }] },
      { options: [{ item: 'scholar', qty: 1, type: 'pack' }, { item: 'dungeoneer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'leather', qty: 1, type: 'armor' },
      { item: 'any_simple', qty: 1 },
      { item: 'dagger', qty: 2 }
    ]
  },
  Wizard: {
    choices: [
      { options: [{ item: 'quarterstaff', qty: 1 }, { item: 'dagger', qty: 1 }] },
      { options: [{ item: 'component_pouch', qty: 1 }, { item: 'arcane_focus', qty: 1 }] },
      { options: [{ item: 'scholar', qty: 1, type: 'pack' }, { item: 'explorer', qty: 1, type: 'pack' }] }
    ],
    fixed: [
      { item: 'spellbook', qty: 1 }
    ]
  }
};

// ==================== HELPER FUNCTIONS ====================

// Get weapon by ID
export const getWeaponById = (id) => ALL_WEAPONS.find(w => w.id === id);

// Get armor by ID
export const getArmorById = (id) => ALL_ARMOR.find(a => a.id === id);

// Get item by ID (searches all categories)
export const getItemById = (id) => {
  return getWeaponById(id) || getArmorById(id) || 
         ADVENTURING_GEAR.find(g => g.id === id) ||
         ALL_TOOLS.find(t => t.id === id);
};

// Calculate attack bonus for a weapon
export const calculateAttackBonus = (weapon, stats, proficiencyBonus, isProficient = true) => {
  const strMod = Math.floor((stats.strength - 10) / 2);
  const dexMod = Math.floor((stats.dexterity - 10) / 2);
  
  let abilityMod = strMod;
  if (weapon.properties?.includes('finesse')) {
    abilityMod = Math.max(strMod, dexMod);
  } else if (weapon.category?.includes('ranged')) {
    abilityMod = dexMod;
  }
  
  return abilityMod + (isProficient ? proficiencyBonus : 0);
};

// Calculate damage bonus for a weapon
export const calculateDamageBonus = (weapon, stats) => {
  const strMod = Math.floor((stats.strength - 10) / 2);
  const dexMod = Math.floor((stats.dexterity - 10) / 2);
  
  if (weapon.properties?.includes('finesse')) {
    return Math.max(strMod, dexMod);
  } else if (weapon.category?.includes('ranged')) {
    return dexMod;
  }
  return strMod;
};

// Calculate AC from armor
export const calculateAC = (armor, dexMod, hasShield = false) => {
  let ac = 10 + dexMod; // Base unarmored
  
  if (armor) {
    ac = armor.ac;
    if (armor.acBonus === 'dex') {
      const dexBonus = armor.maxDexBonus !== null ? Math.min(dexMod, armor.maxDexBonus) : dexMod;
      ac += dexBonus;
    }
  }
  
  if (hasShield) {
    ac += 2;
  }
  
  return ac;
};

// Export everything
export default {
  WEAPONS,
  ALL_WEAPONS,
  ARMOR,
  ALL_ARMOR,
  ADVENTURING_GEAR,
  TOOLS,
  ALL_TOOLS,
  EQUIPMENT_PACKS,
  CLASS_STARTING_EQUIPMENT,
  getWeaponById,
  getArmorById,
  getItemById,
  calculateAttackBonus,
  calculateDamageBonus,
  calculateAC
};

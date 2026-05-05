// Fantasy TTRPG Items Database - SRD/OGL Safe Content Only
// This database contains only items from the 5e System Reference Document (SRD 5.1)
// under the Creative Commons Attribution 4.0 International License
// 
// GMs can add custom items through the application

// Item type constants
export const ITEM_TYPES = [
  'Ammunition',
  'Heavy Armor',
  'Light Armor',
  'Medium Armor',
  'Melee Weapon',
  'Misc',
  'Potion',
  'Ranged Weapon',
  'Rod',
  'Ring',
  'Scroll',
  'Shield',
  'Staff',
  'Wand',
  'Wondrous Item',
  'Adventuring Gear',
  'Tool'
];

// Rarity options
export const RARITY_OPTIONS = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary'
];

// SRD Magic Items - These are the magic items included in the 5e SRD
export const ITEMS_DATABASE = [
  // === POTIONS (SRD) ===
  {
    name: "Potion of Healing",
    type: "Potion",
    rarity: "Common",
    is_magic: true,
    requires_attunement: false,
    description: "You regain 2d4 + 2 hit points when you drink this potion. The potion's red liquid glimmers when agitated."
  },
  {
    name: "Potion of Greater Healing",
    type: "Potion",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "You regain 4d4 + 4 hit points when you drink this potion."
  },
  {
    name: "Potion of Superior Healing",
    type: "Potion",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You regain 8d4 + 8 hit points when you drink this potion."
  },
  {
    name: "Potion of Supreme Healing",
    type: "Potion",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You regain 10d4 + 20 hit points when you drink this potion."
  },
  {
    name: "Potion of Climbing",
    type: "Potion",
    rarity: "Common",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, you gain a climbing speed equal to your walking speed for 1 hour."
  },
  {
    name: "Potion of Fire Breath",
    type: "Potion",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "After drinking this potion, you can use a bonus action to exhale fire at a target within 30 feet of you. The target must make a DC 13 Dexterity saving throw, taking 4d6 fire damage on a failed save, or half as much on a successful one. The effect ends after you exhale fire three times or 1 hour passes."
  },
  {
    name: "Potion of Flying",
    type: "Potion",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, you gain a flying speed equal to your walking speed for 1 hour and can hover."
  },
  {
    name: "Potion of Giant Strength (Hill)",
    type: "Potion",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, your Strength score becomes 21 for 1 hour."
  },
  {
    name: "Potion of Giant Strength (Frost/Stone)",
    type: "Potion",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, your Strength score becomes 23 for 1 hour."
  },
  {
    name: "Potion of Giant Strength (Fire)",
    type: "Potion",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, your Strength score becomes 25 for 1 hour."
  },
  {
    name: "Potion of Giant Strength (Cloud)",
    type: "Potion",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, your Strength score becomes 27 for 1 hour."
  },
  {
    name: "Potion of Giant Strength (Storm)",
    type: "Potion",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, your Strength score becomes 29 for 1 hour."
  },
  {
    name: "Potion of Heroism",
    type: "Potion",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "For 1 hour after drinking it, you gain 10 temporary hit points and are under the effect of the bless spell (no concentration required)."
  },
  {
    name: "Potion of Invisibility",
    type: "Potion",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "This potion's container looks empty but feels as though it holds liquid. When you drink it, you become invisible for 1 hour. Anything you wear or carry is invisible with you. The effect ends early if you attack or cast a spell."
  },
  {
    name: "Potion of Resistance",
    type: "Potion",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, you gain resistance to one type of damage for 1 hour."
  },
  {
    name: "Potion of Speed",
    type: "Potion",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "When you drink this potion, you gain the effect of the haste spell for 1 minute (no concentration required)."
  },
  {
    name: "Potion of Water Breathing",
    type: "Potion",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "You can breathe underwater for 1 hour after drinking this potion."
  },

  // === RINGS (SRD) ===
  {
    name: "Ring of Protection",
    type: "Ring",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "You gain a +1 bonus to AC and saving throws while wearing this ring."
  },
  {
    name: "Ring of Resistance",
    type: "Ring",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "You have resistance to one damage type while wearing this ring."
  },
  {
    name: "Ring of Spell Storing",
    type: "Ring",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This ring stores spells cast into it, holding them until the attuned wearer uses them. The ring can store up to 5 levels worth of spells at a time."
  },
  {
    name: "Ring of Invisibility",
    type: "Ring",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this ring, you can turn invisible as an action. Anything you are wearing or carrying is invisible with you. You remain invisible until the ring is removed, until you attack or cast a spell, or until you use a bonus action to become visible again."
  },
  {
    name: "Ring of Regeneration",
    type: "Ring",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this ring, you regain 1d6 hit points every 10 minutes, provided you have at least 1 hit point. If you lose a body part, the ring causes the missing part to regrow after 1d6 + 1 days."
  },

  // === WANDS (SRD) ===
  {
    name: "Wand of Magic Missiles",
    type: "Wand",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 or more charges to cast the magic missile spell from it. For 1 charge, you cast the 1st-level version. You can increase the spell slot level by one for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn."
  },
  {
    name: "Wand of Fireballs",
    type: "Wand",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 or more of its charges to cast the fireball spell (save DC 15) from it. For 1 charge, you cast the 3rd-level version. You can increase the spell slot level by one for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn."
  },
  {
    name: "Wand of Lightning Bolts",
    type: "Wand",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 or more of its charges to cast the lightning bolt spell (save DC 15) from it. For 1 charge, you cast the 3rd-level version. You can increase the spell slot level by one for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn."
  },
  {
    name: "Wand of Paralysis",
    type: "Wand",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 charge to cause a thin blue ray to streak from the tip toward a creature you can see within 60 feet. The target must succeed on a DC 15 Constitution saving throw or be paralyzed for 1 minute."
  },
  {
    name: "Wand of Web",
    type: "Wand",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "This wand has 7 charges. While holding it, you can use an action to expend 1 charge to cast the web spell (save DC 15) from it. The wand regains 1d6 + 1 expended charges daily at dawn."
  },

  // === STAFFS (SRD) ===
  {
    name: "Staff of Fire",
    type: "Staff",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "You have resistance to fire damage while you hold this staff. The staff has 10 charges. While holding it, you can use an action to expend charges to cast burning hands (1 charge), fireball (3 charges), or wall of fire (4 charges)."
  },
  {
    name: "Staff of Frost",
    type: "Staff",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "You have resistance to cold damage while you hold this staff. The staff has 10 charges. While holding it, you can use an action to expend charges to cast cone of cold (5 charges), fog cloud (1 charge), ice storm (4 charges), or wall of ice (4 charges)."
  },
  {
    name: "Staff of Healing",
    type: "Staff",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This staff has 10 charges. While holding it, you can use an action to expend 1 or more charges to cast cure wounds (1 charge per spell level, up to 4th), lesser restoration (2 charges), or mass cure wounds (5 charges)."
  },
  {
    name: "Staff of Power",
    type: "Staff",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This staff can be wielded as a magic quarterstaff that grants a +2 bonus to attack and damage rolls. While holding it, you gain a +2 bonus to AC, saving throws, and spell attack rolls. The staff has 20 charges for various spell effects."
  },
  {
    name: "Staff of Striking",
    type: "Staff",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This staff can be wielded as a magic quarterstaff that grants a +3 bonus to attack and damage rolls made with it. The staff has 10 charges. When you hit with a melee attack using it, you can expend up to 3 charges. For each charge you expend, the target takes an extra 1d6 force damage."
  },
  {
    name: "Staff of the Magi",
    type: "Staff",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: true,
    description: "This staff can be wielded as a magic quarterstaff that grants a +2 bonus to attack and damage rolls. While you hold it, you gain a +2 bonus to spell attack rolls. The staff has 50 charges for various powerful spell effects."
  },

  // === RODS (SRD) ===
  {
    name: "Rod of Absorption",
    type: "Rod",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While holding this rod, you can use your reaction to absorb a spell that is targeting only you and not an area of effect. The absorbed spell's effect is canceled, and the spell's energy is stored in the rod."
  },
  {
    name: "Rod of Lordly Might",
    type: "Rod",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: true,
    description: "This rod has a flanged head, and it functions as a magic mace that grants a +3 bonus to attack and damage rolls. The rod has properties associated with six different buttons that are set in a row along the haft."
  },

  // === WONDROUS ITEMS (SRD) ===
  {
    name: "Amulet of Health",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "Your Constitution score is 19 while you wear this amulet. It has no effect on you if your Constitution is already 19 or higher."
  },
  {
    name: "Amulet of Proof against Detection and Location",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this amulet, you are hidden from divination magic. You can't be targeted by such magic or perceived through magical scrying sensors."
  },
  {
    name: "Bag of Holding",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet."
  },
  {
    name: "Belt of Giant Strength (Hill)",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this belt, your Strength score becomes 21. It has no effect on you if your Strength is already 21 or higher."
  },
  {
    name: "Boots of Elvenkind",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "While you wear these boots, your steps make no sound, regardless of the surface you are moving across. You also have advantage on Dexterity (Stealth) checks that rely on moving silently."
  },
  {
    name: "Boots of Speed",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear these boots, you can use a bonus action and click the boots' heels together. If you do, the boots double your walking speed, and any creature that makes an opportunity attack against you has disadvantage on the attack roll. The effect lasts for up to 10 minutes."
  },
  {
    name: "Boots of Striding and Springing",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear these boots, your walking speed becomes 30 feet, unless your walking speed is higher, and your speed isn't reduced if you are encumbered or wearing heavy armor. In addition, you can jump three times the normal distance."
  },
  {
    name: "Bracers of Defense",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing these bracers, you gain a +2 bonus to AC if you are wearing no armor and using no shield."
  },
  {
    name: "Cape of the Mountebank",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "This cape smells faintly of brimstone. While wearing it, you can use it to cast the dimension door spell as an action. This property of the cape can't be used again until the next dawn."
  },
  {
    name: "Cloak of Displacement",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear this cloak, it projects an illusion that makes you appear to be standing in a place near your actual location, causing any creature to have disadvantage on attack rolls against you."
  },
  {
    name: "Cloak of Elvenkind",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear this cloak with its hood up, Wisdom (Perception) checks made to see you have disadvantage, and you have advantage on Dexterity (Stealth) checks made to hide, as the cloak's color shifts to camouflage you."
  },
  {
    name: "Cloak of Protection",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "You gain a +1 bonus to AC and saving throws while you wear this cloak."
  },
  {
    name: "Decanter of Endless Water",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This stoppered flask sloshes when shaken, as if it contains water. You can use an action to remove the stopper and speak one of three command words to produce fresh or salt water."
  },
  {
    name: "Dust of Disappearance",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "Found in a small packet, this powder resembles very fine sand. When you use an action to throw the dust into the air, you and each creature and object within 10 feet of you become invisible for 2d4 minutes."
  },
  {
    name: "Gauntlets of Ogre Power",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "Your Strength score is 19 while you wear these gauntlets. They have no effect on you if your Strength is already 19 or higher."
  },
  {
    name: "Gloves of Missile Snaring",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "These gloves seem to almost meld into your hands when you don them. When a ranged weapon attack hits you while you're wearing them, you can use your reaction to reduce the damage by 1d10 + your Dexterity modifier."
  },
  {
    name: "Goggles of Night",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "While wearing these dark lenses, you have darkvision out to a range of 60 feet. If you already have darkvision, wearing the goggles increases its range by 60 feet."
  },
  {
    name: "Handy Haversack",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "This backpack has a central pouch and two side pouches, each of which is an extradimensional space. Each side pouch can hold up to 20 pounds. The central pouch can hold up to 8 cubic feet or 80 pounds."
  },
  {
    name: "Headband of Intellect",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "Your Intelligence score is 19 while you wear this headband. It has no effect on you if your Intelligence is already 19 or higher."
  },
  {
    name: "Helm of Telepathy",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this helm, you can use an action to cast the detect thoughts spell (save DC 13) from it. As long as you maintain concentration on the spell, you can use a bonus action to send a telepathic message."
  },
  {
    name: "Immovable Rod",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This flat iron rod has a button on one end. You can use an action to press the button, which causes the rod to become magically fixed in place. The rod can hold up to 8,000 pounds of weight."
  },
  {
    name: "Lantern of Revealing",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "While lit, this hooded lantern burns for 6 hours on 1 pint of oil, shedding bright light in a 30-foot radius and dim light for an additional 30 feet. Invisible creatures and objects are visible as long as they are in the lantern's bright light."
  },
  {
    name: "Medallion of Thoughts",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "The medallion has 3 charges. While wearing it, you can use an action and expend 1 charge to cast the detect thoughts spell (save DC 13) from it. The medallion regains 1d3 expended charges daily at dawn."
  },
  {
    name: "Necklace of Fireballs",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "This necklace has 1d6 + 3 beads hanging from it. You can use an action to detach a bead and throw it up to 60 feet away. When it reaches the end of its trajectory, the bead detonates as a 3rd-level fireball spell (save DC 15)."
  },
  {
    name: "Periapt of Health",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "You are immune to contracting any disease while you wear this pendant. If you are already infected with a disease, the effects of the disease are suppressed while you wear the pendant."
  },
  {
    name: "Periapt of Wound Closure",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear this pendant, you stabilize whenever you are dying at the start of your turn. In addition, whenever you roll a Hit Die to regain hit points, double the number of hit points it restores."
  },
  {
    name: "Portable Hole",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "This fine black cloth, soft as silk, is folded up to the dimensions of a handkerchief. It unfolds into a circular sheet 6 feet in diameter. You can use an action to unfold it and place it on or against a solid surface, whereupon it creates an extradimensional hole 10 feet deep."
  },
  {
    name: "Robe of Eyes",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "This robe is adorned with eyelike patterns. While you wear the robe, you gain darkvision out to 120 feet, advantage on Perception checks that rely on sight, and you can see invisible creatures and objects."
  },
  {
    name: "Rope of Climbing",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This 60-foot length of silk rope weighs 3 pounds and can hold up to 3,000 pounds. If you hold one end of the rope and use an action to speak the command word, the rope animates and can climb in any direction at a speed of 10 feet per round."
  },
  {
    name: "Slippers of Spider Climbing",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While you wear these light shoes, you can move up, down, and across vertical surfaces and upside down along ceilings, while leaving your hands free. You have a climbing speed equal to your walking speed."
  },
  {
    name: "Stone of Good Luck",
    type: "Wondrous Item",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: true,
    description: "While this polished agate is on your person, you gain a +1 bonus to ability checks and saving throws."
  },
  {
    name: "Wings of Flying",
    type: "Wondrous Item",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "While wearing this cloak, you can use an action to speak its command word. This turns the cloak into a pair of bat wings or bird wings on your back for 1 hour or until you repeat the command word. The wings give you a flying speed of 60 feet."
  },

  // === MAGIC ARMOR (SRD) ===
  {
    name: "Armor +1",
    type: "Light Armor",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +1 bonus to AC while wearing this armor."
  },
  {
    name: "Armor +2",
    type: "Medium Armor",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +2 bonus to AC while wearing this armor."
  },
  {
    name: "Armor +3",
    type: "Heavy Armor",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +3 bonus to AC while wearing this armor."
  },
  {
    name: "Adamantine Armor",
    type: "Heavy Armor",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "This suit of armor is reinforced with adamantine. While you're wearing it, any critical hit against you becomes a normal hit."
  },
  {
    name: "Mithral Armor",
    type: "Medium Armor",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "Mithral is a light, flexible metal. If the armor normally imposes disadvantage on Dexterity (Stealth) checks or has a Strength requirement, the mithral version of the armor doesn't."
  },
  {
    name: "Shield +1",
    type: "Shield",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "While holding this shield, you have a +1 bonus to AC. This bonus is in addition to the shield's normal bonus to AC."
  },
  {
    name: "Shield +2",
    type: "Shield",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "While holding this shield, you have a +2 bonus to AC. This bonus is in addition to the shield's normal bonus to AC."
  },
  {
    name: "Shield +3",
    type: "Shield",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "While holding this shield, you have a +3 bonus to AC. This bonus is in addition to the shield's normal bonus to AC."
  },

  // === MAGIC WEAPONS (SRD) ===
  {
    name: "Weapon +1",
    type: "Melee Weapon",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +1 bonus to attack and damage rolls made with this magic weapon."
  },
  {
    name: "Weapon +2",
    type: "Melee Weapon",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +2 bonus to attack and damage rolls made with this magic weapon."
  },
  {
    name: "Weapon +3",
    type: "Melee Weapon",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +3 bonus to attack and damage rolls made with this magic weapon."
  },
  {
    name: "Flame Tongue",
    type: "Melee Weapon",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: true,
    description: "You can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. While the sword is ablaze, it deals an extra 2d6 fire damage to any target it hits."
  },
  {
    name: "Frost Brand",
    type: "Melee Weapon",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: true,
    description: "When you hit with an attack using this magic sword, the target takes an extra 1d6 cold damage. In addition, while you hold the sword, you have resistance to fire damage."
  },
  {
    name: "Giant Slayer",
    type: "Melee Weapon",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You gain a +1 bonus to attack and damage rolls made with this magic weapon. When you hit a giant with it, the giant takes an extra 2d6 damage of the weapon's type and must succeed on a DC 15 Strength saving throw or fall prone."
  },
  {
    name: "Vorpal Sword",
    type: "Melee Weapon",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: true,
    description: "You gain a +3 bonus to attack and damage rolls made with this magic weapon. In addition, the weapon ignores resistance to slashing damage. When you roll a 20 on an attack roll with this weapon against a creature that has at least one head, you cut off one of the creature's heads."
  },
  {
    name: "Luck Blade",
    type: "Melee Weapon",
    rarity: "Legendary",
    is_magic: true,
    requires_attunement: true,
    description: "You gain a +1 bonus to attack and damage rolls made with this magic weapon. While the sword is on your person, you also gain a +1 bonus to saving throws. The sword has 1d4-1 charges. While holding it, you can use an action to expend 1 charge to cast wish."
  },

  // === AMMUNITION (SRD) ===
  {
    name: "Ammunition +1",
    type: "Ammunition",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +1 bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical."
  },
  {
    name: "Ammunition +2",
    type: "Ammunition",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +2 bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical."
  },
  {
    name: "Ammunition +3",
    type: "Ammunition",
    rarity: "Very Rare",
    is_magic: true,
    requires_attunement: false,
    description: "You have a +3 bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical."
  },

  // === SCROLLS (SRD) ===
  {
    name: "Spell Scroll (Cantrip)",
    type: "Scroll",
    rarity: "Common",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single spell, written in a mystical cipher. If the spell is on your class's spell list, you can read the scroll and cast its spell without providing any material components."
  },
  {
    name: "Spell Scroll (1st Level)",
    type: "Scroll",
    rarity: "Common",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single 1st-level spell. The spell's saving throw DC is 13 and attack bonus is +5."
  },
  {
    name: "Spell Scroll (2nd Level)",
    type: "Scroll",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single 2nd-level spell. The spell's saving throw DC is 13 and attack bonus is +5."
  },
  {
    name: "Spell Scroll (3rd Level)",
    type: "Scroll",
    rarity: "Uncommon",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single 3rd-level spell. The spell's saving throw DC is 15 and attack bonus is +7."
  },
  {
    name: "Spell Scroll (4th Level)",
    type: "Scroll",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single 4th-level spell. The spell's saving throw DC is 15 and attack bonus is +7."
  },
  {
    name: "Spell Scroll (5th Level)",
    type: "Scroll",
    rarity: "Rare",
    is_magic: true,
    requires_attunement: false,
    description: "A spell scroll bears the words of a single 5th-level spell. The spell's saving throw DC is 17 and attack bonus is +9."
  }
];

// Helper function to get items by type
export const getItemsByType = (type) => ITEMS_DATABASE.filter(item => item.type === type);

// Helper function to get items by rarity
export const getItemsByRarity = (rarity) => ITEMS_DATABASE.filter(item => item.rarity === rarity);

// Helper function to search items
export const searchItems = (query) => {
  const lowerQuery = query.toLowerCase();
  return ITEMS_DATABASE.filter(item => 
    item.name.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery)
  );
};
export const POTIONS = getItemsByType('Potion');
export const MAGIC_ITEMS = ITEMS_DATABASE;

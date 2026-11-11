/**
 * What a character wears and holds, by body slot, as plain rules so every
 * part can be tested.
 *
 * Slots follow the rule for wearing several magic items (the same in the
 * 2014 and 2024 Dungeon Master's Guides): one item of headwear, one cloak,
 * one suit of armour, one pair of gloves or gauntlets, one pair of bracers,
 * one pair of footwear, and up to two rings. Necklaces and belts are one
 * each. Hands hold weapons, a shield or other items; a two-handed weapon
 * takes both.
 *
 * Slot ids keep the names the classic inventory already saves (mainHand,
 * offHand, armor, gauntlets, boots), so existing characters need no change.
 */
import { ADVENTURING_GEAR, ALL_ARMOR, ALL_TOOLS, ALL_WEAPONS } from '@/data/equipmentDatabase';

export const BODY_SLOTS = [
  { id: 'head', label: 'Head', hint: 'Helm, hat, circlet' },
  { id: 'neck', label: 'Neck', hint: 'Amulet, necklace' },
  { id: 'shoulders', label: 'Cloak', hint: 'Cloak, cape, mantle' },
  { id: 'armor', label: 'Armour', hint: 'Body armour' },
  { id: 'mainHand', label: 'Main Hand', hint: 'Weapon or item' },
  { id: 'offHand', label: 'Off Hand', hint: 'Shield, weapon or item' },
  { id: 'gauntlets', label: 'Hands', hint: 'Gloves, gauntlets' },
  { id: 'wrists', label: 'Bracers', hint: 'Bracers' },
  { id: 'waist', label: 'Belt', hint: 'Belt, girdle' },
  { id: 'boots', label: 'Feet', hint: 'Boots, slippers' },
  { id: 'ring1', label: 'Ring', hint: 'Ring' },
  { id: 'ring2', label: 'Ring', hint: 'Ring' },
];

export const ATTUNEMENT_LIMIT = 3;
const HAND_SLOTS = ['mainHand', 'offHand'];
const RINGS = ['ring1', 'ring2'];

const nameOf = (item) => String((typeof item === 'string' ? item : item?.name || item?.item_name) || '').trim();
const textOf = (item) => `${typeof item === 'string' ? '' : `${item?.type || ''} ${item?.item_type || ''} ${item?.category || ''}`} ${nameOf(item)}`.toLowerCase();
const propsOf = (item) => {
  const own = typeof item === 'string' ? [] : [item?.properties, item?.property].flat().filter(Boolean);
  const rule = ALL_WEAPONS.find((weapon) => weapon.name.toLowerCase() === nameOf(item).toLowerCase());
  return [...own, ...(rule?.properties || [])].map((entry) => String(entry).toLowerCase());
};

export function isTwoHanded(item) {
  return propsOf(item).some((entry) => entry.replace(/[^a-z]/g, '') === 'twohanded');
}

export function requiresAttunement(item) {
  return Boolean(item && typeof item === 'object' && (item.attunement_required || item.requires_attunement));
}

export function isAttuned(item) {
  return Boolean(item && typeof item === 'object' && (item.attuned || item.is_attuned));
}

/** The body slots an item can go in, best first. Empty: carried, not worn. */
export function slotsForItem(item) {
  if (!item) return [];
  const text = textOf(item);
  const explicit = typeof item === 'object' ? (item.equip_slot || item.equipped_slot) : '';
  if (explicit === 'shield' || /\bshield\b/.test(text)) return ['offHand'];
  if (/\bring\b/.test(text)) return RINGS;
  if (/amulet|necklace|periapt|medallion|talisman|scarab/.test(text)) return ['neck'];
  if (/cloak|cape|mantle/.test(text)) return ['shoulders'];
  if (/bracer/.test(text)) return ['wrists'];
  if (/glove|gauntlet/.test(text)) return ['gauntlets'];
  if (/boot|slipper|shoe|sandal/.test(text)) return ['boots'];
  if (/belt|girdle/.test(text)) return ['waist'];
  if (/helm|\bhat\b|circlet|headband|crown|diadem|\bcap\b|goggles/.test(text)) return ['head'];
  const isArmourName = ALL_ARMOR.some((armour) => armour.name.toLowerCase() === nameOf(item).toLowerCase() && !/shield/i.test(armour.name));
  if (isArmourName || /\barmou?r\b|chain mail|plate|breastplate|splint|padded|studded|ring mail|scale mail|half plate|hide armou?r|leather armou?r/.test(text)) return ['armor'];
  const isWeapon = ALL_WEAPONS.some((weapon) => weapon.name.toLowerCase() === nameOf(item).toLowerCase())
    || /weapon|sword|bow|crossbow|axe|mace|staff|dagger|spear|lance|hammer|rapier|club|flail|halberd|pike|trident|whip|scimitar|sickle|javelin|dart|sling|wand|rod|orb|focus/.test(text)
    || Boolean(typeof item === 'object' && (item.damage_dice || item.damage));
  if (isWeapon) return isTwoHanded(item) ? ['mainHand'] : HAND_SLOTS;
  if (explicit && BODY_SLOTS.some((slot) => slot.id === explicit)) return [explicit];
  return [];
}

/**
 * Slots that must be emptied to put `item` in `slot`: a two-handed weapon
 * needs the off hand free, and anything in the off hand pushes a two-handed
 * weapon out of the main hand.
 */
export function slotsToClear(equipped = {}, item, slot) {
  if (slot === 'mainHand' && isTwoHanded(item) && equipped.offHand) return ['offHand'];
  if (slot === 'offHand' && equipped.mainHand && isTwoHanded(equipped.mainHand)) return ['mainHand'];
  return [];
}

/** True when the off hand is taken up by a two-handed weapon in the main hand. */
export function offHandBlocked(equipped = {}) {
  return Boolean(equipped.mainHand && isTwoHanded(equipped.mainHand));
}

/* ----------------------------------------------------------------------- */
/* Weight and carrying capacity                                            */
/* ----------------------------------------------------------------------- */

const CATALOGUE = [...ALL_WEAPONS, ...ALL_ARMOR, ...(Array.isArray(ADVENTURING_GEAR) ? ADVENTURING_GEAR : []), ...(Array.isArray(ALL_TOOLS) ? ALL_TOOLS : [])];

/** One item's weight in pounds: its own `weight`, else the catalogue's, else 0. */
export function itemWeight(item) {
  const own = typeof item === 'object' ? Number(item?.weight ?? item?.weight_lb) : NaN;
  if (Number.isFinite(own) && own >= 0) return own;
  const entry = CATALOGUE.find((candidate) => candidate?.name && candidate.name.toLowerCase() === nameOf(item).toLowerCase());
  const listed = Number(entry?.weight);
  return Number.isFinite(listed) ? listed : 0;
}

export const itemQuantity = (item) => Math.max(1, Number((typeof item === 'object' && (item?.quantity ?? item?.qty)) || 1) || 1);

/** Coins weigh 50 to the pound (both editions). */
export function coinWeight(currency = {}) {
  const coins = ['cp', 'sp', 'ep', 'gp', 'pp'].reduce((sum, coin) => sum + (Number(currency?.[coin]) || 0), 0);
  return coins / 50;
}

/** Everything carried, worn and held, plus coins, in pounds (one decimal). */
export function carriedWeight(items = [], currency = {}) {
  const total = items.reduce((sum, item) => sum + itemWeight(item) * itemQuantity(item), 0) + coinWeight(currency);
  return Math.round(total * 10) / 10;
}

/** Carrying capacity: Strength score x 15 lb for a Small or Medium creature. */
export function carryingCapacity(character = {}) {
  const strength = Number(character?.strength ?? 10) || 10;
  return strength * 15;
}

/* ----------------------------------------------------------------------- */
/* Armour Class from worn magic items                                      */
/* ----------------------------------------------------------------------- */

// The few common SRD items whose AC bonus is fixed by name, for items saved
// without an ac_bonus. Everything else must carry its own ac_bonus.
const KNOWN_AC_ITEMS = {
  'ring of protection': 1,
  'cloak of protection': 1,
  'bracers of defense': 2,
  'bracers of defence': 2,
};

const WORN_ACCESSORY_SLOTS = ['head', 'neck', 'shoulders', 'gauntlets', 'wrists', 'waist', 'boots', 'ring1', 'ring2'];

/**
 * AC added by worn magic accessories (not armour or a shield, which the
 * armour rules already count). An item that needs attunement only counts
 * while attuned; Bracers of Defense only without armour or a shield.
 */
export function wornMagicAcBonus(equipped = {}) {
  const wearingArmour = Boolean(equipped.armor || equipped.armour);
  const holdingShield = [equipped.offHand, equipped.shield].some((item) => item && /shield/i.test(textOf(item)));
  return WORN_ACCESSORY_SLOTS.reduce((sum, slot) => {
    const item = equipped[slot];
    if (!item || typeof item !== 'object') return sum;
    if (requiresAttunement(item) && !isAttuned(item)) return sum;
    const name = nameOf(item).toLowerCase();
    const bonus = Number(item.ac_bonus ?? item.acBonus ?? KNOWN_AC_ITEMS[name] ?? 0) || 0;
    if (/bracers of defen[cs]e/.test(name) && (wearingArmour || holdingShield)) return sum;
    return sum + bonus;
  }, 0);
}

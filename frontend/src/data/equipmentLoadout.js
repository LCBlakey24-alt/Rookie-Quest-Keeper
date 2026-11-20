/**
 * What a character wears and holds, by body slot, as plain rules so every
 * part can be tested.
 *
 * The sheet shows only the five slots a character can fill once each and
 * that matter most at the table (owner decision, November 2026): main hand,
 * off hand, armour, boots and helmet. Hands hold weapons, a shield or other
 * items; a two-handed weapon takes both. Rings, amulets, cloaks, bracers,
 * gloves and belts live in the equipment list; a magic one works while the
 * character is attuned to it (at most three at once).
 *
 * Slot ids keep the names the inventory already saves (mainHand, offHand,
 * armor, boots, head). Items a character already wears in an older slot
 * (ring1, neck...) are kept: the sheet lists them with the rest of the gear
 * and they still count.
 */
import { ADVENTURING_GEAR, ALL_ARMOR, ALL_TOOLS, ALL_WEAPONS } from '@/data/equipmentDatabase';

export const BODY_SLOTS = [
  { id: 'mainHand', label: 'Main Hand', hint: 'Weapon or item' },
  { id: 'offHand', label: 'Off Hand', hint: 'Shield, weapon or item' },
  { id: 'armor', label: 'Armour', hint: 'Body armour' },
  { id: 'boots', label: 'Boots', hint: 'Boots, slippers' },
  { id: 'head', label: 'Helmet', hint: 'Helm, hat, circlet' },
];

/** Slots older saves may still use; their items are listed with the gear. */
export const LEGACY_WORN_SLOTS = ['neck', 'shoulders', 'gauntlets', 'wrists', 'waist', 'ring1', 'ring2'];

export const ATTUNEMENT_LIMIT = 3;
const HAND_SLOTS = ['mainHand', 'offHand'];
// Worn accessories with no slot of their own: kept in the equipment list.
const ACCESSORY = /\bring\b|amulet|necklace|periapt|medallion|talisman|scarab|cloak|\bcape\b|mantle|bracer|glove|gauntlet|\bbelt\b|girdle/;

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
  // Homebrew items say what they are; their names can be anything.
  const kind = typeof item === 'object' ? item.homebrew_kind : '';
  if (kind === 'weapon') return isTwoHanded(item) ? ['mainHand'] : HAND_SLOTS;
  if (kind === 'armour') return ['armor'];
  if (kind === 'shield') return ['offHand'];
  const text = textOf(item);
  const explicit = typeof item === 'object' ? (item.equip_slot || item.equipped_slot) : '';
  if (explicit === 'shield' || /\bshield\b/.test(text)) return ['offHand'];
  // Known armour first: "Ring Mail" is armour, not a ring.
  const isArmourName = ALL_ARMOR.some((armour) => armour.name.toLowerCase() === nameOf(item).toLowerCase() && !/shield/i.test(armour.name));
  if (isArmourName || /ring mail/.test(text)) return ['armor'];
  if (ACCESSORY.test(text)) return [];
  if (/boot|slipper|shoe|sandal/.test(text)) return ['boots'];
  if (/helm|\bhat\b|circlet|headband|crown|diadem|\bcap\b|goggles/.test(text)) return ['head'];
  if (/\barmou?r\b|chain mail|plate|breastplate|splint|padded|studded|ring mail|scale mail|half plate|hide armou?r|leather armou?r/.test(text)) return ['armor'];
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

const WORN_ACCESSORY_SLOTS = ['head', 'boots', ...LEGACY_WORN_SLOTS];

const itemKey = (item) => {
  const id = item?.id || item?.item_id || item?.instance_id || '';
  return id ? `id:${id}` : `name:${nameOf(item).toLowerCase()}`;
};

/**
 * AC added by worn magic accessories (not armour or a shield, which the
 * armour rules already count): the helmet and boots slots, any older
 * accessory slot, and -- since rings and cloaks now live in the equipment
 * list -- any accessory in the list the character is attuned to. An item
 * that needs attunement only counts while attuned; Bracers of Defense only
 * without armour or a shield. Each item counts once.
 */
export function wornMagicAcBonus(equipped = {}, inventory = []) {
  const wearingArmour = Boolean(equipped.armor || equipped.armour);
  const holdingShield = [equipped.offHand, equipped.shield].some((item) => item && /shield/i.test(textOf(item)));
  const worn = WORN_ACCESSORY_SLOTS.map((slot) => equipped[slot]).filter((item) => item && typeof item === 'object');
  const listed = (Array.isArray(inventory) ? inventory : []).filter((item) => (
    item && typeof item === 'object' && isAttuned(item) && ACCESSORY.test(textOf(item)) && !/ring mail/.test(textOf(item))
  ));
  const seen = new Set();
  return [...worn, ...listed].reduce((sum, item) => {
    const key = itemKey(item);
    if (seen.has(key)) return sum;
    seen.add(key);
    if (requiresAttunement(item) && !isAttuned(item)) return sum;
    const name = nameOf(item).toLowerCase();
    const bonus = Number(item.ac_bonus ?? item.acBonus ?? KNOWN_AC_ITEMS[name] ?? 0) || 0;
    if (/bracers of defen[cs]e/.test(name) && (wearingArmour || holdingShield)) return sum;
    return sum + bonus;
  }, 0);
}

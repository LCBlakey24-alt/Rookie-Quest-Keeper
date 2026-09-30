import { findWeaponRule, getWeaponAbilityMod } from '@/data/equipmentRules5e';
import { rollDiceNotation } from '@/data/diceRoller';
import { canonicalInventorySlot, getCanonicalEquippedItem } from '@/data/characterInventoryState';

export const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

export function hasSaveProficiency(character, ability) {
  const saves = character?.saving_throw_proficiencies || [];
  const short = ability.slice(0, 3).toLowerCase();
  return saves.some(save => String(save).toLowerCase() === ability || String(save).toLowerCase() === short);
}

export function rollDice(count = 1, sides = 8, modifier = 0, rng = Math.random) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const safeSides = Math.floor(Number(sides) || 0);
  const safeModifier = Number(modifier) || 0;

  // Flat damage is represented internally as Nd1. Preserve that legacy shape
  // without asking the canonical dice engine to invent a one-sided die.
  if (safeSides <= 1) {
    const rolls = Array.from({ length: safeCount }, () => 1);
    const total = Math.max(0, safeCount + safeModifier);
    return {
      rolls,
      total,
      notation: `${safeCount}${safeModifier ? ` ${fmt(safeModifier)}` : ''}`,
    };
  }

  const modifierText = safeModifier ? `${safeModifier > 0 ? '+' : ''}${safeModifier}` : '';
  const notation = `${safeCount}d${safeSides}${modifierText}`;
  const result = rollDiceNotation(notation, { rng });
  return {
    rolls: result.rolls.map(roll => roll.result),
    total: Math.max(0, Number(result.total) || 0),
    notation,
  };
}

export function rollAttackDamage(damage = {}, { critical = false, rng = Math.random } = {}) {
  const count = Math.max(1, Math.floor(Number(damage?.count) || 1));
  const sides = Math.floor(Number(damage?.sides) || 0);
  const modifier = Number(damage?.modifier) || 0;
  const rolledCount = critical && sides > 1 ? count * 2 : count;
  const result = rollDice(rolledCount, sides, modifier, rng);

  return {
    ...result,
    count: rolledCount,
    sides,
    modifier,
    critical: Boolean(critical && sides > 1),
  };
}

function parseDamageDice(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/(\d+)d(\d+)/i);
  if (!match) {
    const flat = Number(text);
    return flat > 0 ? { count: flat, sides: 1 } : null;
  }
  return { count: Number(match[1]), sides: Number(match[2]) };
}

export function normaliseName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z]/g, '');
}

export function getItemName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || item.item_name || item.label || item.title || '';
}

export function isFighter(character) {
  return normaliseName(character?.character_class) === 'fighter';
}

export function getFighterLevel(character) {
  const classLevels = character?.multiclass_levels || character?.class_levels || {};
  const fighterEntry = Object.entries(classLevels).find(([cls]) => normaliseName(cls) === 'fighter');
  if (fighterEntry) return Number(fighterEntry[1]) || 0;
  return isFighter(character) ? Number(character?.level || 1) || 1 : 0;
}

export function getFighterSubclassKey(character) {
  return normaliseName(character?.subclass || '').replace('battlemaster', 'battle_master').replace('eldritchknight', 'eldritch_knight');
}

export function getFighterCriticalRange(character, level) {
  const subclass = getFighterSubclassKey(character);
  if (subclass !== 'champion') return 20;
  if (level >= 15) return 18;
  if (level >= 3) return 19;
  return 20;
}

export function getSuperiorityDie(level) {
  if (level >= 18) return 12;
  if (level >= 10) return 10;
  return 8;
}

export function getItemQuantity(item) {
  if (!item || typeof item === 'string') return null;
  return item.quantity ?? item.qty ?? item.count ?? null;
}

export function consumeConsumableState(character = {}, item) {
  const inventory = [...(character?.inventory || [])];
  const equipment = [...(character?.equipment || [])];
  const inInventory = inventory.includes(item);
  const inEquipment = equipment.includes(item);
  const source = inInventory ? inventory : inEquipment ? equipment : null;

  if (!source) return { inventory, equipment, consumed: false };

  const sourceIndex = source.findIndex(entry => entry === item);
  if (sourceIndex < 0) return { inventory, equipment, consumed: false };

  const stored = source[sourceIndex];
  if (stored && typeof stored === 'object') {
    const quantity = Number(getItemQuantity(stored));
    if (Number.isFinite(quantity) && quantity > 1) {
      source[sourceIndex] = { ...stored, quantity: quantity - 1, qty: quantity - 1 };
    } else {
      source.splice(sourceIndex, 1);
    }
  } else {
    // Legacy characters can store consumables as plain strings. Removing one
    // matching entry prevents those old potions from becoming infinitely reusable.
    source.splice(sourceIndex, 1);
  }

  return { inventory, equipment, consumed: true };
}

export function buildConsumableUseUpdate(character = {}, item, healingTotal = 0) {
  const consumed = consumeConsumableState(character, item);
  const maxHp = Math.max(1, Number(character?.max_hit_points ?? character?.max_hp ?? 10) || 10);
  const rawCurrent = character?.current_hit_points ?? character?.hp;
  const currentHp = rawCurrent === undefined || rawCurrent === null || rawCurrent === ''
    ? maxHp
    : Math.max(0, Math.min(maxHp, Number(rawCurrent) || 0));
  const healing = Math.max(0, Number(healingTotal) || 0);

  return {
    current_hit_points: Math.min(maxHp, currentHp + healing),
    inventory: consumed.inventory,
    equipment: consumed.equipment,
    consumed: consumed.consumed,
  };
}

function isWeaponLike(item) {
  const type = normaliseName(item?.type || item?.category || item?.item_type || '');
  return Boolean(
    type.includes('weapon')
    || findWeaponRule(item)
    || item?.damage
    || item?.damage_dice
    || item?.dice
    || item?.damageDice
  );
}

function isConsumableLike(item) {
  const name = normaliseName(getItemName(item));
  const type = normaliseName(item?.type || item?.category || item?.item_type || '');
  return type.includes('consumable') || type.includes('potion') || name.includes('potion') || name.includes('healing');
}

export function getPotionHealing(item) {
  const text = `${getItemName(item)} ${item?.description || ''} ${item?.effect || ''}`.toLowerCase();
  if (text.includes('supreme')) return { count: 10, sides: 4, modifier: 20 };
  if (text.includes('superior')) return { count: 8, sides: 4, modifier: 8 };
  if (text.includes('greater')) return { count: 4, sides: 4, modifier: 4 };
  return { count: 2, sides: 4, modifier: 2 };
}

export function hasWeaponProficiency(character = {}, item, rule = findWeaponRule(item)) {
  if (typeof item?.proficient === 'boolean') return item.proficient;
  if (typeof item?.is_proficient === 'boolean') return item.is_proficient;

  const saved = character?.weapon_proficiencies ?? character?.proficiencies?.weapons;
  const proficiencies = Array.isArray(saved) ? saved.filter(Boolean) : [];
  // Preserve legacy characters that predate saved weapon proficiency data.
  if (!proficiencies.length) return true;

  const weaponName = normaliseName(rule?.name || getItemName(item));
  const category = normaliseName(rule?.category || item?.weapon_category || item?.category || '');
  const categoryKnown = category.includes('simple') || category.includes('martial');

  return proficiencies.some((entry) => {
    const text = normaliseName(typeof entry === 'string' ? entry : getItemName(entry));
    if (!text) return false;
    if (['all', 'allweapons', 'weapons'].includes(text)) return true;
    if (weaponName && (text === weaponName || text.includes(weaponName) || weaponName.includes(text))) return true;
    if (category.includes('simple') && text.includes('simple')) return true;
    if (category.includes('martial') && text.includes('martial')) return true;
    return false;
  }) || !categoryKnown && !rule;
}

function getWeaponProfile(character, item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const rule = findWeaponRule(item);
  const name = rule?.name || getItemName(item) || 'Weapon Attack';
  const explicitDice = parseDamageDice(item?.damage || item?.damage_dice || item?.dice || item?.damageDice);
  const ruleDice = parseDamageDice(rule?.damage);
  const dice = explicitDice || ruleDice || { count: 1, sides: 8 };
  const explicitAbility = String(item?.ability || item?.attack_ability || '').toLowerCase();
  const abilityMod = explicitAbility.includes('dex')
    ? dexterityMod
    : explicitAbility.includes('str')
      ? strengthMod
      : getWeaponAbilityMod(rule, strengthMod, dexterityMod);
  const damageType = item?.damage_type || item?.damageType || rule?.damageType || 'weapon';
  const range = item?.range || rule?.range || 'Melee or ranged';
  const properties = item?.properties || item?.property || item?.notes || (rule?.properties || []).join(', ');
  const itemBonus = Number(item?.attack_bonus || 0);
  const proficient = hasWeaponProficiency(character, item, rule);
  const attackMod = (proficient ? proficiencyBonus : 0) + abilityMod + itemBonus;
  const totalDamageMod = abilityMod + itemBonus;
  const damageText = dice.sides === 1
    ? `${dice.count}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`
    : `${dice.count}d${dice.sides}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`;
  const detailParts = [range, properties, proficient ? null : 'Not proficient'].filter(Boolean);

  return {
    id: `weapon-${String(name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: name,
    type: 'Action',
    attackLabel: `${name} Attack`,
    details: detailParts.join(' • '),
    attackMod,
    proficient,
    saveText: null,
    damageText,
    damageType,
    damage: { label: `${name} Damage`, count: dice.count, sides: dice.sides, modifier: totalDamageMod, damageType }
  };
}

export function getEquippedWeaponAttack(character, slot, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const canonicalSlot = canonicalInventorySlot(slot);
  const equipped = character?.equipped || {};
  let item = getCanonicalEquippedItem(equipped, canonicalSlot);

  if (!item) {
    item = [...(character?.equipment || []), ...(character?.inventory || [])].find((candidate) => (
      Boolean(candidate?.equipped || candidate?.is_equipped)
      && canonicalInventorySlot(candidate?.equip_slot || candidate?.equipped_slot || '') === canonicalSlot
    )) || null;
  }

  if (!item || !isWeaponLike(item)) return null;

  return {
    ...getWeaponProfile(character, item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    equipSlot: canonicalSlot,
  };
}

export function gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const candidates = [];
  const equipped = character?.equipped || {};
  ['mainHand', 'main_hand', 'weapon', 'offHand', 'off_hand'].forEach(key => { if (equipped?.[key]) candidates.push(equipped[key]); });
  [...(character?.equipment || []), ...(character?.inventory || [])].forEach(item => { if (item?.equipped || item?.is_equipped) candidates.push(item); });
  const weapons = candidates.filter(isWeaponLike).map(item => getWeaponProfile(character, item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus));
  const seen = new Set();
  return weapons.filter(weapon => {
    const key = weapon.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function gatherConsumables(character) {
  return [...(character?.equipment || []), ...(character?.inventory || [])].filter(isConsumableLike).slice(0, 6);
}

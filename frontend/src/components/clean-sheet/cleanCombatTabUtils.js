import { findWeaponRule, getWeaponAbilityMod } from '@/data/equipmentRules5e';

export const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

export function hasSaveProficiency(character, ability) {
  const saves = character?.saving_throw_proficiencies || [];
  const short = ability.slice(0, 3).toLowerCase();
  return saves.some(save => String(save).toLowerCase() === ability || String(save).toLowerCase() === short);
}

export function rollDice(count = 1, sides = 8, modifier = 0) {
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = Math.max(1, rolls.reduce((sum, value) => sum + value, 0) + modifier);
  return { rolls, total, notation: `${count}d${sides}${modifier ? ` ${fmt(modifier)}` : ''}` };
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

function getWeaponProfile(item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
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
  const attackMod = proficiencyBonus + abilityMod + itemBonus;
  const totalDamageMod = abilityMod + itemBonus;
  const damageText = dice.sides === 1
    ? `${dice.count}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`
    : `${dice.count}d${dice.sides}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`;

  return {
    id: `weapon-${String(name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: name,
    type: 'Action',
    attackLabel: `${name} Attack`,
    details: properties ? `${range} • ${properties}` : range,
    attackMod,
    saveText: null,
    damageText,
    damageType,
    damage: { label: `${name} Damage`, count: dice.count, sides: dice.sides, modifier: totalDamageMod, damageType }
  };
}

export function gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const candidates = [];
  const equipped = character?.equipped || {};
  ['mainHand', 'main_hand', 'weapon', 'offHand', 'off_hand'].forEach(key => { if (equipped?.[key]) candidates.push(equipped[key]); });
  [...(character?.equipment || []), ...(character?.inventory || [])].forEach(item => { if (item?.equipped || item?.is_equipped) candidates.push(item); });
  const weapons = candidates.filter(isWeaponLike).map(item => getWeaponProfile(item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus));
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

// Shared combat derivation helpers.
// Converts character equipment into sheet-ready attacks and AC values.

import { findWeaponRule, getWeaponAbilityMod } from './equipmentRules5e';
import { calculateArmorAc, findArmorRule } from './armorRules5e';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

function getItemName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || item.item_name || item.label || item.title || '';
}

export function parseDamageDice(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/(\d+)d(\d+)/i);
  if (!match) {
    const flat = Number(text);
    return flat > 0 ? { count: flat, sides: 1 } : null;
  }
  return { count: Number(match[1]), sides: Number(match[2]) };
}

function isWeaponLike(item) {
  const type = typeof item === 'string' ? '' : String(item?.type || item?.category || item?.item_type || '').toLowerCase();
  return Boolean(
    findWeaponRule(item)
    || type.includes('weapon')
    || item?.damage
    || item?.damage_dice
    || item?.dice
    || item?.damageDice
  );
}

function getEquippedCandidates(character) {
  const candidates = [];
  const equipped = character?.equipped || {};
  ['mainHand', 'main_hand', 'weapon', 'offHand', 'off_hand'].forEach(key => {
    if (equipped?.[key]) candidates.push(equipped[key]);
  });
  [...(character?.equipment || []), ...(character?.inventory || [])].forEach(item => {
    if (item?.equipped || item?.is_equipped) candidates.push(item);
  });
  return candidates;
}

export function deriveWeaponAttack(item, character, proficiencyBonus = 2) {
  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const bestAbilityMod = Math.max(strengthMod, dexterityMod);
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
  const attackMod = Number(proficiencyBonus || 0) + abilityMod + itemBonus;
  const totalDamageMod = abilityMod + itemBonus;

  return {
    id: `weapon-${String(name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: name,
    type: 'Action',
    attackLabel: `${name} Attack`,
    details: properties ? `${range} • ${properties}` : range,
    attackMod,
    attackText: fmt(attackMod),
    saveText: null,
    damageText: dice.sides === 1
      ? `${dice.count}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`
      : `${dice.count}d${dice.sides}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`,
    damageType,
    damage: {
      label: `${name} Damage`,
      count: dice.count,
      sides: dice.sides,
      modifier: totalDamageMod,
      damageType,
    },
    sourceItem: item,
    matchedRule: rule,
  };
}

export function deriveEquippedWeaponAttacks(character, proficiencyBonus = 2) {
  const seen = new Set();
  return getEquippedCandidates(character)
    .filter(isWeaponLike)
    .map(item => deriveWeaponAttack(item, character, proficiencyBonus))
    .filter(attack => {
      const key = attack.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function deriveArmorClass(character, options = {}) {
  const dexMod = mod(character?.dexterity);
  const equipped = character?.equipped || {};
  const armor = equipped.armor || equipped.armour;
  const shield = equipped.shield;
  const explicitAc = options.ignoreStoredAc ? 0 : Number(character?.armor_class ?? character?.ac ?? 0);
  const unarmoredAc = explicitAc || 10 + dexMod;

  const hasArmorRule = Boolean(findArmorRule(armor) || findArmorRule(shield));
  if (!hasArmorRule) {
    // No named armour rule, but equipped items may still carry ac_bonus
    const armorBonus = typeof armor === 'object' && armor ? Number(armor.ac_bonus || 0) : 0;
    const shieldBonus = typeof shield === 'object' && shield ? Math.max(Number(shield.ac_bonus || 0), 2) : 0;
    return unarmoredAc + armorBonus + shieldBonus;
  }

  return calculateArmorAc({ armor, shield, dexMod, unarmoredAc });
}

// Shared combat derivation helpers.
// Converts character equipment into sheet-ready attacks and AC values.

import { findWeaponRule, getWeaponAbilityMod, weaponEnhancementBonus } from './equipmentRules5e';
import { calculateArmorAc, findArmorRule } from './armorRules5e';
import { getMonkClassLevel } from './monkCharacterShape';
import { getMonkUnarmoredMovementBonus } from './monkProgression';
import { wornMagicAcBonus } from './equipmentLoadout';

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

function isShieldLike(item) {
  if (!item) return false;
  const name = getItemName(item).toLowerCase();
  const type = typeof item === 'string'
    ? ''
    : `${item?.type || ''} ${item?.category || ''} ${item?.item_type || ''}`.toLowerCase();
  const armorRule = findArmorRule(item);
  const ruleText = `${armorRule?.name || ''} ${armorRule?.category || ''} ${armorRule?.type || ''}`.toLowerCase();
  return name.includes('shield') || type.includes('shield') || ruleText.includes('shield');
}

/**
 * Imported sheets contain reviewed FINAL AC/speed values, unlike creation's
 * species base values. Older imports don't retain creation_mode through the
 * backend character model, but their import provenance survives in notes.
 */
function importedSheetStatsAreFinal(character = {}) {
  if (character?.creation_mode === 'imported') return true;
  const note = `${character?.notes || ''}\n${character?.backstory || ''}`;
  return /Imported from player upload:|Imported through Keeper character import\./i.test(note);
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
  // Reads the stored attack_bonus when set, and otherwise the "+N" in the item
  // name, which is how every catalogue magic weapon states it.
  const itemBonus = weaponEnhancementBonus(item);
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

/**
 * Character creation stores the species' base speed, not the final speed after
 * class features. The Monk bonus is conditional on wearing no armour/shield.
 * Never persist this view-only derived value as a new base speed.
 */
export function deriveWalkingSpeed(character = {}) {
  const raw = Number(character?.speed ?? 30);
  const base = Number.isFinite(raw) ? raw : 30;
  const monkLevel = getMonkClassLevel(character);
  if (!monkLevel || character?.speed_includes_class_bonus === true) return base;
  // A reviewed imported sheet's Speed is normally its already-final value.
  // Re-adding the class bonus would turn an imported 40-ft Monk into 50 ft.
  if (character?.speed_includes_class_bonus !== false && importedSheetStatsAreFinal(character)) return base;
  const equipped = character?.equipped || {};
  const armor = equipped.armor || equipped.armour;
  const offHand = equipped.offHand || equipped.off_hand;
  const shield = equipped.shield || (isShieldLike(offHand) ? offHand : null);
  if (armor || shield) return base;
  return base + getMonkUnarmoredMovementBonus(monkLevel);
}

/** A class's own level on this character (multiclass aware), or 0. */
function classLevelOf(character = {}, className = '') {
  const want = String(className).toLowerCase();
  const map = character?.class_levels || character?.multiclass_levels || {};
  const fromMap = Object.entries(map).find(([name]) => String(name).toLowerCase() === want);
  if (fromMap) return Number(fromMap[1]) || 0;
  const fromList = (Array.isArray(character?.classes) ? character.classes : [])
    .find((entry) => String(entry?.name || entry?.class_name || entry?.character_class || '').toLowerCase() === want);
  if (fromList) return Number(fromList.level || fromList.class_level) || 0;
  if (Object.keys(map).length || (Array.isArray(character?.classes) && character.classes.length)) return 0;
  return String(character?.character_class || character?.class_name || '').toLowerCase() === want ? Number(character?.level) || 1 : 0;
}

/** Whether the character has the Defense fighting style (+1 AC in armour). */
function hasDefenseStyle(character = {}) {
  const styles = [
    ...(Array.isArray(character?.fighting_styles) ? character.fighting_styles : []),
    character?.fighting_style,
  ].map((style) => String(style?.name || style || '').trim().toLowerCase());
  return styles.includes('defense') || styles.includes('defence');
}

export function deriveArmorClass(character, options = {}) {
  const dexMod = mod(character?.dexterity);
  const equipped = character?.equipped || {};
  const armor = equipped.armor || equipped.armour;
  const offHand = equipped.offHand || equipped.off_hand;
  // The canonical inventory model stores shields in the off-hand slot. Keep the
  // legacy `equipped.shield` alias readable so old characters and new characters
  // derive the same AC.
  const shield = equipped.shield || (isShieldLike(offHand) ? offHand : null);
  const explicitAc = options.ignoreStoredAc ? 0 : Number(character?.armor_class ?? character?.ac ?? 0);
  const normalUnarmoredAc = 10 + dexMod;
  const monkLevel = getMonkClassLevel(character);
  const canUseMonkDefense = monkLevel > 0 && !armor && !shield;
  // Barbarian Unarmored Defense works with a shield, but not in armour.
  const canUseBarbarianDefense = classLevelOf(character, 'barbarian') > 0 && !armor;
  // Either class's formula may be chosen; the normal 10 + DEX if it is higher.
  const unarmoredAc = Math.max(
    normalUnarmoredAc,
    canUseMonkDefense ? 10 + dexMod + mod(character?.wisdom) : 0,
    canUseBarbarianDefense ? 10 + dexMod + mod(character?.constitution) : 0,
  );
  const canUseClassDefense = canUseMonkDefense || canUseBarbarianDefense;
  // Defense fighting style: +1 AC while wearing armour.
  const defenseStyleBonus = armor && hasDefenseStyle(character) ? 1 : 0;

  // Persisted armour/shield AC is authoritative on an ordinary sheet render:
  // applying equipment again double-counts bonuses. For an *unarmoured* Monk
  // only, an AC at or below ordinary 10 + DEX is typically a stale base AC
  // from character creation/older ability scores. Repair that display from
  // Unarmored Defense, while retaining higher stored AC (magic/homebrew) and
  // explicitly marked manual AC. Inventory equip/unequip intentionally sets
  // ignoreStoredAc and persists the newly calculated equipment AC.
  const manualAc = character?.armor_class_manual === true
    || character?.armor_class_source === 'manual';
  if (explicitAc > 0) {
    if (canUseClassDefense && !manualAc && !importedSheetStatsAreFinal(character) && explicitAc <= normalUnarmoredAc) {
      return Math.max(explicitAc, unarmoredAc);
    }
    return explicitAc;
  }
  const hasArmorRule = Boolean(findArmorRule(armor) || findArmorRule(shield));
  if (!hasArmorRule) {
    // No named armour rule, but equipped items may still carry ac_bonus.
    const armorBonus = typeof armor === 'object' && armor ? Number(armor.ac_bonus || 0) : 0;
    const shieldBonus = typeof shield === 'object' && shield ? Math.max(Number(shield.ac_bonus || 0), 2) : 0;
    return unarmoredAc + armorBonus + shieldBonus + defenseStyleBonus + wornMagicAcBonus(equipped);
  }

  // Worn magic accessories (Ring or Cloak of Protection, ...) add on top of
  // armour and shield; they count only while attuned when they need it.
  return calculateArmorAc({ armor, shield, dexMod, unarmoredAc }) + defenseStyleBonus + wornMagicAcBonus(equipped);
}

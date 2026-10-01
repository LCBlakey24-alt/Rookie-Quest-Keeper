import { findWeaponRule, getWeaponAbilityMod } from '@/data/equipmentRules5e';
import { rollDiceNotation } from '@/data/diceRoller';
import { canonicalInventorySlot, getCanonicalEquippedItem } from '@/data/characterInventoryState';
import { getMonkClassLevel } from '@/data/monkCharacterShape';
import { getMonkMartialArtsDie } from '@/data/monkProgression';

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

function getClassLevel(character = {}, className = '') {
  const key = normaliseName(className);
  if (!key) return 0;

  const directCandidates = [
    character?.[`${key}_level`],
    character?.[`${key}Level`],
  ];
  for (const value of directCandidates) {
    const level = Number(value || 0);
    if (level > 0) return level;
  }

  const maps = [
    character?.class_levels,
    character?.classLevels,
    character?.multiclass_levels,
  ];
  for (const map of maps) {
    if (!map || typeof map !== 'object') continue;
    const match = Object.entries(map).find(([name]) => normaliseName(name) === key);
    const level = Number(match?.[1] || 0);
    if (level > 0) return level;
  }

  const classes = Array.isArray(character?.classes) ? character.classes : [];
  const entry = classes.find((item) => normaliseName(item?.name || item?.class_name || item?.className || item?.class) === key);
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;

  const primary = normaliseName(character?.character_class || character?.class_name || character?.class);
  return primary === key ? Math.max(1, Number(character?.level || character?.character_level || 1) || 1) : 0;
}

export function getAttacksPerAction(character = {}) {
  const explicit = Number(
    character?.attacks_per_action
    ?? character?.attacksPerAction
    ?? character?.attack_count_per_action
    ?? 0
  );
  let attacks = explicit > 0 ? Math.max(1, Math.floor(explicit)) : 1;

  const fighterLevel = getClassLevel(character, 'fighter');
  if (fighterLevel >= 20) attacks = Math.max(attacks, 4);
  else if (fighterLevel >= 11) attacks = Math.max(attacks, 3);
  else if (fighterLevel >= 5) attacks = Math.max(attacks, 2);

  ['barbarian', 'monk', 'paladin', 'ranger'].forEach((className) => {
    if (getClassLevel(character, className) >= 5) attacks = Math.max(attacks, 2);
  });

  const featureSources = [
    character?.features,
    character?.class_features,
    character?.racial_traits,
    character?.species_features,
    character?.feats,
  ];
  featureSources.flatMap((value) => Array.isArray(value) ? value : []).forEach((feature) => {
    const featureCount = Number(feature?.attacksPerAction ?? feature?.attacks_per_action ?? 0);
    if (featureCount > 0) attacks = Math.max(attacks, Math.floor(featureCount));

    const featureName = typeof feature === 'string'
      ? feature
      : feature?.name || feature?.title || '';
    if (/\bextra\s+attack\b/i.test(String(featureName))) attacks = Math.max(attacks, 2);
  });

  return attacks;
}

export function getMonkBonusUnarmedAction(character = {}, unarmedProfile = null) {
  if (!unarmedProfile?.martialArtsActive) return null;

  const edition = String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
  const useText = edition === '2024'
    ? 'Use your Bonus Action to make this Unarmed Strike.'
    : 'After you take the Attack action with an Unarmed Strike or Monk weapon, use your Bonus Action to make this Unarmed Strike.';

  return {
    title: 'Martial Arts · Unarmed Strike',
    type: 'Bonus',
    attackLabel: 'Martial Arts Bonus Unarmed Strike',
    attackMod: Number(unarmedProfile.attackMod || 0),
    damageText: unarmedProfile.damageText || '',
    description: `${fmt(Number(unarmedProfile.attackMod || 0))} to hit • ${unarmedProfile.damageText || 'Unarmed damage'} • ${useText}`,
  };
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
  const category = normaliseName(rule?.category || item?.weapon_category || item?.category || '');
  const isMelee = category.includes('melee') || /^\s*(melee|reach)\b/i.test(String(range || ''));
  const detailParts = [range, properties, proficient ? null : 'Not proficient'].filter(Boolean);

  return {
    id: `weapon-${String(name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: name,
    type: 'Action',
    attackLabel: `${name} Attack`,
    details: detailParts.join(' • '),
    attackMod,
    proficient,
    isMelee,
    saveText: null,
    damageText,
    damageType,
    damage: { label: `${name} Damage`, count: dice.count, sides: dice.sides, modifier: totalDamageMod, damageType }
  };
}

function getEquippedItemForSlot(character = {}, slot = '') {
  const canonicalSlot = canonicalInventorySlot(slot);
  const equipped = character?.equipped || {};
  const mapped = getCanonicalEquippedItem(equipped, canonicalSlot);
  if (mapped) return mapped;

  return [...(character?.equipment || []), ...(character?.inventory || [])].find((candidate) => (
    Boolean(candidate?.equipped || candidate?.is_equipped)
    && canonicalInventorySlot(candidate?.equip_slot || candidate?.equipped_slot || '') === canonicalSlot
  )) || null;
}

function isShieldItem(item) {
  const text = normaliseName(`${getItemName(item)} ${item?.type || ''} ${item?.category || ''}`);
  return text.includes('shield');
}

function isMonkWeapon(item, edition = '2014') {
  if (!item) return true;
  if (item?.monk_weapon === true || item?.monkWeapon === true) return true;

  const rule = findWeaponRule(item);
  if (!rule) return false;

  const category = normaliseName(rule?.category || item?.weapon_category || item?.category || '');
  const properties = [
    ...(Array.isArray(rule?.properties) ? rule.properties : []),
    ...(Array.isArray(item?.properties) ? item.properties : [item?.properties]),
    item?.property,
  ].filter(Boolean).map((value) => normaliseName(value));

  const isSimpleMelee = category.includes('simple') && category.includes('melee');
  const isMartialMelee = category.includes('martial') && category.includes('melee');
  const isLight = properties.some((value) => value.includes('light'));
  const isHeavy = properties.some((value) => value.includes('heavy'));
  const isTwoHanded = properties.some((value) => value.includes('twohanded'));
  const name = normaliseName(rule?.name || getItemName(item));

  if (String(edition).includes('2024')) {
    return isSimpleMelee || (isMartialMelee && isLight);
  }

  return name === 'shortsword' || (isSimpleMelee && !isHeavy && !isTwoHanded);
}

export function getUnarmedStrikeProfile(character = {}, strengthMod = 0, dexterityMod = 0, proficiencyBonus = 0) {
  const monkLevel = getMonkClassLevel(character);
  const edition = String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
  const armor = getEquippedItemForSlot(character, 'armor');
  const offHand = getEquippedItemForSlot(character, 'offHand');
  const shield = offHand && isShieldItem(offHand) ? offHand : null;
  const handWeapons = [
    getEquippedItemForSlot(character, 'mainHand'),
    offHand,
  ].filter((item) => item && isWeaponLike(item));

  const martialArtsActive = monkLevel > 0
    && !armor
    && !shield
    && handWeapons.every((item) => isMonkWeapon(item, edition));

  const abilityMod = martialArtsActive ? Math.max(strengthMod, dexterityMod) : strengthMod;
  const abilityLabel = martialArtsActive && dexterityMod > strengthMod ? 'Dexterity' : 'Strength';
  const martialArtsDie = martialArtsActive ? getMonkMartialArtsDie(monkLevel, edition) : '';
  const sides = martialArtsActive ? Number(String(martialArtsDie).replace(/[^0-9]/g, '')) || 1 : 1;
  const damageText = martialArtsActive
    ? `${martialArtsDie}${abilityMod ? ` ${fmt(abilityMod)}` : ''}`
    : `1${abilityMod ? ` ${fmt(abilityMod)}` : ''}`;

  return {
    id: 'unarmed-strike',
    title: 'Unarmed Strike',
    type: 'Action',
    attackLabel: 'Unarmed Strike',
    details: martialArtsActive
      ? `Martial Arts ${martialArtsDie} • ${abilityLabel}`
      : monkLevel > 0
        ? 'Normal unarmed strike • Martial Arts inactive'
        : 'Punch, kick, headbutt, or similar',
    attackMod: proficiencyBonus + abilityMod,
    proficient: true,
    isMelee: true,
    martialArtsActive,
    damageText,
    damageType: 'bludgeoning',
    damage: {
      label: 'Unarmed Damage',
      count: 1,
      sides,
      modifier: abilityMod,
      damageType: 'bludgeoning',
    },
  };
}

export function getEquippedWeaponAttack(character, slot, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const canonicalSlot = canonicalInventorySlot(slot);
  const item = getEquippedItemForSlot(character, canonicalSlot);

  if (!item || !isWeaponLike(item)) return null;

  return {
    ...getWeaponProfile(character, item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    equipSlot: canonicalSlot,
  };
}

export function getOpportunityAttackProfile(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const mainHand = getEquippedWeaponAttack(character, 'mainHand', strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus);
  if (mainHand?.isMelee) return mainHand;

  const offHand = getEquippedWeaponAttack(character, 'offHand', strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus);
  if (offHand?.isMelee) return offHand;

  const unarmed = getUnarmedStrikeProfile(character, strengthMod, dexterityMod, proficiencyBonus);
  return {
    ...unarmed,
    id: 'opportunity-unarmed',
    attackLabel: 'Unarmed Opportunity Attack',
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

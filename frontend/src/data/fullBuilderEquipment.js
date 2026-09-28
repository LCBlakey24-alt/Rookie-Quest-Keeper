import { calculateArmorAc, findArmorRule } from './armorRules5e';
import { findWeaponRule } from './equipmentRules5e';
import { itemsFromStartingEquipmentLabels } from './startingEquipmentItems';
import { getStartingEquipmentGroups } from './startingEquipmentRules';

const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);

export function defaultStartingEquipmentChoices(className = '') {
  return Object.fromEntries(
    getStartingEquipmentGroups(className)
      .filter(group => Array.isArray(group.options) && group.options.length > 0)
      .map(group => [group.id, group.options[0]]),
  );
}

export function startingEquipmentChoicesComplete(className = '', selections = {}, fallbackClassEquipment = []) {
  const groups = getStartingEquipmentGroups(className);
  if (!groups.length) return asArray(fallbackClassEquipment).length > 0;

  return groups.every(group => {
    const selected = selections?.[group.id];
    return Boolean(selected && group.options?.includes(selected));
  });
}

export function selectedStartingEquipmentLabels({
  className = '',
  selections = {},
  fallbackClassEquipment = [],
  backgroundEquipment = [],
} = {}) {
  const groups = getStartingEquipmentGroups(className);
  const classLabels = groups.length
    ? groups.flatMap(group => {
      const selected = selections?.[group.id];
      return selected && group.options?.includes(selected) ? [selected] : [];
    })
    : asArray(fallbackClassEquipment);

  return Array.from(new Set([...classLabels, ...asArray(backgroundEquipment)]));
}

function itemName(item = {}) {
  return String(item?.name || item?.item_name || item?.label || item?.title || '');
}

function equipmentIndexes(items = []) {
  let armorIndex = -1;
  let shieldIndex = -1;
  const weaponIndexes = [];

  items.forEach((item, index) => {
    const armorRule = findArmorRule(item);
    if (armorRule?.category === 'shield' && shieldIndex < 0) {
      shieldIndex = index;
      return;
    }
    if (armorRule && armorIndex < 0) {
      armorIndex = index;
      return;
    }
    if (findWeaponRule(item)) weaponIndexes.push(index);
  });

  return { armorIndex, shieldIndex, weaponIndexes };
}

function unarmoredAcForClass(className, abilities, hasShield) {
  const dexMod = abilityMod(abilities?.dexterity);
  if (className === 'Monk' && !hasShield) {
    return 10 + dexMod + abilityMod(abilities?.wisdom);
  }
  if (className === 'Barbarian') {
    return 10 + dexMod + abilityMod(abilities?.constitution);
  }
  return 10 + dexMod;
}

export function buildFullBuilderEquipmentState({
  className = '',
  selections = {},
  fallbackClassEquipment = [],
  backgroundEquipment = [],
  abilities = {},
  fightingStyle = '',
} = {}) {
  const labels = selectedStartingEquipmentLabels({
    className,
    selections,
    fallbackClassEquipment,
    backgroundEquipment,
  });
  const rawItems = itemsFromStartingEquipmentLabels(labels);
  const { armorIndex, shieldIndex, weaponIndexes } = equipmentIndexes(rawItems);
  const equippedIndexes = new Set(
    [armorIndex, shieldIndex, weaponIndexes[0]].filter(index => index >= 0),
  );

  const items = rawItems.map((item, index) => ({
    ...item,
    equipped: equippedIndexes.has(index),
    is_equipped: equippedIndexes.has(index),
  }));

  const armor = armorIndex >= 0 ? items[armorIndex] : null;
  const shield = shieldIndex >= 0 ? items[shieldIndex] : null;
  const mainHand = weaponIndexes.length ? items[weaponIndexes[0]] : null;
  const offHand = shield || (weaponIndexes.length > 1 ? items[weaponIndexes[1]] : null);
  const dexMod = abilityMod(abilities?.dexterity);
  const unarmoredAc = unarmoredAcForClass(className, abilities, Boolean(shield));

  let armorClass = calculateArmorAc({
    armor,
    shield,
    dexMod,
    unarmoredAc,
  });

  if (armor && String(fightingStyle || '').trim().toLowerCase() === 'defense') {
    armorClass += 1;
  }

  return {
    labels,
    items,
    armorClass,
    equipped: {
      armor,
      shield,
      mainHand,
      offHand,
    },
    summary: {
      armor: itemName(armor),
      shield: itemName(shield),
      mainHand: itemName(mainHand),
      offHand: itemName(offHand),
    },
  };
}

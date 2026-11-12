import { getClassFeatures } from '@/data/classFeatures';
import { featureTypeLabel, toArray } from './cleanSheetUtils';

/*
 * What the Features tab needs, worked out from the character alone, so the
 * classic sheet and the hexagon sheet show exactly the same list.
 */

export function rulesEditionOf(character) {
  return String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

/** Class-table features for the character's level plus those saved on the sheet, de-duplicated and in level order. */
export function buildClassFeatureSummary(character, rulesEdition = rulesEditionOf(character)) {
  const className = character?.character_class;
  const level = Number(character?.level || 1);
  const tableFeatures = getClassFeatures(className, level, rulesEdition);
  const characterFeatures = toArray(character?.features || character?.class_features).map((feature, index) => (
    typeof feature === 'string'
      ? { name: feature, description: 'Saved on this character sheet.', type: 'passive', level: null, source: 'sheet' }
      : { ...feature, name: feature?.name || `Feature ${index + 1}`, source: 'sheet' }
  ));
  const merged = [...tableFeatures, ...characterFeatures];
  const seen = new Set();
  return merged
    .filter((feature) => feature?.name && !feature.isChoice)
    .filter((feature) => {
      const key = `${feature.name}-${feature.level || ''}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
}

export function groupByActionEconomy(features) {
  const groups = { Action: [], 'Bonus action': [], Reaction: [], Passive: [] };
  features.forEach((feature) => {
    const label = featureTypeLabel(feature.type);
    if (label === 'Action' || label === 'Special') groups.Action.push(feature);
    else if (label === 'Bonus action') groups['Bonus action'].push(feature);
    else if (label === 'Reaction') groups.Reaction.push(feature);
    else groups.Passive.push(feature);
  });
  return groups;
}

export function buildProficiencySummary(character) {
  return [
    ['Armor', toArray(character?.armor_proficiencies || character?.proficiencies?.armor)],
    ['Weapons', toArray(character?.weapon_proficiencies || character?.proficiencies?.weapons)],
    ['Tools', toArray(character?.tool_proficiencies || character?.proficiencies?.tools)],
    ['Languages', toArray(character?.languages || character?.proficiencies?.languages)],
  ];
}

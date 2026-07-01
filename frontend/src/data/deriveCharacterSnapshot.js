import { RACES } from './characterRules5e';
import { getCharacterClassFeatures } from './characterFeatureSelectors';
import { getClassResourceRules } from './classResourceRules';
import { resourceActionCards, resourceValue } from './actionEconomyCards';
import {
  SPELLCASTING_CLASSES,
  classHasSpellcasting,
  getCharacterClassLevel,
  getCharacterSpellcastingInfo,
  getMulticlassSpellSlots,
  getSpellSlotsForCaster,
} from './spellDatabase';

export const CORE_CLASS_NAMES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
];

const normalizeKey = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const proficiencyFor = (level = 1) => 2 + Math.floor((Math.max(1, Number(level || 1)) - 1) / 4);
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export function normalizeEdition(character = {}) {
  return String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

export function getCanonicalCoreClassName(className = '') {
  return CORE_CLASS_NAMES.find(name => normalizeKey(name) === normalizeKey(className)) || String(className || '').trim();
}

export function getCanonicalRaceName(raceName = '') {
  return Object.keys(RACES).find(name => normalizeKey(name) === normalizeKey(raceName)) || String(raceName || '').trim();
}

function getClassLevels(character = {}) {
  const fromMap = character?.class_levels || character?.multiclass_levels || character?.classLevels || {};
  const mapped = Object.fromEntries(Object.entries(fromMap)
    .map(([name, level]) => [getCanonicalCoreClassName(name), Number(level) || 0])
    .filter(([name, level]) => name && level > 0));
  if (Object.keys(mapped).length) return mapped;

  const fromArray = toArray(character?.classes)
    .map(entry => [getCanonicalCoreClassName(entry?.name || entry?.class_name || entry?.className || entry?.class), Number(entry?.level || entry?.class_level || entry?.classLevel || 0)])
    .filter(([name, level]) => name && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  const primary = getCanonicalCoreClassName(character?.character_class || character?.class_name || character?.className || character?.class || 'Adventurer');
  return primary ? { [primary]: Number(character?.level || 1) || 1 } : {};
}

function getRaceTraits(character = {}, edition = '2014') {
  const raceName = getCanonicalRaceName(character?.race || character?.species || '');
  const raceData = RACES[raceName];
  if (!raceData) return { name: raceName, found: false, traits: [], languages: [], warnings: raceName ? [`No race/species data found for ${raceName}.`] : ['No race/species selected.'] };

  const subraceName = character?.subrace || character?.lineage || '';
  const subraceData = subraceName ? raceData.subraces?.[subraceName] : null;
  const traits = [...toArray(raceData.traits), ...toArray(subraceData?.traits)];
  const languages = toArray(raceData.languages).filter(language => !/choice/i.test(String(language)));
  const warnings = [];
  if (edition === '2024' && raceData.asi2014 && !raceData.asi2024) warnings.push(`${raceName} uses 2014 ability-score data; 2024 ASI should come from background/origin.`);
  if (toArray(raceData.languages).some(language => /choice/i.test(String(language)))) warnings.push(`${raceName} has a language choice that must be resolved before save.`);

  return { name: raceName, subrace: subraceName, found: true, speed: subraceData?.speed || raceData.speed || 30, size: raceData.size || 'Medium', traits, languages, warnings };
}

function getSpellcastingBlocks(character = {}, classLevels = {}) {
  const primaryInfo = getCharacterSpellcastingInfo(character);
  const blocks = [];
  Object.keys(classLevels).forEach(className => {
    const info = SPELLCASTING_CLASSES[className];
    if (!info || !classHasSpellcasting(character, className)) return;
    const level = getCharacterClassLevel(character, className);
    blocks.push({
      className,
      level,
      ability: info.ability,
      type: info.pactMagic ? 'pact_magic' : info.type,
      ritual: Boolean(info.ritual),
      slots: getSpellSlotsForCaster(info, level),
      spellSaveDc: Number(character?.spell_save_dc || 0),
      spellAttackBonus: Number(character?.spell_attack_bonus || 0),
    });
  });

  const multiclass = getMulticlassSpellSlots(classLevels, character);
  return { primary: primaryInfo?.className || null, blocks, multiclass };
}

function getActionCards(character = {}, resources = []) {
  const resourceCards = resourceActionCards(character, resources, { spendResource: () => {} });
  return {
    actions: resourceCards.action,
    bonusActions: resourceCards.bonus,
    reactions: resourceCards.reaction,
  };
}

function getValidationWarnings({ character, edition, classLevels, race, features }) {
  const warnings = [...race.warnings];
  const totalLevel = Number(character?.level || Object.values(classLevels).reduce((sum, level) => sum + level, 0) || 1);
  if (totalLevel < 1 || totalLevel > 20) warnings.push('Character level should be between 1 and 20 for core progression.');
  if (!Object.keys(classLevels).length) warnings.push('No playable class level found.');
  Object.entries(classLevels).forEach(([className, level]) => {
    if (!CORE_CLASS_NAMES.includes(className)) warnings.push(`${className} is not one of the 12 core classes.`);
    if (level < 1 || level > 20) warnings.push(`${className} class level should be between 1 and 20.`);
  });
  if (!features.length) warnings.push('No class features derived for this character.');
  if (edition === '2024' && !character?.background) warnings.push('2024 characters need background/origin data for ASI and origin feat validation.');
  return warnings;
}

export function deriveCharacterSnapshot(character = {}) {
  const edition = normalizeEdition(character);
  const level = Number(character?.level || 1) || 1;
  const classLevels = getClassLevels(character);
  const primaryClass = getCanonicalCoreClassName(character?.character_class || Object.keys(classLevels)[0] || 'Adventurer');
  const race = getRaceTraits(character, edition);
  const features = getCharacterClassFeatures({ ...character, character_class: primaryClass, level }, edition);
  const resources = getClassResourceRules({ ...character, character_class: primaryClass, level, class_levels: classLevels }).map(rule => resourceValue(character, rule));
  const actionEconomy = getActionCards({ ...character, character_class: primaryClass }, resources);
  const spellcasting = getSpellcastingBlocks({ ...character, character_class: primaryClass, level, class_levels: classLevels }, classLevels);
  const proficiencyBonus = Number(character?.proficiency_bonus || character?.proficiencyBonus || proficiencyFor(level));

  const snapshot = {
    identity: {
      id: character?.id || null,
      name: character?.name || 'Unnamed Character',
      edition,
      rulesetId: character?.ruleset_id || (edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014'),
      level,
      primaryClass,
      classLevels,
      race: race.name,
      species: edition === '2024' ? race.name : character?.species || '',
      background: character?.background || '',
    },
    abilities: Object.fromEntries(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => [ability, { score: Number(character?.[ability] || 10), mod: abilityMod(character?.[ability]) }])),
    proficiencyBonus,
    race,
    features,
    resources,
    actionEconomy,
    spellcasting,
    warnings: [],
  };

  snapshot.warnings = getValidationWarnings({ character, edition, classLevels, race, features });
  return snapshot;
}

export function getSupportedRaceNames() {
  return Object.keys(RACES);
}

import { getBarbarianProgressionSummary } from './barbarianProgression';
import { isBarbarianCharacter } from './barbarianCharacterShape';
import { getBarbarianSubclassKey, getBarbarianSubclassSummary } from './barbarianSubclasses';

function normaliseRuleset(character = {}) {
  return String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

function normaliseClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getBarbarianClassLevel(character = {}) {
  const directLevel = Number(character?.barbarian_level || character?.barbarianLevel || 0);
  if (directLevel > 0) return directLevel;

  const classLevels = character?.class_levels || character?.classLevels || character?.multiclass_levels || {};
  const mappedLevel = Number(classLevels.barbarian || classLevels.Barbarian || 0);
  if (mappedLevel > 0) return mappedLevel;

  const classEntries = Array.isArray(character?.classes) ? character.classes : [];
  const entry = classEntries.find(item => normaliseClassName(item?.name || item?.class_name || item?.className || item?.class) === 'barbarian');
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;

  return isBarbarianCharacter(character) ? Number(character?.level || 1) || 1 : 0;
}

export function getBarbarianSheetSummary(character = {}) {
  const level = getBarbarianClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getBarbarianProgressionSummary(level || 1, edition);
  const subclassKey = getBarbarianSubclassKey(character?.subclass || '');
  const subclass = getBarbarianSubclassSummary(character?.subclass || '', level || 1, edition);
  const constitutionMod = Math.floor((Number(character?.constitution || 10) - 10) / 2);
  const dexterityMod = Math.floor((Number(character?.dexterity || 10) - 10) / 2);
  const unarmoredDefenseAc = 10 + dexterityMod + constitutionMod;
  const rageUses = progression.rageUses;

  return {
    className: 'Barbarian',
    edition,
    level,
    subclassKey,
    subclassLabel: subclass?.label || character?.subclass || (level >= 3 ? 'Choose/record Primal Path' : 'None yet'),
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    rageUses,
    rageUsesLabel: rageUses === Infinity ? 'Unlimited' : String(rageUses),
    rageDamageBonus: progression.rageDamageBonus,
    brutalCriticalDice: progression.brutalCriticalDice,
    brutalCriticalLabel: edition === '2024'
      ? (level >= 9 ? 'Brutal Strike online' : 'Not yet')
      : (progression.brutalCriticalDice > 0 ? `+${progression.brutalCriticalDice} weapon damage dice` : 'Not yet'),
    unarmoredDefenseAc,
    recklessAttack: level >= 2,
    dangerSense: level >= 2,
    extraAttack: level >= 5,
    fastMovement: level >= 5,
    relentlessRage: level >= 11,
    persistentRage: level >= 15,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
  };
}

import { getFighterProgressionSummary } from './fighterProgression';
import { getChampionSummary, isChampionSubclass } from './fighterChampion';
import { getBattleMasterSummary, isBattleMasterSubclass } from './fighterBattleMaster';
import { getFighterMagicSummary, isFighterMagicSubclass } from './fighterMagicSubclass';

function normaliseRuleset(character = {}) {
  return String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

function normaliseSubclass(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normaliseClassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getFighterClassLevel(character = {}) {
  const directLevel = Number(character?.fighter_level || character?.fighterLevel || 0);
  if (directLevel > 0) return directLevel;

  const classLevels = character?.class_levels || character?.classLevels || {};
  const mappedLevel = Number(classLevels.fighter || classLevels.Fighter || 0);
  if (mappedLevel > 0) return mappedLevel;

  const classEntries = Array.isArray(character?.classes) ? character.classes : [];
  const fighterEntry = classEntries.find(entry => normaliseClassName(entry?.name || entry?.class_name || entry?.className || entry?.class) === 'fighter');
  const entryLevel = Number(fighterEntry?.level || fighterEntry?.class_level || fighterEntry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;

  return Number(character?.level || 1) || 1;
}

export function getFighterSheetSummary(character = {}) {
  const level = getFighterClassLevel(character);
  const edition = normaliseRuleset(character);
  const subclassKey = normaliseSubclass(character?.subclass || '');
  const fighter = getFighterProgressionSummary(level, edition);
  const champion = isChampionSubclass(subclassKey) ? getChampionSummary(level, edition) : null;
  const battleMaster = isBattleMasterSubclass(subclassKey) ? getBattleMasterSummary(level, edition) : null;
  const magicSubclass = isFighterMagicSubclass(subclassKey) ? getFighterMagicSummary(level, edition) : null;

  return {
    edition,
    level,
    subclassKey,
    attacksPerAction: fighter.attacksPerAction,
    actionSurgeUses: fighter.actionSurgeUses,
    indomitableUses: fighter.indomitableUses,
    currentLevelFeatures: fighter.currentLevelFeatures,
    nextFeatures: fighter.nextFeatures,
    criticalRange: champion?.criticalRange || { minimum: 20, label: '20' },
    subclassFeatures: champion?.activeFeatures || battleMaster?.activeFeatures || magicSubclass?.activeFeatures || [],
    isChampion: Boolean(champion),
    isBattleMaster: Boolean(battleMaster),
    isMagicSubclass: Boolean(magicSubclass),
    battleMaster,
    magicSubclass,
  };
}

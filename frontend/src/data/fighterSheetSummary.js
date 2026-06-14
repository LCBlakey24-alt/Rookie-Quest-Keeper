import { getFighterProgressionSummary } from './fighterProgression';
import { getChampionSummary, isChampionSubclass } from './fighterChampion';
import { getBattleMasterSummary, isBattleMasterSubclass } from './fighterBattleMaster';

function normaliseRuleset(character = {}) {
  return String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

function normaliseSubclass(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getFighterSheetSummary(character = {}) {
  const level = Number(character?.fighter_level || character?.level || 1) || 1;
  const edition = normaliseRuleset(character);
  const subclassKey = normaliseSubclass(character?.subclass || '');
  const fighter = getFighterProgressionSummary(level, edition);
  const champion = isChampionSubclass(subclassKey) ? getChampionSummary(level, edition) : null;
  const battleMaster = isBattleMasterSubclass(subclassKey) ? getBattleMasterSummary(level, edition) : null;

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
    subclassFeatures: champion?.activeFeatures || battleMaster?.activeFeatures || [],
    isChampion: Boolean(champion),
    isBattleMaster: Boolean(battleMaster),
    battleMaster,
  };
}

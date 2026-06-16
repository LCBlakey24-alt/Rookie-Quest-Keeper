import { getRangerClassLevel, isRangerCharacter } from './rangerCharacterShape';
import { getRangerProgressionSummary } from './rangerProgression';
import { getRangerSubclassKey, getRangerSubclassSummary } from './rangerSubclasses';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;
const getSubclassName = (character = {}) => character?.subclass || character?.ranger_subclass || character?.rangerSubclass || '';

export function getRangerSheetSummary(character = {}) {
  const level = getRangerClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getRangerProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getRangerSubclassSummary(subclassName, level || 1, edition);

  return {
    className: 'Ranger',
    edition,
    level,
    isRanger: isRangerCharacter(character),
    subclassKey: getRangerSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= 3 ? 'Choose/record Ranger Subclass' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    favoredEnemyUses: progression.favoredEnemyUses,
    favoredEnemyLabel: edition === '2024' ? `${progression.favoredEnemyUses} Favored Enemy uses` : joinSelection(character?.favoredEnemy || character?.favored_enemy, 'Favored Enemy'),
    favoredTerrainLabel: edition === '2014' ? joinSelection(character?.favoredTerrain || character?.favored_terrain, 'Favored Terrain') : '',
    weaponMasteryLabel: edition === '2024' ? joinSelection(character?.weaponMasteries || character?.weapon_masteries, 'Choose weapon masteries') : '',
    fightingStyleLabel: joinSelection(character?.fightingStyle || character?.fighting_style, level >= 2 ? 'Choose Fighting Style' : 'None yet'),
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingHint: progression.spellcastingHint,
    spellcastingOnline: progression.spellcastingLevel > 0,
    extraAttack: level >= 5,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
  };
}

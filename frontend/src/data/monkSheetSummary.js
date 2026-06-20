import { isMonkCharacter, getMonkClassLevel } from './monkCharacterShape';
import { getMonkProgressionSummary } from './monkProgression';
import { getMonkSubclassKey, getMonkSubclassSummary } from './monkSubclasses';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);

export function getMonkSheetSummary(character = {}) {
  const level = getMonkClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getMonkProgressionSummary(level || 1, edition);
  const subclass = getMonkSubclassSummary(character?.subclass || '', level || 1, edition);
  return {
    className: 'Monk', edition, level,
    subclassKey: getMonkSubclassKey(character?.subclass || ''),
    subclassLabel: subclass?.label || character?.subclass || (level >= 3 ? 'Choose/record Monastic Tradition' : 'None yet'),
    subclassRole: subclass?.role || '', subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [], nextSubclassFeatures: subclass?.nextFeatures || [],
    resourceName: progression.resourceName, resourceUses: progression.resourceUses, martialArtsDie: progression.martialArtsDie,
    unarmoredDefenseAc: 10 + abilityMod(character?.dexterity) + abilityMod(character?.wisdom),
    unarmoredMovementBonus: progression.unarmoredMovementBonus,
    martialArts: level >= 1, flurryOfBlows: level >= 2, patientDefense: level >= 2, stepOfTheWind: level >= 2,
    deflectFeature: edition === '2024' ? level >= 3 && 'Deflect Attacks' : level >= 3 && 'Deflect Missiles',
    slowFall: level >= 4, extraAttack: level >= 5, stunningStrike: level >= 5, evasion: level >= 7,
    currentLevelFeatures: progression.currentLevelFeatures, activeFeatures: progression.activeFeatures, nextFeatures: progression.nextFeatures,
    isMonk: isMonkCharacter(character),
  };
}

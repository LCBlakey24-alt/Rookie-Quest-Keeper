import { getMonkClassLevel, isMonkCharacter } from './monkCharacterShape';
import { getMonkProgressionSummary } from './monkProgression';
import { getMonkSubclassByKey, getMonkSubclassKey } from './monkSubclasses';

function normaliseRuleset(character = {}) {
  return String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

function abilityModifier(value = 10) {
  return Math.floor((Number(value || 10) - 10) / 2);
}

function buildDisciplineActions(level = 1, edition = '2014') {
  const online = level >= 2;
  const strikeName = edition === '2024' ? 'Bonus Unarmed Strike / Flurry' : 'Flurry of Blows';
  const defenseName = edition === '2024' ? 'Patient Defense' : 'Patient Defense';
  const movementName = edition === '2024' ? 'Step of the Wind' : 'Step of the Wind';

  return online ? [strikeName, defenseName, movementName] : [];
}

export function getMonkSheetSummary(character = {}) {
  const level = getMonkClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getMonkProgressionSummary(level || 1, edition);
  const wisdomMod = abilityModifier(character?.wisdom);
  const dexterityMod = abilityModifier(character?.dexterity);
  const unarmoredDefenseAc = 10 + dexterityMod + wisdomMod;
  const subclass = getMonkSubclassByKey(character?.subclass || '', edition);

  return {
    className: 'Monk',
    edition,
    level,
    isMonk: isMonkCharacter(character),
    subclassKey: getMonkSubclassKey(character?.subclass || ''),
    subclassLabel: subclass?.label || character?.subclass || (level >= 3 ? 'Choose/record Monk Subclass' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: Boolean(!character?.subclass || subclass),
    disciplineName: progression.disciplineName,
    disciplinePoints: progression.disciplinePoints,
    disciplineLabel: progression.disciplinePoints > 0 ? `${progression.disciplinePoints} ${progression.disciplineName}` : 'Not yet',
    disciplineActions: buildDisciplineActions(level, edition),
    martialArtsDie: progression.martialArtsDie,
    martialArtsLabel: `Martial Arts ${progression.martialArtsDie}`,
    unarmoredDefenseAc,
    unarmoredMovementBonus: progression.unarmoredMovementBonus,
    unarmoredMovementLabel: progression.unarmoredMovementBonus > 0 ? `+${progression.unarmoredMovementBonus} ft.` : 'Not yet',
    deflectAttacks: edition === '2024' ? level >= 3 : level >= 3,
    stunningStrike: level >= 5,
    extraAttack: level >= 5,
    evasion: level >= 7,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
  };
}

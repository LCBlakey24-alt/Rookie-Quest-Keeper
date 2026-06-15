import { isRogueCharacter, getRogueClassLevel } from './rogueCharacterShape';
import { getRogueProgressionSummary } from './rogueProgression';
import { getRogueSubclassKey, getRogueSubclassSummary } from './rogueSubclasses';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';

export function getRogueSheetSummary(character = {}) {
  const level = getRogueClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getRogueProgressionSummary(level || 1, edition);
  const subclass = getRogueSubclassSummary(character?.subclass || '', level || 1, edition);
  return {
    className: 'Rogue',
    edition,
    level,
    subclassKey: getRogueSubclassKey(character?.subclass || ''),
    subclassLabel: subclass?.label || character?.subclass || (level >= 3 ? 'Choose/record Roguish Archetype' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    sneakAttackDice: progression.sneakAttackDice,
    sneakAttackLabel: `${progression.sneakAttackDice}d6`,
    sneakAttackReminder: 'Once per turn with a finesse or ranged weapon when you have advantage or an eligible ally near the target.',
    cunningAction: level >= 2,
    cunningActionOptions: level >= 2 ? ['Dash', 'Disengage', 'Hide'] : [],
    steadyAim: edition === '2024' && level >= 3,
    uncannyDodge: level >= 5,
    evasion: level >= 7,
    reliableTalent: edition === '2024' ? level >= 7 : level >= 11,
    strokeOfLuck: level >= 20,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    isRogue: isRogueCharacter(character),
  };
}

import { getWarlockClassLevel, isWarlockCharacter } from './warlockCharacterShape';
import { getWarlockProgressionSummary } from './warlockProgression';
import { getWarlockSubclassKey, getWarlockSubclassSummary } from './warlockSubclasses';
import { getWarlockBuilderChoiceSummary } from './warlockBuilderChoiceSummary';
import { getWarlockBuilderSelectionList } from './warlockBuilderOptions';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;
const joinSelectionOrFallback = (value, fallback = '') => {
  const joined = joinSelection(value, '');
  return joined || fallback;
};
const getSubclassName = (character = {}) => character?.subclass || character?.warlock_subclass || character?.warlockSubclass || character?.patron || character?.warlockPatron || '';

function getPactMagicLabel(progression = {}) {
  const slots = progression.pactMagicSlots || 0;
  const slotLevel = progression.pactMagicSlotLevel || 0;
  if (!slots || !slotLevel) return 'Pact Magic not unlocked';
  return `${slots} Pact Magic slot${slots === 1 ? '' : 's'} at level ${slotLevel}`;
}

function getMysticArcanumLabel(levels = []) {
  if (!levels.length) return 'Mystic Arcanum not unlocked';
  return `Mystic Arcanum levels: ${levels.join(', ')}`;
}

export function getWarlockSheetSummary(character = {}) {
  const level = getWarlockClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getWarlockProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getWarlockSubclassSummary(subclassName, level || 1, edition);
  const selections = getWarlockBuilderSelectionList(character);
  const choiceSummary = getWarlockBuilderChoiceSummary({ level: level || 1, edition, selections: character });

  return {
    className: 'Warlock',
    edition,
    level,
    isWarlock: isWarlockCharacter(character),
    subclassKey: getWarlockSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= progression.subclassChoiceLevel ? 'Choose/record Warlock Patron' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    pactBoonLabel: choiceSummary.pactBoon?.name || selections.pactBoon || (level >= 3 ? 'Choose Pact Boon' : 'None yet'),
    pactMagicSlots: progression.pactMagicSlots,
    pactMagicSlotLevel: progression.pactMagicSlotLevel,
    pactMagicLabel: getPactMagicLabel(progression),
    invocationCount: progression.invocationCount,
    invocationsLabel: joinSelectionOrFallback(selections.invocations, progression.invocationCount > 0 ? `Choose ${progression.invocationCount} Eldritch Invocation${progression.invocationCount === 1 ? '' : 's'}` : 'None yet'),
    mysticArcanumLevels: progression.mysticArcanumLevels,
    mysticArcanumLabel: getMysticArcanumLabel(progression.mysticArcanumLevels),
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

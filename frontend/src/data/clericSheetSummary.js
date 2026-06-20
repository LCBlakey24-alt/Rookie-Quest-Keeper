import { getClericClassLevel, isClericCharacter } from './clericCharacterShape';
import { getClericProgressionSummary } from './clericProgression';
import { getClericSubclassKey, getClericSubclassSummary } from './clericSubclasses';
import { getClericBuilderSelectionList } from './clericBuilderOptions';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';

const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;

const getSubclassName = (character = {}) => character?.subclass || character?.cleric_subclass || character?.clericSubclass || '';

function getPreparedSpellList(character = {}) {
  return character?.preparedSpells || character?.prepared_spells || [];
}

function getDivineOrderLabel(selection = {}) {
  return selection.divineOrder || (selection.level >= 1 && selection.edition === '2024' ? 'Choose Divine Order' : 'Not used in this ruleset');
}

function getBlessedStrikesLabel(selection = {}) {
  return selection.blessedStrikes || (selection.level >= 7 && selection.edition === '2024' ? 'Choose Blessed Strikes option' : 'None yet');
}

export function getClericSheetSummary(character = {}) {
  const level = getClericClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getClericProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getClericSubclassSummary(subclassName, level || 1, edition);
  const selections = getClericBuilderSelectionList(character);
  const preparedSpells = getPreparedSpellList(character);

  return {
    className: 'Cleric',
    edition,
    level,
    isCleric: isClericCharacter(character),
    subclassKey: getClericSubclassKey(subclassName),
    subclassLabel: subclass?.name || subclassName || (level >= progression.subclassChoiceLevel ? 'Choose/record Cleric Subclass' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatureLevels: subclass?.activeFeatureLevels || [],
    nextSubclassFeatureLevel: subclass?.nextFeatureLevel || null,
    channelDivinityUses: progression.channelDivinityUses,
    channelDivinityLabel: progression.channelDivinityUses > 0 ? `${progression.channelDivinityUses} Channel Divinity use${progression.channelDivinityUses === 1 ? '' : 's'}` : 'Channel Divinity not unlocked',
    destroyUndeadCR: progression.destroyUndeadCR,
    destroyUndeadLabel: edition === '2024'
      ? (progression.destroyUndeadCR ? 'Sear Undead online' : 'Sear Undead not unlocked')
      : (progression.destroyUndeadCR ? `Destroy Undead CR ${progression.destroyUndeadCR}` : 'Destroy Undead not unlocked'),
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingOnline: progression.spellcastingLevel > 0,
    spellcastingHint: `Full caster level ${progression.spellcastingLevel}`,
    divineOrderLabel: getDivineOrderLabel({ ...selections, level, edition }),
    blessedStrikesLabel: getBlessedStrikesLabel({ ...selections, level, edition }),
    preparedSpellsLabel: joinSelection(preparedSpells, progression.spellcastingLevel > 0 ? 'Choose prepared Cleric spells' : 'None yet'),
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

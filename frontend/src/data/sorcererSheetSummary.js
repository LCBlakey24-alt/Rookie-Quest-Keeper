import { getSorcererClassLevel, isSorcererCharacter } from './sorcererCharacterShape';
import { getSorcererProgressionSummary } from './sorcererProgression';
import { getSorcererSubclassKey, getSorcererSubclassSummary } from './sorcererSubclasses';
import { getSorcererBuilderChoiceSummary } from './sorcererBuilderChoiceSummary';
import { getSorcererBuilderSelectionList } from './sorcererBuilderOptions';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;
const getSubclassName = (character = {}) => character?.subclass || character?.sorcerer_subclass || character?.sorcererSubclass || character?.origin || character?.sorcerousOrigin || '';

function getSorceryPointLabel(maximum = 0) {
  return maximum > 0 ? `${maximum} Sorcery Point${maximum === 1 ? '' : 's'}` : 'Sorcery Points not unlocked';
}

export function getSorcererSheetSummary(character = {}) {
  const level = getSorcererClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getSorcererProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getSorcererSubclassSummary(subclassName, level || 1, edition);
  const selections = getSorcererBuilderSelectionList(character);
  const choiceSummary = getSorcererBuilderChoiceSummary({ level: level || 1, edition, selections: character });

  return {
    className: 'Sorcerer',
    edition,
    level,
    isSorcerer: isSorcererCharacter(character),
    subclassKey: getSorcererSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= progression.subclassChoiceLevel ? 'Choose/record Sorcerer Origin' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingOnline: progression.spellcastingLevel > 0,
    spellcastingHint: progression.spellcastingLevel > 0 ? `Full caster spellcasting level ${progression.spellcastingLevel}` : 'Spellcasting not unlocked',
    sorceryPointMaximum: progression.sorceryPointMaximum,
    sorceryPointLabel: getSorceryPointLabel(progression.sorceryPointMaximum),
    metamagicCount: progression.metamagicCount,
    metamagicLabel: joinSelection(selections.metamagic, progression.metamagicCount > 0 ? `Choose ${progression.metamagicCount} Metamagic option${progression.metamagicCount === 1 ? '' : 's'}` : 'None yet'),
    selectedMetamagic: choiceSummary.metamagic,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

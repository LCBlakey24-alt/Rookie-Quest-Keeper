import { getDruidClassLevel, isDruidCharacter } from './druidCharacterShape';
import { getDruidProgressionSummary } from './druidProgression';
import { getDruidSubclassKey, getDruidSubclassSummary } from './druidSubclasses';
import { getDruidBuilderSelectionList } from './druidBuilderOptions';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
const joinSelection = (value, fallback = '') => {
  if (Array.isArray(value)) {
    const selected = value.filter(Boolean);
    return selected.length ? selected.join(', ') : fallback;
  }
  return value || fallback;
};
const getSubclassName = (character = {}) => character?.subclass || character?.druid_subclass || character?.druidSubclass || character?.circle || character?.druidCircle || '';

function getPrimalOrderLabel(selection = {}) {
  return selection.primalOrder || (selection.level >= 1 && selection.edition === '2024' ? 'Choose Primal Order' : 'Not used in this ruleset');
}

function getElementalFuryLabel(selection = {}) {
  return selection.elementalFury || (selection.level >= 7 && selection.edition === '2024' ? 'Choose Elemental Fury option' : 'None yet');
}

function getWildShapeLabel(progression = {}) {
  const uses = progression.wildShapeUses || 0;
  return uses > 0 ? `${uses} Wild Shape use${uses === 1 ? '' : 's'}` : 'Wild Shape not unlocked';
}

export function getDruidSheetSummary(character = {}) {
  const level = getDruidClassLevel(character);
  const edition = normaliseRuleset(character);
  const progression = getDruidProgressionSummary(level || 1, edition);
  const subclassName = getSubclassName(character);
  const subclass = getDruidSubclassSummary(subclassName, level || 1, edition);
  const selections = getDruidBuilderSelectionList(character);
  const preparedSpells = selections.preparedSpells;

  return {
    className: 'Druid',
    edition,
    level,
    isDruid: isDruidCharacter(character),
    subclassKey: getDruidSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= progression.subclassChoiceLevel ? 'Choose/record Druid Circle' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? !subclassName,
    subclassSupportedAutomation: subclass?.supportedAutomation ?? false,
    subclassCustom: Boolean(subclass?.custom),
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    wildShapeUses: progression.wildShapeUses,
    wildShapeLabel: getWildShapeLabel(progression),
    wildShapeLimit: progression.wildShapeLimit,
    wildShapeLimitLabel: progression.wildShapeLimit || 'Wild Shape not unlocked',
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingOnline: progression.spellcastingLevel > 0,
    spellcastingHint: `Full caster level ${progression.spellcastingLevel}`,
    primalOrderLabel: getPrimalOrderLabel({ ...selections, level, edition }),
    elementalFuryLabel: getElementalFuryLabel({ ...selections, level, edition }),
    preparedSpellsLabel: joinSelection(preparedSpells, progression.spellcastingLevel > 0 ? 'Choose prepared Druid spells' : 'None yet'),
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

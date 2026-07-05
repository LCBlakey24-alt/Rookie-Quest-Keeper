import { getBardClassLevel, isBardCharacter } from './bardCharacterShape';
import { getBardProgressionSummary } from './bardProgression';
import { getBardSubclassKey, getBardSubclassSummary } from './bardSubclasses';

const normaliseRuleset = (character = {}) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';

const joinSelection = (value, fallback = '') => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || fallback;

const getSubclassName = (character = {}) => character?.subclass || character?.bard_subclass || character?.bardSubclass || '';

const getCharismaModifier = (character = {}) => Number(
  character?.charismaModifier
  || character?.charisma_modifier
  || character?.cha_mod
  || character?.chaMod
  || 0
);

export function getBardSheetSummary(character = {}) {
  const level = getBardClassLevel(character);
  const edition = normaliseRuleset(character);
  const charismaModifier = getCharismaModifier(character);
  const progression = getBardProgressionSummary(level || 1, edition, charismaModifier);
  const subclassName = getSubclassName(character);
  const subclass = getBardSubclassSummary(subclassName, level || 1, edition);
  const expertiseLabel = joinSelection(character?.expertise || character?.expertise_skills, level >= 2 ? 'Choose Expertise skills' : 'None yet');
  const magicalSecretsLabel = joinSelection(character?.magicalSecrets || character?.magical_secrets, level >= 10 ? 'Choose Magical Secrets spells' : 'None yet');

  return {
    className: 'Bard',
    edition,
    level,
    isBard: isBardCharacter(character),
    subclassKey: getBardSubclassKey(subclassName),
    subclassLabel: subclass?.label || subclassName || (level >= 3 ? 'Choose/record Bard Subclass' : 'None yet'),
    subclassRole: subclass?.role || '',
    subclassSupportedInRuleset: subclass?.supportedInRuleset ?? true,
    subclassSupportedAutomation: subclass?.supportedAutomation ?? false,
    subclassCustom: Boolean(subclass?.custom),
    subclassFeatures: subclass?.activeFeatures || [],
    nextSubclassFeatures: subclass?.nextFeatures || [],
    bardicInspirationDie: progression.bardicInspirationDie,
    bardicInspirationUses: progression.bardicInspirationUses,
    bardicInspirationLabel: `${progression.bardicInspirationUses} Bardic Inspiration ${progression.bardicInspirationDie}`,
    spellcastingLevel: progression.spellcastingLevel,
    spellcastingOnline: progression.spellcastingLevel > 0,
    spellcastingHint: `Full caster level ${progression.spellcastingLevel}`,
    expertiseLabel,
    magicalSecretsLabel,
    currentLevelFeatures: progression.currentLevelFeatures,
    activeFeatures: progression.activeFeatures,
    nextFeatures: progression.nextFeatures,
    choices: progression.choices,
  };
}

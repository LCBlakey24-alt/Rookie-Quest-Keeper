/**
 * What the hexagonal sheet shows, read from the character exactly as the
 * classic sheet reads it. Nothing here is a new rule: every number comes
 * from the same helpers CleanCharacterSheet uses, so the two sheets can
 * never disagree about a modifier.
 */
import { deriveArmorClass } from '@/data/characterCombatDerivations';
import { getInitiativeModifier } from '@/data/initiativeRules';
import { formatClassProgression } from '@/data/levelUpProgressionRules';
import { getCurrentHp, getMaxHp, getTempHp, mod } from '@/components/clean-sheet/cleanSheetUtils';
import { hasSaveProficiency } from '@/components/clean-sheet/cleanCombatTabUtils';

export const ABILITY_ORDER = [
  ['strength', 'Strength', 'STR'],
  ['dexterity', 'Dexterity', 'DEX'],
  ['constitution', 'Constitution', 'CON'],
  ['intelligence', 'Intelligence', 'INT'],
  ['wisdom', 'Wisdom', 'WIS'],
  ['charisma', 'Charisma', 'CHA'],
];

export const formatModifier = (value) => (Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`);

/** Same expression as the classic sheet: the saved bonus, else by level. */
export function proficiencyBonusFor(character) {
  return Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
}

/**
 * One row per ability: its score, the ability-check modifier and the
 * saving-throw modifier. A save adds proficiency only when the character
 * is proficient in that save; an ability check never does.
 */
export function abilityRows(character) {
  const proficiency = proficiencyBonusFor(character);
  return ABILITY_ORDER.map(([key, name, short]) => {
    const score = Number(character?.[key]) || 10;
    const check = mod(score);
    const saveProficient = hasSaveProficiency(character, key);
    return { key, name, short, score, check, save: check + (saveProficient ? proficiency : 0), saveProficient };
  });
}

export function vitalsFor(character) {
  const maxHp = getMaxHp(character);
  return {
    currentHp: Math.min(getCurrentHp(character), maxHp),
    maxHp,
    tempHp: getTempHp(character),
    initiative: getInitiativeModifier(character),
    armorClass: deriveArmorClass(character),
  };
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && ['of', 'the', 'and', 'or', 'a', 'an', 'to', 'in'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * The header's three lines, as in the sketch:
 *   Punch
 *   Monk — Level 5
 *   Way of the Open Hand
 * A multiclass character shows its full progression on the second line.
 */
export function identityLines(character) {
  const name = character?.name || character?.character_name || 'Unnamed hero';
  const level = Number(character?.level) || 1;
  const progression = formatClassProgression(character || {});
  if (progression.includes('/')) return { name, classLine: progression, subclassLine: '' };
  const className = titleCase(character?.character_class || character?.class_name || '') || 'Adventurer';
  return {
    name,
    classLine: `${className} — Level ${level}`,
    subclassLine: titleCase(character?.subclass || ''),
  };
}

export function portraitUrlFor(character) {
  const url = String(character?.portrait_url || character?.image_url || character?.avatar_url || '').trim();
  return /^(https?:|data:image\/|\/)/i.test(url) ? url : '';
}

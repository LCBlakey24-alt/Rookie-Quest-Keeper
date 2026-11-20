/**
 * Which saving throws a character is proficient in.
 *
 * The creator always stores `saving_throw_proficiencies`. An imported sheet
 * whose saves text was blank, or an older record, can arrive with an empty
 * list, and then every save was shown without proficiency. Saving throw
 * proficiencies come from the starting class (multiclassing never adds
 * them), so an empty list falls back to that class's SRD saves. A stored,
 * non-empty list is always used as it is.
 */
import { CLASSES } from '@/data/characterRules5e';

const ABILITY_KEYS = {
  str: 'strength', dex: 'dexterity', con: 'constitution',
  int: 'intelligence', wis: 'wisdom', cha: 'charisma',
};

/** 'STR', 'Strength', 'Con save' -> full ability name; anything else -> ''. */
export function normaliseSaveAbility(value) {
  const text = String(value?.name || value || '').toLowerCase().replace(/[^a-z]/g, '').replace(/(savingthrow|save)$/, '');
  if (ABILITY_KEYS[text]) return ABILITY_KEYS[text];
  return Object.values(ABILITY_KEYS).includes(text) ? text : '';
}

function startingClassName(character = {}) {
  const named = String(character?.character_class || character?.class_name || '').split(/[\/,(]/)[0].trim();
  if (named) return named;
  const first = Object.keys(character?.class_levels || character?.multiclass_levels || {})[0];
  if (first) return first;
  const listed = Array.isArray(character?.classes) ? character.classes[0] : null;
  return String(listed?.name || listed?.class_name || '').trim();
}

function classSaves(character) {
  const wanted = startingClassName(character).toLowerCase();
  if (!wanted) return [];
  const entry = Object.values(CLASSES).find((option) => String(option?.name || '').toLowerCase() === wanted);
  return Array.isArray(entry?.savingThrows) ? entry.savingThrows : [];
}

/** Full ability names ('strength', ...) the character adds proficiency to. */
export function getSaveProficiencies(character = {}) {
  const stored = Array.isArray(character?.saving_throw_proficiencies)
    ? character.saving_throw_proficiencies.map(normaliseSaveAbility).filter(Boolean)
    : [];
  return [...new Set(stored.length ? stored : classSaves(character))];
}

export function isSaveProficient(character, ability) {
  const wanted = normaliseSaveAbility(ability);
  return Boolean(wanted) && getSaveProficiencies(character).includes(wanted);
}

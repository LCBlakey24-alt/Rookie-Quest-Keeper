/**
 * Conditions on the hexagon sheet: which ones a character has, what each
 * one means in a line, and the label for the button that opens them.
 *
 * A character's conditions are a list of lower-case ids ("poisoned"), the
 * same list the classic sheet and the GM's tools read. Exhaustion is a level,
 * tracked elsewhere, so it is not in this list. Anything already saved that
 * this list does not know (a GM's own condition) is kept, never dropped.
 */

import { CONDITION_EFFECTS } from '@/data/conditionEffects';

export const SHEET_CONDITIONS = Object.entries(CONDITION_EFFECTS)
  .filter(([id]) => id !== 'exhaustion')
  .map(([id, effect]) => ({ id, label: effect.label, note: effect.notes || '' }));

const KNOWN = new Map(SHEET_CONDITIONS.map((condition) => [condition.id, condition]));

const idOf = (value) => String(value || '').trim().toLowerCase();

/** The saved list, tidied: lower-case ids, no blanks, no repeats, order kept. */
export function normaliseConditions(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map(idOf).filter((id) => {
    if (!id || id === 'exhaustion' || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** A condition's display name; an unknown one is shown as written, capitalised. */
export function conditionLabel(id) {
  const key = idOf(id);
  return KNOWN.get(key)?.label || key.replace(/(^|[\s-])\w/g, (letter) => letter.toUpperCase());
}

/** Add the condition if the character does not have it, otherwise remove it. */
export function toggleCondition(list, id) {
  const current = normaliseConditions(list);
  const key = idOf(id);
  if (!key) return current;
  return current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key];
}

/** What the sheet's button says: "Conditions", "Poisoned", "Poisoned, Prone" or "3 conditions". */
export function conditionsSummary(list) {
  const current = normaliseConditions(list);
  if (!current.length) return 'Conditions';
  if (current.length <= 2) return current.map(conditionLabel).join(', ');
  return `${current.length} conditions`;
}

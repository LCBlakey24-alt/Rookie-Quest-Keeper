/**
 * Which dice dye this viewer has chosen.
 *
 * This is a cosmetic, per-viewer preference, so it lives in localStorage
 * rather than on the account: nothing about a table depends on it, and it
 * should not need a round trip or a login to take effect.
 *
 * Every access is wrapped, because localStorage throws in a private window
 * and comes back empty when site data is cleared. A viewer with storage
 * blocked simply gets the default dye for the session.
 */

import { DEFAULT_DYE_ID, getDye } from '@/components/dice3d/diceDyes';

const STORAGE_KEY = 'rq-dice-dye';
export const DICE_DYE_CHANGED = 'rq-dice-dye-changed';

export function loadDiceDyeId() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // getDye falls back for anything unrecognised, so a stale or hand-edited
    // value cannot leave the tray without a palette.
    return stored && getDye(stored).id === stored ? stored : DEFAULT_DYE_ID;
  } catch (error) {
    return DEFAULT_DYE_ID;
  }
}

export function saveDiceDyeId(id) {
  const safeId = getDye(id).id;
  try {
    window.localStorage.setItem(STORAGE_KEY, safeId);
  } catch (error) {
    // Nothing to do: the choice still applies for this session.
  }
  try {
    window.dispatchEvent(new CustomEvent(DICE_DYE_CHANGED, { detail: safeId }));
  } catch (error) {
    // Older browsers without CustomEvent still get the saved value on the
    // next roll; only the live update is lost.
  }
  return safeId;
}

/** Subscribe to changes made elsewhere in the app, or in another tab. */
export function subscribeDiceDye(onChange) {
  if (typeof window === 'undefined') return () => {};

  const handleLocal = (event) => onChange(getDye(event.detail).id);
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) onChange(loadDiceDyeId());
  };

  window.addEventListener(DICE_DYE_CHANGED, handleLocal);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(DICE_DYE_CHANGED, handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

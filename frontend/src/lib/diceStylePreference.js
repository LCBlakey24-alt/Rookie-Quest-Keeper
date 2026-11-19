/**
 * How this viewer likes their dice rolled, and which tower design they use.
 *
 *   tray  -- physical dice thrown into the tray (the default)
 *   tower -- physical dice dropped through a dice tower into the tray
 *
 * Either way the roller is the same; only the animation in the result
 * window changes. Reduced motion always gets the flat result card.
 *
 * Like the dice colour, these are cosmetic, per-viewer choices: they live in
 * localStorage, need no account round trip, and never change a result. Every
 * access is wrapped because storage can throw (private windows) or be empty.
 */

import { DEFAULT_TOWER_SKIN_ID, getTowerSkinInfo } from '@/components/dice3d/towerSkinCatalog';

export const DICE_STYLES = [
  { id: 'tray', name: '3D dice tray', blurb: 'Your dice are thrown into the tray.' },
  { id: 'tower', name: '3D dice tower', blurb: 'Your dice drop through a tower, tumble down and shoot out into the tray.' },
];
export const DEFAULT_DICE_STYLE = 'tray';

const STYLE_KEY = 'rq-dice-style';
const SKIN_KEY = 'rq-dice-tower-skin';
export const DICE_STYLE_CHANGED = 'rq-dice-style-changed';

const isStyle = (value) => DICE_STYLES.some((style) => style.id === value);

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // The choice still applies for this session.
  }
  try {
    window.dispatchEvent(new CustomEvent(DICE_STYLE_CHANGED, { detail: { key, value } }));
  } catch (error) {
    // Older browsers pick the saved value up on the next roll.
  }
}

export function loadDiceStyle() {
  const stored = read(STYLE_KEY);
  return isStyle(stored) ? stored : DEFAULT_DICE_STYLE;
}

export function saveDiceStyle(style) {
  const safe = isStyle(style) ? style : DEFAULT_DICE_STYLE;
  write(STYLE_KEY, safe);
  return safe;
}

export function loadTowerSkinId() {
  const stored = read(SKIN_KEY);
  return stored && getTowerSkinInfo(stored).id === stored ? stored : DEFAULT_TOWER_SKIN_ID;
}

export function saveTowerSkinId(id) {
  const safe = getTowerSkinInfo(id).id;
  write(SKIN_KEY, safe);
  return safe;
}

/** Subscribe to either preference changing here or in another tab. */
export function subscribeDiceStyle(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handleLocal = () => onChange({ style: loadDiceStyle(), towerSkin: loadTowerSkinId() });
  const handleStorage = (event) => {
    if (event.key === STYLE_KEY || event.key === SKIN_KEY) handleLocal();
  };
  window.addEventListener(DICE_STYLE_CHANGED, handleLocal);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(DICE_STYLE_CHANGED, handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

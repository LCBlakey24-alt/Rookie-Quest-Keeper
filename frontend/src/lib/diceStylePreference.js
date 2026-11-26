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

import { DEFAULT_TOWER_SKIN_ID, TOWER_SKIN_CATALOG, getTowerSkinInfo } from '@/components/dice3d/towerSkinCatalog';

export const DICE_STYLES = [
  { id: 'tray', name: '3D dice tray', blurb: 'Your dice are thrown into the tray.' },
  { id: 'tower', name: '3D dice tower', blurb: 'Your dice drop through a tower, tumble down and shoot out into the tray.' },
];
export const DEFAULT_DICE_STYLE = 'tray';

/** Chosen in place of one design: a different tower drops the dice each roll. */
export const RANDOM_TOWER_SKIN_ID = 'surprise';

/**
 * How the tower's camera opens.
 *   showcase -- a wide shot sweeps round the whole tower before the drop
 *   quick    -- a brief glance, then straight to the dice (faster at the table)
 */
export const TOWER_CAMERAS = [
  { id: 'showcase', name: 'Showcase', blurb: 'A wide shot shows off the tower before the dice drop.', introMs: 1800 },
  { id: 'quick', name: 'Quick drop', blurb: 'A brief glance at the tower, then straight to the dice.', introMs: 500 },
];
export const DEFAULT_TOWER_CAMERA = 'showcase';

const STYLE_KEY = 'rq-dice-style';
const SKIN_KEY = 'rq-dice-tower-skin';
const CAMERA_KEY = 'rq-dice-tower-camera';
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
  if (stored === RANDOM_TOWER_SKIN_ID) return stored;
  return stored && getTowerSkinInfo(stored).id === stored ? stored : DEFAULT_TOWER_SKIN_ID;
}

export function saveTowerSkinId(id) {
  const safe = id === RANDOM_TOWER_SKIN_ID ? id : getTowerSkinInfo(id).id;
  write(SKIN_KEY, safe);
  return safe;
}

/**
 * The design to build for one roll: the saved one, or with "Surprise me" a
 * design picked for this roll (never the same one twice running).
 */
export function resolveTowerSkinId(id, previous = '', random = Math.random) {
  if (id !== RANDOM_TOWER_SKIN_ID) return getTowerSkinInfo(id).id;
  const pool = TOWER_SKIN_CATALOG.map((skin) => skin.id).filter((skinId) => skinId !== previous);
  const choices = pool.length ? pool : TOWER_SKIN_CATALOG.map((skin) => skin.id);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

const isCamera = (value) => TOWER_CAMERAS.some((camera) => camera.id === value);

export function loadTowerCamera() {
  const stored = read(CAMERA_KEY);
  return isCamera(stored) ? stored : DEFAULT_TOWER_CAMERA;
}

export function saveTowerCamera(id) {
  const safe = isCamera(id) ? id : DEFAULT_TOWER_CAMERA;
  write(CAMERA_KEY, safe);
  return safe;
}

/** How long the tower's opening shot lasts for a camera choice, in ms. */
export function towerIntroMsFor(id) {
  return (TOWER_CAMERAS.find((camera) => camera.id === id) || TOWER_CAMERAS[0]).introMs;
}

/** Subscribe to either preference changing here or in another tab. */
export function subscribeDiceStyle(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handleLocal = () => onChange({ style: loadDiceStyle(), towerSkin: loadTowerSkinId(), towerCamera: loadTowerCamera() });
  const handleStorage = (event) => {
    if (event.key === STYLE_KEY || event.key === SKIN_KEY || event.key === CAMERA_KEY) handleLocal();
  };
  window.addEventListener(DICE_STYLE_CHANGED, handleLocal);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(DICE_STYLE_CHANGED, handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

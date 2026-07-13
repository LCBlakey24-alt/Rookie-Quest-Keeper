export const DICE_ROLLER_MODE_KEY = 'rqk.diceRoller.mode';
export const DICE_ROLLER_MODES = {
  TWO_D: '2d',
  THREE_D: '3d',
};

export function normaliseDiceRollerMode(value) {
  return value === DICE_ROLLER_MODES.TWO_D ? DICE_ROLLER_MODES.TWO_D : DICE_ROLLER_MODES.THREE_D;
}

export function detectRecommendedDiceRollerMode() {
  if (typeof window === 'undefined') return DICE_ROLLER_MODES.THREE_D;

  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return DICE_ROLLER_MODES.TWO_D;
    }
  } catch { /* ignore */ }

  try {
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    if ((cores && cores <= 4) || (memory && memory <= 4)) return DICE_ROLLER_MODES.TWO_D;
  } catch { /* ignore */ }

  return DICE_ROLLER_MODES.THREE_D;
}

export function loadDiceRollerMode() {
  if (typeof localStorage === 'undefined') return detectRecommendedDiceRollerMode();
  try {
    const stored = localStorage.getItem(DICE_ROLLER_MODE_KEY);
    return stored ? normaliseDiceRollerMode(stored) : detectRecommendedDiceRollerMode();
  } catch {
    return detectRecommendedDiceRollerMode();
  }
}

export function saveDiceRollerMode(mode) {
  const safeMode = normaliseDiceRollerMode(mode);
  try { localStorage.setItem(DICE_ROLLER_MODE_KEY, safeMode); } catch { /* ignore */ }
  return safeMode;
}

export function diceRollerModeLabel(mode) {
  return normaliseDiceRollerMode(mode) === DICE_ROLLER_MODES.TWO_D ? '2D Lite' : '3D Cinematic';
}

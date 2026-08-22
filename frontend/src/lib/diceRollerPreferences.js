export const DICE_ROLLER_MODE_KEY = 'rqk.diceRoller.mode';
export const DICE_ROLLER_MODES = {
  TWO_D: '2d',
  THREE_D: '3d',
};

export function normaliseDiceRollerMode(value) {
  return value === DICE_ROLLER_MODES.TWO_D ? DICE_ROLLER_MODES.TWO_D : DICE_ROLLER_MODES.THREE_D;
}

export function detectRecommendedDiceRollerMode() {
  // The normal Rookie experience is now the lightweight flat roller.
  // Keep the 3D constant for backwards compatibility with older saved data,
  // but do not choose it automatically on any device.
  return DICE_ROLLER_MODES.TWO_D;
}

export function loadDiceRollerMode() {
  if (typeof localStorage === 'undefined') return DICE_ROLLER_MODES.TWO_D;
  try {
    const stored = localStorage.getItem(DICE_ROLLER_MODE_KEY);
    if (stored === DICE_ROLLER_MODES.THREE_D) {
      // Migrate existing users away from the retired default cinematic view.
      localStorage.setItem(DICE_ROLLER_MODE_KEY, DICE_ROLLER_MODES.TWO_D);
      return DICE_ROLLER_MODES.TWO_D;
    }
    return stored === DICE_ROLLER_MODES.TWO_D ? stored : DICE_ROLLER_MODES.TWO_D;
  } catch {
    return DICE_ROLLER_MODES.TWO_D;
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

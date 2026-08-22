import {
  DICE_ROLLER_MODE_KEY,
  DICE_ROLLER_MODES,
  detectRecommendedDiceRollerMode,
  loadDiceRollerMode,
  saveDiceRollerMode,
} from './diceRollerPreferences';

describe('dice roller preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('uses flat 2D as the default on every device', () => {
    expect(detectRecommendedDiceRollerMode()).toBe(DICE_ROLLER_MODES.TWO_D);
    expect(loadDiceRollerMode()).toBe(DICE_ROLLER_MODES.TWO_D);
  });

  test('migrates an existing cinematic 3D preference back to flat 2D', () => {
    localStorage.setItem(DICE_ROLLER_MODE_KEY, DICE_ROLLER_MODES.THREE_D);

    expect(loadDiceRollerMode()).toBe(DICE_ROLLER_MODES.TWO_D);
    expect(localStorage.getItem(DICE_ROLLER_MODE_KEY)).toBe(DICE_ROLLER_MODES.TWO_D);
  });

  test('keeps an explicit 2D preference', () => {
    saveDiceRollerMode(DICE_ROLLER_MODES.TWO_D);

    expect(loadDiceRollerMode()).toBe(DICE_ROLLER_MODES.TWO_D);
  });
});

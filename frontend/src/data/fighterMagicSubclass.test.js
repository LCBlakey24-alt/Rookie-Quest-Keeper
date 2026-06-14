import {
  getActiveFighterMagicFeatures,
  getFighterMagicSlotProgression,
  getFighterMagicSummary,
  isFighterMagicSubclass,
} from './fighterMagicSubclass';

describe('Fighter magic subclass helpers', () => {
  test('detects the Fighter magic subclass safely', () => {
    expect(isFighterMagicSubclass('Eldritch Knight')).toBe(true);
    expect(isFighterMagicSubclass('eldritchknight')).toBe(true);
    expect(isFighterMagicSubclass('Champion')).toBe(false);
  });

  test('tracks spell slot progression by Fighter level', () => {
    expect(getFighterMagicSlotProgression(2)).toEqual([0, 0, 0, 0]);
    expect(getFighterMagicSlotProgression(3)).toEqual([2, 0, 0, 0]);
    expect(getFighterMagicSlotProgression(7)).toEqual([4, 2, 0, 0]);
    expect(getFighterMagicSlotProgression(13)).toEqual([4, 3, 2, 0]);
    expect(getFighterMagicSlotProgression(19)).toEqual([4, 3, 3, 1]);
  });

  test('tracks active subclass features', () => {
    const keys = getActiveFighterMagicFeatures(10, '2014').map(feature => feature.key);

    expect(keys).toEqual([
      'spellcasting',
      'weapon_bond',
      'war_magic',
      'eldritch_strike',
    ]);
  });

  test('summarises 2024 subclass features and slots', () => {
    const summary = getFighterMagicSummary(18, '2024');

    expect(summary.edition).toBe('2024');
    expect(summary.spellSlots).toEqual([4, 3, 3, 0]);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(['improved_war_magic']);
  });
});

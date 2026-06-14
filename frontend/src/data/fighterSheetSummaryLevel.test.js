import { getFighterClassLevel, getFighterSheetSummary } from './fighterSheetSummary';

describe('Fighter class level detection', () => {
  test('prefers Fighter-specific level fields over total level', () => {
    expect(getFighterClassLevel({ level: 17, fighter_level: 3 })).toBe(3);
    expect(getFighterClassLevel({ level: 17, fighterLevel: 4 })).toBe(4);
    expect(getFighterClassLevel({ level: 17, class_levels: { fighter: 5 } })).toBe(5);
    expect(getFighterClassLevel({ level: 17, classLevels: { Fighter: 7 } })).toBe(7);
  });

  test('can read Fighter level from a class entry list', () => {
    const level = getFighterClassLevel({
      level: 17,
      classes: [
        { name: 'Wizard', level: 14 },
        { name: 'Fighter', level: 3 },
      ],
    });

    expect(level).toBe(3);
  });

  test('uses Fighter class level for sheet summary scaling', () => {
    const summary = getFighterSheetSummary({
      level: 17,
      class_levels: { fighter: 3 },
      subclass: 'Champion',
      rules_edition: '2014',
    });

    expect(summary.level).toBe(3);
    expect(summary.attacksPerAction).toBe(1);
    expect(summary.actionSurgeUses).toBe(1);
    expect(summary.indomitableUses).toBe(0);
    expect(summary.criticalRange).toEqual({ minimum: 19, label: '19–20' });
  });
});

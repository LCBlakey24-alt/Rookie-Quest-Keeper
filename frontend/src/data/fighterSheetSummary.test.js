import { getFighterSheetSummary } from './fighterSheetSummary';

describe('Fighter sheet summary', () => {
  test('returns standard Fighter combat data without Champion subclass details', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', level: 11, rules_edition: '2014' });

    expect(summary.attacksPerAction).toBe(3);
    expect(summary.actionSurgeUses).toBe(1);
    expect(summary.indomitableUses).toBe(1);
    expect(summary.criticalRange).toEqual({ minimum: 20, label: '20' });
    expect(summary.isChampion).toBe(false);
  });

  test('adds Champion critical range and subclass features for Champion Fighters', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Champion', level: 15, rules_edition: '2014' });

    expect(summary.isChampion).toBe(true);
    expect(summary.criticalRange).toEqual({ minimum: 18, label: '18–20' });
    expect(summary.subclassFeatures.map(feature => feature.key)).toContain('superior_critical');
  });

  test('uses 2024 Champion feature differences', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Champion', level: 10, rules_edition: '2024' });

    expect(summary.edition).toBe('2024');
    expect(summary.subclassFeatures.map(feature => feature.key)).toContain('heroic_warrior');
  });
});

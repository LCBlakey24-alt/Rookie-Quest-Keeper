import { getFighterSheetSummary } from './fighterSheetSummary';

describe('Fighter sheet summary', () => {
  test('returns standard Fighter combat data without subclass details', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', level: 11, rules_edition: '2014' });

    expect(summary.attacksPerAction).toBe(3);
    expect(summary.actionSurgeUses).toBe(1);
    expect(summary.indomitableUses).toBe(1);
    expect(summary.criticalRange).toEqual({ minimum: 20, label: '20' });
    expect(summary.isChampion).toBe(false);
    expect(summary.isBattleMaster).toBe(false);
    expect(summary.isMagicSubclass).toBe(false);
  });

  test('adds Champion critical range and subclass features for Champion Fighters', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Champion', level: 15, rules_edition: '2014' });

    expect(summary.isChampion).toBe(true);
    expect(summary.isBattleMaster).toBe(false);
    expect(summary.isMagicSubclass).toBe(false);
    expect(summary.criticalRange).toEqual({ minimum: 18, label: '18–20' });
    expect(summary.subclassFeatures.map(feature => feature.key)).toContain('superior_critical');
  });

  test('uses 2024 Champion feature differences', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Champion', level: 10, rules_edition: '2024' });

    expect(summary.edition).toBe('2024');
    expect(summary.subclassFeatures.map(feature => feature.key)).toContain('heroic_warrior');
  });

  test('flags non-public built-in subclass names as recorded but unsupported', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Battle Master', level: 15, rules_edition: '2014' });

    expect(summary.isUnsupportedSubclass).toBe(true);
    expect(summary.unsupportedSubclassLabel).toBe('Battle Master');
    expect(summary.isBattleMaster).toBe(false);
    expect(summary.battleMaster).toBeNull();
    expect(summary.subclassFeatures).toEqual([]);
    expect(summary.attacksPerAction).toBe(3);
  });

  test('flags listed but unsupported Fighter subclasses instead of silently hiding them', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Samurai', level: 7, rules_edition: '2014' });

    expect(summary.isUnsupportedSubclass).toBe(true);
    expect(summary.unsupportedSubclassLabel).toBe('Samurai');
    expect(summary.subclassFeatures).toEqual([]);
    expect(summary.attacksPerAction).toBe(2);
  });

  test('does not provide built-in spellcasting automation for non-public Fighter subclasses', () => {
    const summary = getFighterSheetSummary({ character_class: 'Fighter', subclass: 'Eldritch Knight', level: 18, rules_edition: '2024' });

    expect(summary.isUnsupportedSubclass).toBe(true);
    expect(summary.isMagicSubclass).toBe(false);
    expect(summary.magicSubclass).toBeNull();
    expect(summary.subclassFeatures).toEqual([]);
  });
});

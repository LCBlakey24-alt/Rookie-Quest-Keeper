import { getRangerSheetSummary } from './rangerSheetSummary';

describe('Ranger sheet summary', () => {
  test('returns 2014 Ranger sheet data', () => {
    const summary = getRangerSheetSummary({ character_class: 'Ranger', level: 5, subclass: 'Hunter', favoredEnemy: 'Beasts', favoredTerrain: 'Forest', fightingStyle: 'Archery' });

    expect(summary.className).toBe('Ranger');
    expect(summary.edition).toBe('2014');
    expect(summary.level).toBe(5);
    expect(summary.isRanger).toBe(true);
    expect(summary.subclassKey).toBe('hunter');
    expect(summary.subclassLabel).toBe('Hunter');
    expect(summary.favoredEnemyLabel).toBe('Beasts');
    expect(summary.favoredTerrainLabel).toBe('Forest');
    expect(summary.fightingStyleLabel).toBe('Archery');
    expect(summary.spellcastingOnline).toBe(true);
    expect(summary.extraAttack).toBe(true);
  });

  test('returns 2024 Ranger sheet data', () => {
    const summary = getRangerSheetSummary({ character_class: 'Ranger', level: 3, rules_edition: '2024', subclass: 'Fey Wanderer', fightingStyle: 'Two-Weapon Fighting' });

    expect(summary.edition).toBe('2024');
    expect(summary.subclassKey).toBe('fey_wanderer');
    expect(summary.favoredEnemyUses).toBe(2);
    expect(summary.favoredTerrainLabel).toBe('');
    expect(summary.spellcastingHint).toBe('Prepared Ranger spell list');
  });

  test('supports multiclass Ranger levels', () => {
    const summary = getRangerSheetSummary({ character_class: 'Fighter', level: 12, class_levels: { Fighter: 7, Ranger: 5 } });

    expect(summary.isRanger).toBe(true);
    expect(summary.level).toBe(5);
    expect(summary.spellcastingLevel).toBe(3);
  });
});

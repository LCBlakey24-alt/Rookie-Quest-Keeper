import {
  getActiveSamuraiFeatures,
  getSamuraiFightingSpiritUses,
  getSamuraiSummary,
  isSamuraiSubclass,
} from './fighterSamurai';

describe('Samurai Fighter helpers', () => {
  test('detects Samurai subclass names safely', () => {
    expect(isSamuraiSubclass('Samurai')).toBe(true);
    expect(isSamuraiSubclass('fighter_samurai')).toBe(true);
    expect(isSamuraiSubclass('Champion')).toBe(false);
  });

  test('tracks Fighting Spirit uses and active feature unlocks', () => {
    expect(getSamuraiFightingSpiritUses(2)).toBe(0);
    expect(getSamuraiFightingSpiritUses(3)).toBe(3);
    expect(getActiveSamuraiFeatures(10).map(feature => feature.key)).toEqual(expect.arrayContaining([
      'fighting_spirit',
      'elegant_courtier',
      'tireless_spirit',
    ]));
  });

  test('summarises Samurai for the Fighter sheet', () => {
    const summary = getSamuraiSummary(15, '2014');

    expect(summary).toMatchObject({ edition: '2014', level: 15, fightingSpiritUses: 3 });
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('rapid_strike');
  });
});

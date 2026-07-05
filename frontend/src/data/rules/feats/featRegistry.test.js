import { canonicalFeatId, FEAT_REGISTRY, getFeatById, getFeatsForRuleset } from './featRegistry';

describe('featRegistry', () => {
  it('creates stable canonical ids for feat names', () => {
    expect(canonicalFeatId('Savage Attacker (Origin)')).toBe('savage-attacker-origin');
    expect(FEAT_REGISTRY.tough.name).toBe('Tough');
  });

  it('looks up feats by canonical id or display name', () => {
    expect(getFeatById('tough')?.name).toBe('Tough');
    expect(getFeatById('Tough')?.rulesets).toEqual(expect.arrayContaining(['2014', '2024']));
  });

  it('returns edition and category scoped feat lists with registry metadata', () => {
    const originFeats = getFeatsForRuleset({ edition: '2024', category: 'origin' });

    expect(originFeats.map(feat => feat.name)).toEqual(expect.arrayContaining(['Tough', 'Crafter']));
    expect(originFeats.every(feat => feat.category === 'origin')).toBe(true);
    expect(originFeats.every(feat => feat.rulesets.includes('2024'))).toBe(true);
  });
});

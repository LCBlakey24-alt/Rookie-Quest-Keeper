import {
  featureFilterBucket,
  filterClassFeatures,
  formatActionCost,
  resolveActionResourceCost,
  resourceDedupeKey,
} from './CleanSheetFeaturesTab';

describe('CleanSheetFeaturesTab homebrew action resources', () => {
  const resources = [
    {
      key: 'scarab_charges',
      label: 'Scarab Charges',
      current: 2,
      max: 9,
      fieldKey: 'scarab_charges',
    },
    {
      key: 'greed_tokens',
      label: 'Greed Tokens',
      current: 4,
      max: 4,
      fieldKey: 'greed_tokens',
    },
  ];

  test('matches singular action cost text to a plural tracked resource', () => {
    const spend = resolveActionResourceCost({
      name: 'Spend Scarab Charge',
      cost: '1 Scarab Charge',
    }, resources);

    expect(spend).toMatchObject({
      amount: 1,
      resource: expect.objectContaining({ key: 'scarab_charges' }),
    });
  });

  test('matches structured resource cost objects from parsed homebrew', () => {
    const spend = resolveActionResourceCost({
      name: 'Hoard Flash',
      resource_cost: { resource: 'Greed Tokens', amount: 2 },
    }, resources);

    expect(spend).toMatchObject({
      amount: 2,
      resource: expect.objectContaining({ key: 'greed_tokens' }),
    });
  });

  test('formats structured costs as safe display text', () => {
    expect(formatActionCost({ resource: 'Greed Tokens', amount: 2 })).toBe('2 Greed Tokens');
    expect(formatActionCost({ scarab_charges: 1 })).toBe('1 Scarab Charges');
    expect(formatActionCost(['bonus action', { resource: 'Scarab Charges', amount: 1 }])).toBe('bonus action • 1 Scarab Charges');
  });

  test('dedupes live resource maps and saved homebrew metadata by readable identity', () => {
    const liveResource = {
      key: 'scarab_charges',
      label: 'Scarab Charges',
      className: 'The Gilded Scarab',
      fieldKey: 'scarab_charges',
    };
    const metadataResource = {
      key: 'Scarab Charges',
      label: 'Scarab Charges',
      className: 'The Gilded Scarab',
    };

    expect(resourceDedupeKey(liveResource)).toBe(resourceDedupeKey(metadataResource));
  });
});


describe('CleanSheetFeaturesTab class feature filters', () => {
  const features = [
    { name: 'Action Surge', type: 'special', source: 'class', description: 'Take one additional action.' },
    { name: 'Second Wind', type: 'bonus_action', source: 'class', uses: '1/short rest' },
    { name: 'Indomitable', type: 'reaction', source: 'class', description: 'Reroll a failed saving throw.' },
    { name: 'Remarkable Athlete', type: 'passive', source: 'subclass', description: 'Improve physical checks.' },
  ];

  test('maps feature types into player-facing filter buckets', () => {
    expect(featureFilterBucket(features[0])).toBe('action');
    expect(featureFilterBucket(features[1])).toBe('bonus');
    expect(featureFilterBucket(features[2])).toBe('reaction');
    expect(featureFilterBucket(features[3])).toBe('passive');
  });

  test('filters by action type without mutating the source list', () => {
    const bonus = filterClassFeatures(features, '', 'bonus');

    expect(bonus.map(feature => feature.name)).toEqual(['Second Wind']);
    expect(features).toHaveLength(4);
  });

  test('searches feature name, rules text, source and uses', () => {
    expect(filterClassFeatures(features, 'saving throw', 'all').map(feature => feature.name))
      .toEqual(['Indomitable']);
    expect(filterClassFeatures(features, 'subclass', 'all').map(feature => feature.name))
      .toEqual(['Remarkable Athlete']);
    expect(filterClassFeatures(features, 'short rest', 'all').map(feature => feature.name))
      .toEqual(['Second Wind']);
  });

  test('combines text search with action-type filtering', () => {
    expect(filterClassFeatures(features, 'action', 'action').map(feature => feature.name))
      .toEqual(['Action Surge']);
    expect(filterClassFeatures(features, 'action', 'reaction')).toEqual([]);
  });
});

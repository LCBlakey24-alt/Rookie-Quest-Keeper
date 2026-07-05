import {
  HOMEBREW_VISIBILITY,
  canShareHomebrewContent,
  createSharedHomebrewCopy,
  filterHomebrewContent,
  getHomebrewSubclassOptions,
  normalizeHomebrewContent,
} from './homebrewContent';

describe('homebrew content helpers', () => {
  const monkSubclass = {
    id: 'monk-shadow-path',
    contentType: 'subclass',
    name: 'Shadow Path',
    baseClass: 'Monk',
    ruleset: '2024',
    ownerUserId: 'user-1',
    visibility: 'private',
    features: [{ level: 3, name: 'Shadow Step' }],
  };

  test('normalizes content defaults for private user-provided records', () => {
    expect(normalizeHomebrewContent({ contentType: 'Subclass', name: '  Test Path ', baseClass: 'Monk' })).toMatchObject({
      id: 'subclass-test_path',
      contentType: 'subclass',
      name: 'Test Path',
      baseClassKey: 'monk',
      ruleset: '2014',
      visibility: HOMEBREW_VISIBILITY.private,
      sourceType: 'user_homebrew',
      license: 'user_provided_private_use',
    });
  });

  test('filters homebrew by type, class, ruleset, and owner', () => {
    const results = filterHomebrewContent([
      monkSubclass,
      { ...monkSubclass, id: 'fighter-path', baseClass: 'Fighter' },
      { ...monkSubclass, id: 'monk-2014', ruleset: '2014' },
      { ...monkSubclass, id: 'other-owner', ownerUserId: 'user-2' },
    ], {
      contentType: 'subclass',
      baseClass: 'Monk',
      ruleset: '2024',
      ownerUserId: 'user-1',
    });

    expect(results.map(result => result.id)).toEqual(['monk-shadow-path']);
  });

  test('turns owned homebrew subclasses into selectable builder options', () => {
    expect(getHomebrewSubclassOptions([monkSubclass], { baseClass: 'Monk', ruleset: '2024', ownerUserId: 'user-1' })).toEqual([
      expect.objectContaining({
        value: 'Shadow Path',
        label: 'Shadow Path',
        homebrew: true,
        custom: true,
        supportedAutomation: true,
        visibility: 'private',
      }),
    ]);
  });

  test('creates accepted shared copies with provenance chain', () => {
    const copy = createSharedHomebrewCopy({
      ...monkSubclass,
      provenance: [{ userId: 'user-1', action: 'created' }],
    }, {
      recipientUserId: 'user-2',
      sharedFromUserId: 'user-1',
    });

    expect(copy).toMatchObject({
      visibility: 'shared_copy',
      ownerUserId: 'user-2',
      createdByUserId: 'user-1',
      originContentId: 'monk-shadow-path',
      parentContentId: 'monk-shadow-path',
      sharedFromUserId: 'user-1',
    });
    expect(copy.provenance).toEqual([
      { userId: 'user-1', action: 'created' },
      { userId: 'user-1', action: 'shared_to', target: 'user-2' },
      { userId: 'user-2', action: 'accepted_copy' },
    ]);
  });

  test('respects share policy by target type', () => {
    const content = normalizeHomebrewContent({
      ...monkSubclass,
      sharePolicy: { allowPrivateShare: true, allowCampaignUse: false, allowPublicListing: false },
    });

    expect(canShareHomebrewContent(content, 'private')).toBe(true);
    expect(canShareHomebrewContent(content, 'campaign')).toBe(false);
    expect(canShareHomebrewContent(content, 'public')).toBe(false);
  });
});

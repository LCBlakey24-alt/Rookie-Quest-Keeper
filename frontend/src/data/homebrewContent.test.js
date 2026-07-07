import {
  HOMEBREW_VISIBILITY,
  buildHomebrewFeatureEntries,
  buildHomebrewSelectionReference,
  canShareHomebrewContent,
  createSharedHomebrewCopy,
  extractHomebrewCollection,
  filterHomebrewContent,
  getHomebrewSubclassOptions,
  mergeOfficialAndHomebrewOptions,
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
        source: 'Homebrew',
      }),
    ]);
  });

  test('extracts typed collections from the homebrew API response shape', () => {
    const response = {
      homebrew: {
        subclass: [monkSubclass],
        feat: [{ id: 'feat-1', content_type: 'feat', name: 'Table Luck', owner_user_id: 'user-1' }],
      },
    };

    expect(extractHomebrewCollection(response, 'subclass')).toEqual([
      expect.objectContaining({ id: 'monk-shadow-path', contentType: 'subclass' }),
    ]);
    expect(extractHomebrewCollection(response).map(item => item.id)).toEqual(['monk-shadow-path', 'feat-1']);
  });

  test('merges homebrew options after official options without duplicating names', () => {
    const options = mergeOfficialAndHomebrewOptions(['Champion', 'Shadow Path'], [
      { value: 'Shadow Path', label: 'Shadow Path', homebrew: true },
      { value: 'Way of Bees', label: 'Way of Bees', homebrew: true },
    ]);

    expect(options).toEqual([
      { value: 'Champion', label: 'Champion', source: 'Official' },
      { value: 'Shadow Path', label: 'Shadow Path', source: 'Official' },
      expect.objectContaining({ value: 'Way of Bees', label: 'Way of Bees (Homebrew)', source: 'Homebrew' }),
    ]);
  });

  test('maps homebrew features into character-sheet-ready feature entries', () => {
    const entries = buildHomebrewFeatureEntries({
      ...monkSubclass,
      features: [
        { level: 1, name: 'Shadow Gift', description: 'You gain a pool of shadow dice.' },
        { level: 6, name: 'Late Shadow', description: 'Too high for this character.' },
      ],
    }, { characterLevel: 3 });

    expect(entries).toEqual([
      expect.objectContaining({
        name: 'Shadow Gift',
        source: 'homebrew',
        homebrew: true,
        homebrewContentId: 'monk-shadow-path',
        homebrewContentName: 'Shadow Path',
      }),
    ]);
  });

  test('builds compact selection references for saved characters', () => {
    expect(buildHomebrewSelectionReference(monkSubclass)).toEqual(expect.objectContaining({
      id: 'monk-shadow-path',
      name: 'Shadow Path',
      contentType: 'subclass',
      source: 'Homebrew Workshop',
      ruleset: '2024',
      visibility: 'private',
    }));
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

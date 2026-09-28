import {
  getLevelUpFeatureUnlocks,
  getLevelUpResourceChanges,
  resourceChangeSummary,
} from './levelUpPreviewRules';

describe('levelUpPreviewRules', () => {
  test('Fighter 1 to 2 previews Action Surge and its resource tracker', () => {
    const character = {
      character_class: 'Fighter',
      level: 1,
      rules_edition: '2014',
      class_levels: { Fighter: 1 },
      constitution: 14,
    };

    const features = getLevelUpFeatureUnlocks({
      character,
      className: 'Fighter',
      classLevelBefore: 1,
      classLevelAfter: 2,
      edition: '2014',
    });
    const resources = getLevelUpResourceChanges({
      character,
      className: 'Fighter',
      classLevelAfter: 2,
      totalLevelAfter: 2,
      edition: '2014',
    });

    expect(features.map(feature => feature.name)).toContain('Action Surge');
    expect(resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'action_surge',
        unlocked: true,
        beforeMax: 0,
        afterMax: 1,
      }),
    ]));
  });

  test('selected Fighter subclass features appear at the subclass level', () => {
    const character = {
      character_class: 'Fighter',
      level: 2,
      rules_edition: '2014',
      class_levels: { Fighter: 2 },
    };

    const features = getLevelUpFeatureUnlocks({
      character,
      className: 'Fighter',
      classLevelBefore: 2,
      classLevelAfter: 3,
      edition: '2014',
      selectedSubclass: 'Champion',
    });

    expect(features).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Improved Critical',
        source: 'subclass',
      }),
    ]));
  });

  test('Monk resource max increases without pretending it is newly unlocked', () => {
    const character = {
      character_class: 'Monk',
      level: 2,
      rules_edition: '2014',
      class_levels: { Monk: 2 },
      resources: {
        ki: { label: 'Ki', current: 1, remaining: 1, max: 2, restore: 'short-rest' },
      },
    };

    const changes = getLevelUpResourceChanges({
      character,
      className: 'Monk',
      classLevelAfter: 3,
      totalLevelAfter: 3,
      edition: '2014',
    });
    const ki = changes.find(change => change.key === 'ki');

    expect(ki).toMatchObject({
      unlocked: false,
      maxChanged: true,
      beforeMax: 2,
      afterMax: 3,
    });
    expect(resourceChangeSummary(ki)).toContain('2 → 3 max');
  });

  test('Bard level 5 previews its recovery cadence change even when max is unchanged', () => {
    const character = {
      character_class: 'Bard',
      level: 4,
      charisma: 18,
      rules_edition: '2014',
      class_levels: { Bard: 4 },
    };

    const changes = getLevelUpResourceChanges({
      character,
      className: 'Bard',
      classLevelAfter: 5,
      totalLevelAfter: 5,
      edition: '2014',
    });
    const inspiration = changes.find(change => change.key === 'bardic_inspiration');

    expect(inspiration).toMatchObject({
      maxChanged: false,
      recoveryChanged: true,
      beforeRestore: 'long-rest',
      afterRestore: 'short-rest',
    });
  });

  test('adding Paladin as a multiclass previews Lay on Hands without changing Fighter resources', () => {
    const character = {
      character_class: 'Fighter',
      level: 3,
      rules_edition: '2014',
      class_levels: { Fighter: 3 },
      resources: {
        second_wind: { label: 'Second Wind', current: 1, max: 1, restore: 'short-rest' },
        action_surge: { label: 'Action Surge', current: 1, max: 1, restore: 'short-rest' },
      },
    };

    const changes = getLevelUpResourceChanges({
      character,
      className: 'Paladin',
      classLevelAfter: 1,
      totalLevelAfter: 4,
      edition: '2014',
    });

    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'lay_on_hands',
        unlocked: true,
        afterMax: 5,
      }),
    ]));
    expect(changes.some(change => change.key === 'second_wind')).toBe(false);
    expect(changes.some(change => change.key === 'action_surge')).toBe(false);
  });
});

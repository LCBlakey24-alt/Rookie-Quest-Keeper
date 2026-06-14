import { buildInitialClassResources, getClassResourceRules, restoreClassResources } from './classResourceRules';

const fighter = {
  character_class: 'Fighter',
  level: 1,
};

describe('Fighter class resources', () => {
  test('2014 fighter starts with one short-rest Second Wind', () => {
    const resources = buildInitialClassResources({ ...fighter, rules_edition: '2014', level: 1 });

    expect(resources.second_wind).toMatchObject({
      max: 1,
      current: 1,
      remaining: 1,
      restore: 'short-rest',
    });
    expect(resources.action_surge).toBeUndefined();
  });

  test('2024 fighter derives Second Wind uses from level when proficiency bonus is missing', () => {
    const resources = buildInitialClassResources({ ...fighter, rules_edition: '2024', level: 9 });

    expect(resources.second_wind).toMatchObject({
      max: 4,
      restore: 'long-rest',
    });
  });

  test('fighter unlocks Action Surge and later gains a second use', () => {
    expect(getClassResourceRules({ ...fighter, level: 2 }).find(rule => rule.key === 'action_surge')).toMatchObject({ maxValue: 1 });
    expect(getClassResourceRules({ ...fighter, level: 17 }).find(rule => rule.key === 'action_surge')).toMatchObject({ maxValue: 2 });
  });

  test('fighter Indomitable scales by level', () => {
    expect(getClassResourceRules({ ...fighter, level: 8 }).find(rule => rule.key === 'indomitable')).toBeUndefined();
    expect(getClassResourceRules({ ...fighter, level: 9 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 1 });
    expect(getClassResourceRules({ ...fighter, level: 13 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 2 });
    expect(getClassResourceRules({ ...fighter, level: 17 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 3 });
  });

  test('long rest restores fighter resources and updates stale maximums', () => {
    const restored = restoreClassResources({
      ...fighter,
      rules_edition: '2024',
      level: 17,
      resources: {
        second_wind: { current: 0, remaining: 0, max: 2, restore: 'long-rest' },
        action_surge: { current: 0, remaining: 0, max: 1, restore: 'short-rest' },
        indomitable: { current: 0, remaining: 0, max: 1, restore: 'long-rest' },
      },
    }, 'long-rest');

    expect(restored.second_wind).toMatchObject({ current: 6, remaining: 6, max: 6 });
    expect(restored.action_surge).toMatchObject({ current: 2, remaining: 2, max: 2 });
    expect(restored.indomitable).toMatchObject({ current: 3, remaining: 3, max: 3 });
  });
});

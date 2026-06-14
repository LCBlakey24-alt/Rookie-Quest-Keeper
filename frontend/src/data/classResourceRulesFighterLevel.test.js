import { getClassResourceRules } from './classResourceRules';

describe('Fighter resource class level scaling', () => {
  test('uses Fighter class level instead of total level for Fighter resources', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 17,
      class_levels: { fighter: 3 },
      subclass: 'Battle Master',
    });

    expect(rules.find(rule => rule.key === 'action_surge')).toMatchObject({ maxValue: 1 });
    expect(rules.find(rule => rule.key === 'indomitable')).toBeUndefined();
    expect(rules.find(rule => rule.key === 'superiority_dice')).toMatchObject({ maxValue: 4 });
  });
});

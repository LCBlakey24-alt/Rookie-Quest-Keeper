import { getClassResourceRules } from './classResourceRules';

describe('Barbarian class resource rules', () => {
  test('uses Barbarian class level for multiclass rage uses', () => {
    const rules = getClassResourceRules({ character_class: 'Barbarian', level: 12, class_levels: { Barbarian: 3, Fighter: 9 } });
    expect(rules.find(rule => rule.key === 'rage').maxValue).toBe(3);
  });

  test('keeps 2024 level 20 rage capped at six uses', () => {
    const rules = getClassResourceRules({ character_class: 'Barbarian', level: 20, rules_edition: '2024' });
    expect(rules.find(rule => rule.key === 'rage').maxValue).toBe(6);
  });

  test('keeps 2014 level 20 rage effectively unlimited', () => {
    const rules = getClassResourceRules({ character_class: 'Barbarian', level: 20, rules_edition: '2014' });
    expect(rules.find(rule => rule.key === 'rage').maxValue).toBe(99);
  });
});

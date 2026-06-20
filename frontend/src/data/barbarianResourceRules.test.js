import { getClassResourceRules } from './classResourceRules';

describe('Barbarian class resource rules', () => {
  test('uses Barbarian class level for class_levels rage uses', () => {
    const rules = getClassResourceRules({ character_class: 'Barbarian', level: 12, class_levels: { Barbarian: 3, Fighter: 9 } });
    expect(rules.find(rule => rule.key === 'rage').maxValue).toBe(3);
  });

  test('uses Barbarian class level from multiclass_levels rage uses', () => {
    const rules = getClassResourceRules({ character_class: 'Barbarian', level: 12, multiclass_levels: { Barbarian: 3, Fighter: 9 } });
    expect(rules.find(rule => rule.key === 'rage').maxValue).toBe(3);
  });

  test('includes Rage resources for secondary Barbarians', () => {
    const rules = getClassResourceRules({ character_class: 'Fighter', level: 12, multiclass_levels: { Fighter: 9, Barbarian: 3 } });
    expect(rules.find(rule => rule.key === 'rage')).toMatchObject({ className: 'Barbarian', maxValue: 3 });
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

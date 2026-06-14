import { getClassResourceRules } from './classResourceRules';

describe('class resource rules', () => {
  test('fighter resources use fighter class level when multiclassed', () => {
    const character = {
      character_class: 'Fighter',
      level: 20,
      multiclass_levels: { Fighter: 9, Wizard: 11 },
      subclass: 'Battle Master',
      proficiency_bonus: 6,
    };

    const rules = getClassResourceRules(character);
    const byKey = Object.fromEntries(rules.map(rule => [rule.key, rule]));

    expect(byKey.action_surge.maxValue).toBe(1);
    expect(byKey.indomitable.maxValue).toBe(1);
    expect(byKey.superiority_dice.maxValue).toBe(5);
  });

  test('fighter 17 gains second action surge and three indomitable uses', () => {
    const character = {
      character_class: 'Fighter',
      level: 17,
      subclass: 'Champion',
    };

    const rules = getClassResourceRules(character);
    const byKey = Object.fromEntries(rules.map(rule => [rule.key, rule]));

    expect(byKey.action_surge.maxValue).toBe(2);
    expect(byKey.indomitable.maxValue).toBe(3);
  });
});

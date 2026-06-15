import { buildInitialClassResources, getClassResourceRules } from './classResourceRules';

describe('monk resource rules', () => {
  test('uses Monk class level for Ki/Discipline resources', () => {
    expect(getClassResourceRules({ character_class: 'Monk', level: 5 }).find(rule => rule.key === 'ki').maxValue).toBe(5);
    expect(getClassResourceRules({ character_class: 'Fighter', level: 10, classLevels: { Monk: 3 } }).find(rule => rule.key === 'ki').maxValue).toBe(3);
  });

  test('renames Monk resource for 2024 rules', () => {
    expect(buildInitialClassResources({ character_class: 'Monk', level: 4, rules_edition: '2024' }).ki.label).toBe('Discipline Points');
  });
});

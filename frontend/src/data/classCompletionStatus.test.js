import { getClassCompletionDashboard, getClassCompletionPercent, getNextClassToComplete } from './classCompletionStatus';

describe('class completion dashboard', () => {
  test('marks completed class packages as complete', () => {
    const dashboard = getClassCompletionDashboard();

    ['Fighter', 'Barbarian', 'Rogue', 'Monk', 'Paladin', 'Ranger', 'Bard', 'Cleric', 'Druid'].forEach(className => {
      expect(dashboard.find(entry => entry.className === className)).toMatchObject({
        percent: 100,
        status: 'complete',
        missing: [],
      });
    });
  });

  test('identifies Wizard as the next class to finish', () => {
    expect(getNextClassToComplete()).toMatchObject({ className: 'Wizard', status: 'next' });
  });

  test('tracks Wizard progression helper progress', () => {
    const dashboard = getClassCompletionDashboard();
    const wizard = dashboard.find(entry => entry.className === 'Wizard');

    expect(wizard).toMatchObject({
      percent: 30,
      status: 'next',
    });
    expect(wizard.missing).not.toContain('Progression helper');
  });

  test('calculates percentages from completed checklist items', () => {
    expect(getClassCompletionPercent({ completed: ['core_class_data'] })).toBe(10);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'resource_rules'] })).toBe(20);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'progression_helper', 'resource_rules'] })).toBe(30);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules'] })).toBe(40);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules', 'subclass_summary'] })).toBe(50);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules', 'builder_options', 'builder_readiness', 'subclass_summary'] })).toBe(70);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules', 'builder_options', 'builder_readiness', 'sheet_summary', 'subclass_summary'] })).toBe(80);
  });
});

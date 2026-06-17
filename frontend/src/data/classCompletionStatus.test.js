import { getClassCompletionDashboard, getClassCompletionPercent, getNextClassToComplete } from './classCompletionStatus';

describe('class completion dashboard', () => {
  test('marks completed class packages as complete', () => {
    const dashboard = getClassCompletionDashboard();

    ['Fighter', 'Barbarian', 'Rogue', 'Monk', 'Paladin', 'Ranger', 'Bard', 'Cleric', 'Druid', 'Wizard'].forEach(className => {
      expect(dashboard.find(entry => entry.className === className)).toMatchObject({
        percent: 100,
        status: 'complete',
        missing: [],
      });
    });
  });

  test('identifies Warlock as the next class to finish', () => {
    expect(getNextClassToComplete()).toMatchObject({ className: 'Warlock', status: 'next' });
  });

  test('tracks Warlock progression helper progress', () => {
    const dashboard = getClassCompletionDashboard();
    const warlock = dashboard.find(entry => entry.className === 'Warlock');

    expect(warlock).toMatchObject({
      percent: 30,
      status: 'next',
    });
    expect(warlock.missing).not.toContain('Progression helper');
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

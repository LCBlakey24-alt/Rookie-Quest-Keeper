import { getClassCompletionDashboard, getClassCompletionPercent, getNextClassToComplete } from './classCompletionStatus';

describe('class completion dashboard', () => {
  test('marks completed class packages as complete', () => {
    const dashboard = getClassCompletionDashboard();

    ['Fighter', 'Barbarian', 'Rogue', 'Monk', 'Paladin', 'Ranger', 'Bard', 'Cleric'].forEach(className => {
      expect(dashboard.find(entry => entry.className === className)).toMatchObject({
        percent: 100,
        status: 'complete',
        missing: [],
      });
    });
  });

  test('identifies Druid as the next class to finish', () => {
    expect(getNextClassToComplete()).toMatchObject({ className: 'Druid', status: 'next' });
  });

  test('tracks Druid detection and progression helper progress', () => {
    const dashboard = getClassCompletionDashboard();
    const druid = dashboard.find(entry => entry.className === 'Druid');

    expect(druid).toMatchObject({
      percent: 40,
      status: 'next',
    });
    expect(druid.missing).not.toContain('Character detection helper');
    expect(druid.missing).not.toContain('Progression helper');
  });

  test('calculates percentages from completed checklist items', () => {
    expect(getClassCompletionPercent({ completed: ['core_class_data'] })).toBe(10);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'resource_rules'] })).toBe(20);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'progression_helper', 'resource_rules'] })).toBe(30);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules'] })).toBe(40);
  });
});

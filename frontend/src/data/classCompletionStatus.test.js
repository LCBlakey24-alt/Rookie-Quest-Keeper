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

  test('tracks Druid progression helper progress', () => {
    const dashboard = getClassCompletionDashboard();
    expect(dashboard.find(entry => entry.className === 'Druid')).toMatchObject({
      percent: 30,
      status: 'next',
    });
    expect(dashboard.find(entry => entry.className === 'Druid').missing).not.toContain('Progression helper');
  });

  test('calculates percentages from completed checklist items', () => {
    expect(getClassCompletionPercent({ completed: ['core_class_data'] })).toBe(10);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'resource_rules'] })).toBe(20);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'progression_helper', 'resource_rules'] })).toBe(30);
  });
});

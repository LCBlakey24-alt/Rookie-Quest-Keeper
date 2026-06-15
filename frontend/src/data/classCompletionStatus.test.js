import { getClassCompletionDashboard, getClassCompletionPercent, getNextClassToComplete } from './classCompletionStatus';

describe('class completion dashboard', () => {
  test('marks Fighter and Barbarian as complete', () => {
    const dashboard = getClassCompletionDashboard();
    expect(dashboard.find(entry => entry.className === 'Fighter')).toMatchObject({ percent: 100, status: 'complete', missing: [] });
    expect(dashboard.find(entry => entry.className === 'Barbarian')).toMatchObject({ percent: 100, status: 'complete', missing: [] });
  });

  test('identifies Ranger as the next class to finish', () => {
    expect(getNextClassToComplete()).toMatchObject({ className: 'Ranger', status: 'next' });
  });

  test('calculates percentages from completed checklist items', () => {
    expect(getClassCompletionPercent({ completed: ['core_class_data'] })).toBe(10);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'resource_rules'] })).toBe(20);
  });
});

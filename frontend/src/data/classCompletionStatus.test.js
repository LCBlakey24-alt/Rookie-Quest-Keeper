import { getClassCompletionDashboard, getClassCompletionPercent, getNextClassToComplete } from './classCompletionStatus';

describe('class completion dashboard', () => {
  test('marks completed class packages as complete', () => {
    const dashboard = getClassCompletionDashboard();

    ['Fighter', 'Barbarian', 'Rogue', 'Monk', 'Paladin', 'Ranger', 'Bard'].forEach(className => {
      expect(dashboard.find(entry => entry.className === className)).toMatchObject({
        percent: 100,
        status: 'complete',
        missing: [],
      });
    });
  });

  test('identifies Cleric as the next class to finish', () => {
    expect(getNextClassToComplete()).toMatchObject({ className: 'Cleric', status: 'next' });
  });

  test('calculates percentages from completed checklist items', () => {
    expect(getClassCompletionPercent({ completed: ['core_class_data'] })).toBe(10);
    expect(getClassCompletionPercent({ completed: ['core_class_data', 'resource_rules'] })).toBe(20);
  });
});

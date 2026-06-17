import { getClassCompletionAudit, getUnsupportedCompletedClasses } from './classCompletionAudit';

describe('class completion audit', () => {
  test('all classes marked complete have package exports that support their checklist claims', () => {
    expect(getUnsupportedCompletedClasses()).toEqual([]);
  });

  test('audits completed class claims against concrete package helper exports', () => {
    const completed = getClassCompletionAudit().filter(entry => entry.status === 'complete');
    expect(completed.map(entry => entry.className)).toEqual(['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Wizard']);
    completed.forEach(entry => {
      expect(entry.percent).toBe(100);
      expect(entry.supported).toBe(true);
      expect(entry.missingExports).toEqual([]);
    });
  });
});

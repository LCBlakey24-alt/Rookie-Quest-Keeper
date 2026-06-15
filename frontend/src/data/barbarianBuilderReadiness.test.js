import { getBarbarianBuilderChoiceSummary } from './barbarianBuilderChoiceSummary';
import { getBarbarianBuilderReadiness } from './barbarianBuilderReadiness';

describe('Barbarian builder readiness', () => {
  test('summarises required 2024 level 1 weapon mastery choices', () => {
    const summary = getBarbarianBuilderChoiceSummary(1, '2024');

    expect(summary.hasRequiredChoices).toBe(true);
    expect(summary.sections).toEqual([
      expect.objectContaining({ key: 'weapon_mastery', label: 'Weapon Mastery', required: true, count: 2 }),
    ]);
  });

  test('summarises required subclass choice at level 3', () => {
    const summary = getBarbarianBuilderChoiceSummary(3, '2014');

    expect(summary.sections).toEqual([
      expect.objectContaining({ key: 'subclass', label: 'Subclass', required: true, count: 1 }),
    ]);
  });

  test('reports ready when required 2024 mastery choices are made', () => {
    const readiness = getBarbarianBuilderReadiness({
      level: 1,
      edition: '2024',
      weaponMasteries: ['Cleave', 'Topple'],
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.errors).toEqual([]);
    expect(readiness.missingSections).toEqual([]);
  });

  test('reports missing subclass and mastery sections', () => {
    const readiness = getBarbarianBuilderReadiness({ level: 3, edition: '2024' });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toContain('Subclass');
    expect(readiness.missingSections).toContain('Weapon Mastery');
  });

  test('reports invalid mastery errors', () => {
    const readiness = getBarbarianBuilderReadiness({
      level: 1,
      edition: '2024',
      weaponMasteries: ['Cleave', 'Fake Mastery'],
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.errors).toContain('Choose valid Weapon Mastery options.');
  });
});

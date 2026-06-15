import { getMonkBuilderChoiceSummary } from './monkBuilderChoiceSummary';
import { getMonkBuilderOptions, isValidMonkSubclass, validateMonkBuilderSelections } from './monkBuilderOptions';
import { getMonkSubclassOptions } from './monkSubclasses';
import { getMonkBuilderReadiness } from './monkBuilderReadiness';

describe('Monk builder options and readiness', () => {
  test('returns 2014 and 2024 subclass options', () => {
    expect(getMonkSubclassOptions('2014').map(option => option.key)).toEqual(['open_hand', 'shadow', 'four_elements']);
    expect(getMonkSubclassOptions('2024').map(option => option.key)).toEqual(['open_hand', 'shadow', 'elements', 'mercy']);
  });

  test('validates subclass selections by rules edition', () => {
    expect(isValidMonkSubclass('Way of the Open Hand', '2014')).toBe(true);
    expect(isValidMonkSubclass('open_hand', '2024')).toBe(true);
    expect(isValidMonkSubclass('mercy', '2024')).toBe(true);
    expect(isValidMonkSubclass('mercy', '2014')).toBe(false);
  });

  test('does not require subclass before level 3', () => {
    const options = getMonkBuilderOptions(2, '2014');

    expect(options.needsSubclass).toBe(false);
    expect(options.requiredChoiceLabels).toEqual([]);
    expect(getMonkBuilderReadiness({ level: 2 }).ready).toBe(true);
  });

  test('requires subclass from level 3 onwards', () => {
    const summary = getMonkBuilderChoiceSummary(3, '2024');

    expect(summary.hasRequiredChoices).toBe(true);
    expect(summary.sections).toEqual([
      expect.objectContaining({ key: 'subclass', label: 'Subclass', required: true, count: 1 }),
    ]);
  });

  test('keeps subclass requirement active after level 3', () => {
    const readiness = getMonkBuilderReadiness({ level: 6, edition: '2014' });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toContain('Subclass');
    expect(readiness.errors).toContain('Choose a Monk subclass.');
  });

  test('passes readiness when a valid subclass is selected', () => {
    const readiness = getMonkBuilderReadiness({ level: 6, edition: '2024', subclass: 'Warrior of Shadow' });

    expect(readiness.ready).toBe(true);
    expect(readiness.errors).toEqual([]);
    expect(readiness.missingSections).toEqual([]);
  });

  test('validates builder selections directly', () => {
    expect(validateMonkBuilderSelections({ level: 3, edition: '2014', subclass: '' }).valid).toBe(false);
    expect(validateMonkBuilderSelections({ level: 3, edition: '2014', subclass: 'Way of Shadow' }).valid).toBe(true);
  });
});

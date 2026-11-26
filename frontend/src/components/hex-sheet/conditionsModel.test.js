import { SHEET_CONDITIONS, conditionLabel, conditionsSummary, normaliseConditions, toggleCondition } from './conditionsModel';

describe('sheet conditions', () => {
  test('lists the standard conditions, each with a one-line reminder, and not exhaustion', () => {
    const ids = SHEET_CONDITIONS.map((condition) => condition.id);
    expect(ids).toEqual(expect.arrayContaining(['blinded', 'poisoned', 'prone', 'restrained', 'unconscious']));
    expect(ids).not.toContain('exhaustion');
    SHEET_CONDITIONS.forEach((condition) => {
      expect(condition.label).toBeTruthy();
      expect(condition.note).toBeTruthy();
    });
  });

  test('tidies a saved list without dropping a GM\'s own condition', () => {
    expect(normaliseConditions(['Poisoned', ' prone ', 'poisoned', '', null, 'Cursed by the Lantern'])).toEqual(['poisoned', 'prone', 'cursed by the lantern']);
    expect(normaliseConditions(undefined)).toEqual([]);
    expect(conditionLabel('cursed by the lantern')).toBe('Cursed By The Lantern');
    expect(conditionLabel('POISONED')).toBe('Poisoned');
  });

  test('toggling adds, then removes, and keeps the others', () => {
    const once = toggleCondition(['prone'], 'poisoned');
    expect(once).toEqual(['prone', 'poisoned']);
    expect(toggleCondition(once, 'Prone')).toEqual(['poisoned']);
    expect(toggleCondition(['prone'], '')).toEqual(['prone']);
  });

  test('the button names up to two conditions, then counts them', () => {
    expect(conditionsSummary([])).toBe('Conditions');
    expect(conditionsSummary(['poisoned'])).toBe('Poisoned');
    expect(conditionsSummary(['poisoned', 'prone'])).toBe('Poisoned, Prone');
    expect(conditionsSummary(['poisoned', 'prone', 'blinded'])).toBe('3 conditions');
  });
});

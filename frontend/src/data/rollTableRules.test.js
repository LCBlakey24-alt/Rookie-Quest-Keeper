import {
  parseRollTableDie,
  parseRollTableRange,
  resolveRollTableResult,
} from './rollTableRules';

describe('GM roll table rules', () => {
  test('parses single values, normal ranges, and en-dash ranges', () => {
    expect(parseRollTableRange('7')).toEqual({ min: 7, max: 7 });
    expect(parseRollTableRange('10-12')).toEqual({ min: 10, max: 12 });
    expect(parseRollTableRange('20–18')).toEqual({ min: 18, max: 20 });
    expect(parseRollTableRange('A-B')).toBeNull();
  });

  test('accepts ordinary polyhedral table dice', () => {
    expect(parseRollTableDie('d20')).toBe(20);
    expect(parseRollTableDie('D100')).toBe(100);
    expect(parseRollTableDie('20')).toBeNull();
    expect(parseRollTableDie('d1')).toBeNull();
  });

  test('rolls through the shared die primitive and resolves the matching row', () => {
    const result = resolveRollTableResult({
      die: 'd20',
      entries: [
        { range: '1-5', text: 'Low' },
        { range: '6-15', text: 'Middle' },
        { range: '16-20', text: 'High' },
      ],
    }, () => 0.49);

    expect(result).toEqual({
      valid: true,
      error: '',
      sides: 20,
      roll: 10,
      entry: { range: '6-15', text: 'Middle' },
    });
  });

  test('does not silently substitute the last row when a table has a range gap', () => {
    const result = resolveRollTableResult({
      die: 'd20',
      entries: [
        { range: '1-9', text: 'Low' },
        { range: '11-20', text: 'High' },
      ],
    }, () => 0.49);

    expect(result.valid).toBe(false);
    expect(result.roll).toBe(10);
    expect(result.error).toMatch(/no table row covers/i);
    expect(result.entry).toBeUndefined();
  });

  test('rejects table ranges outside the declared die', () => {
    const result = resolveRollTableResult({
      die: 'd20',
      entries: [{ range: '1-100', text: 'Impossible on d20' }],
    }, () => 0);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/outside d20/i);
  });
});

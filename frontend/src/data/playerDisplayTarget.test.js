import { getPlayerDisplayTarget } from './playerDisplayTarget';

describe('second-screen device target selection', () => {
  test('a TV link wins over an old table broadcast', () => {
    expect(getPlayerDisplayTarget('standing-tv', 'virtual-table')).toBe('standing-tv');
  });
  test('a tabletop link wins over an old TV broadcast', () => {
    expect(getPlayerDisplayTarget('virtual-table', 'standing-tv')).toBe('virtual-table');
  });
  test('legacy links without a target retain the broadcast preference', () => {
    expect(getPlayerDisplayTarget(null, 'virtual-table')).toBe('virtual-table');
    expect(getPlayerDisplayTarget(null, 'standing-tv')).toBe('standing-tv');
    expect(getPlayerDisplayTarget(null, undefined)).toBe('standing-tv');
  });
  test('invalid link values fall back to the saved campaign target', () => {
    expect(getPlayerDisplayTarget('invalid', 'virtual-table')).toBe('virtual-table');
    expect(getPlayerDisplayTarget('invalid', 'invalid')).toBe('standing-tv');
  });
});

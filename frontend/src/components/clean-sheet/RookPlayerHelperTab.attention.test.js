import { hasUrgentRookTips } from './RookPlayerHelperTab';

describe('hasUrgentRookTips', () => {
  const healthy = { max_hit_points: 20, current_hit_points: 20, conditions: [] };

  test('stays quiet for a healthy character with no conditions', () => {
    // The always-available coaching tips must not light the tab, or the marker
    // would never clear.
    expect(hasUrgentRookTips(healthy)).toBe(false);
  });

  test('flags a character at or below half HP', () => {
    expect(hasUrgentRookTips({ ...healthy, current_hit_points: 10 })).toBe(true);
    expect(hasUrgentRookTips({ ...healthy, current_hit_points: 4 })).toBe(true);
  });

  test('does not flag a character just above half HP', () => {
    expect(hasUrgentRookTips({ ...healthy, current_hit_points: 11 })).toBe(false);
  });

  test('flags active conditions even at full HP', () => {
    expect(hasUrgentRookTips({ ...healthy, conditions: ['poisoned'] })).toBe(true);
  });

  test('accepts conditions supplied as a delimited string', () => {
    expect(hasUrgentRookTips({ ...healthy, conditions: 'prone, frightened' })).toBe(true);
  });

  test('clears once the character heals and sheds conditions', () => {
    expect(hasUrgentRookTips({ max_hit_points: 20, current_hit_points: 20, conditions: [] })).toBe(false);
  });

  test('handles missing character and missing stats without throwing', () => {
    expect(hasUrgentRookTips(null)).toBe(false);
    expect(hasUrgentRookTips(undefined)).toBe(false);
    expect(hasUrgentRookTips({})).toBe(false);
  });

  test('supports the legacy max_hp / hp field names', () => {
    expect(hasUrgentRookTips({ max_hp: 30, hp: 9 })).toBe(true);
    expect(hasUrgentRookTips({ max_hp: 30, hp: 30 })).toBe(false);
  });
});

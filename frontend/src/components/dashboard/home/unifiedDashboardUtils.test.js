import { buildWorldSettingNotes, characterMeta, characterTitle, safeArray, statusMessage } from './unifiedDashboardUtils';

describe('unifiedDashboardUtils', () => {
  test('filters dashboard arrays safely and formats character empty state helpers', () => {
    expect(safeArray([null, { name: 'Rook' }, 'bad'])).toEqual([{ name: 'Rook' }]);
    expect(characterTitle({})).toBe('Unnamed Character');
    expect(characterMeta({ level: 2, character_class: 'Fighter' })).toBe('Level 2 Fighter');
  });

  test('builds campaign setup notes without inventing fields', () => {
    expect(buildWorldSettingNotes({ campaign_type: 'long_campaign', starting_point: 'session_zero', world_setting: 'custom', session_zero: ['safety'], description: 'Keep it grounded.' })).toContain('Session zero checklist: Safety tools and table boundaries');
  });

  test('describes backend status for the home dashboard', () => {
    expect(statusMessage('Ready', '10:30 AM')).toContain('Backend is responding normally');
  });
});

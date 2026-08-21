import { buildWorldSettingNotes, characterMeta, characterTitle, safeArray, statusMessage } from './unifiedDashboardUtils';

describe('unifiedDashboardUtils', () => {
  test('filters dashboard arrays safely and formats character empty state helpers', () => {
    expect(safeArray([null, { name: 'Rook' }, 'bad'])).toEqual([{ name: 'Rook' }]);
    expect(characterTitle({})).toBe('Unnamed Character');
    expect(characterMeta({ level: 2, character_class: 'Fighter' })).toBe('Level 2 Fighter');
  });

  test('builds campaign setup notes from fields the current campaign form actually stores', () => {
    const notes = buildWorldSettingNotes({
      campaign_type: 'long_campaign',
      description: 'Keep it grounded.',
    });

    expect(notes).toContain('Campaign type: long_campaign');
    expect(notes).toContain('GM notes: Keep it grounded.');
    expect(notes).not.toContain('Session zero checklist');
  });

  test('describes backend status for the home dashboard', () => {
    expect(statusMessage('Ready', '10:30 AM')).toContain('Backend is responding normally');
  });
});

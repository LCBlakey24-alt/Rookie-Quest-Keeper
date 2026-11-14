import fs from 'fs';
import path from 'path';
import genericSecondScreenPresets from '@/data/genericSecondScreenPresets';

const read = relative => fs.readFileSync(path.join(__dirname, relative), 'utf8');

describe('Universal GM workspace never seeds another GM’s campaign lore', () => {
  test('every generic dashboard tab renders its campaign-scoped tool, not a packaged private world', () => {
    const src = read('../../CampaignDashboard.js');
    expect(src).not.toMatch(/withTiaKarta|TiaKartaCampaignPackPanel|tiaKartaCampaignPack/);
    for (const component of [
      'NPCsConsolidatedTab', 'MapsConsolidatedTab', 'StoryArcTracker',
      'GodsTab', 'ChronicleConsolidatedTab', 'CombatConsolidatedTab',
      'InGameNotesTab', 'GMHandoutsWorkspace',
    ]) {
      expect(src).toContain(component);
    }
  });

  test('default calendar cannot insert campaign-specific reference dates', () => {
    const src = read('../../tabs/CalendarTab.js');
    expect(src).not.toMatch(/Tia.Karta|TIA_KARTA_REFERENCE_EVENTS|applyTiaKarta|spilsby\s+\\s\+wednesday/);
    expect(src).toContain('campaignCalendarMath');
    expect(src).toContain('saveCalendarSettings');
  });

  test('generic remote and Live Play dock offer no named-world revelations', () => {
    const dock = read('../LiveSecondScreenDock.js');
    const page = read('../SecondScreenRemotePage.js');
    const remote = read('../SecondScreenQuickRemote.js');
    expect(dock).toContain('genericSecondScreenPresets');
    expect(page).toContain('SecondScreenQuickRemote');
    for (const source of [dock, page, remote]) {
      expect(source).not.toMatch(/Tia.Karta|tiaKartaSecondScreenPresets|Lucian Grey|Balderin Palace/);
    }
    expect(genericSecondScreenPresets.length).toBeGreaterThan(2);
    expect(genericSecondScreenPresets[0].id).toBe('test-screen');
    expect(JSON.stringify(genericSecondScreenPresets)).not.toMatch(/Tia.Karta|Balderin|Heralds|Spilsby|Lucian/);
  });

  test('generic calendar code is not imported from a named campaign setting', () => {
    const dates = read('../../../data/customCalendarUtilities.js');
    const preview = read('../../../preview/previewApi.js');
    expect(dates).toContain('campaignCalendarMath');
    expect(preview).toContain('campaignCalendarMath');
    expect(dates).not.toContain("from './tiaKartaCalendar'");
  });
});

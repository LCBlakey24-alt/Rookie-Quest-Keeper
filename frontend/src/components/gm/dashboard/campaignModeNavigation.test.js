import {
  campaignCreationRoute,
  campaignModeRoute,
  isCreationModeLocation,
} from './campaignModeNavigation';

describe('GM campaign mode routing', () => {
  test('opens a campaign-specific mode chooser by default', () => {
    expect(campaignModeRoute('camp-7')).toBe('/campaign/camp-7');
    expect(isCreationModeLocation('', '')).toBe(false);
    expect(isCreationModeLocation('?view=notes', '')).toBe(false);
    expect(isCreationModeLocation('?mode=live', '#tab-unknown')).toBe(false);
  });

  test('Creation Mode opens without changing the campaign identity', () => {
    expect(campaignCreationRoute('camp-7')).toBe('/campaign/camp-7?mode=creation');
    expect(isCreationModeLocation('?mode=creation', '')).toBe(true);
    expect(isCreationModeLocation('?mode=creation', '#tab-invalid')).toBe(true);
    expect(campaignCreationRoute('camp-7', 'npcs')).toBe('/campaign/camp-7?mode=creation#tab-npcs');
    expect(campaignCreationRoute('camp-7', 'invalid')).toBe('/campaign/camp-7?mode=creation');
  });

  test('existing campaign tool deep links bypass the chooser', () => {
    expect(isCreationModeLocation('', '#tab-campaign-rules')).toBe(true);
    expect(isCreationModeLocation('', '#tab-command-centre')).toBe(true);
    expect(isCreationModeLocation('', '#npcs')).toBe(true);
    expect(isCreationModeLocation('', '#tab-not-in-the-menu')).toBe(false);
  });

  test('campaign IDs remain a single URL path segment', () => {
    expect(campaignModeRoute('camp/other')).toBe('/campaign/camp%2Fother');
    expect(campaignCreationRoute('camp/other', 'maps')).toBe('/campaign/camp%2Fother?mode=creation#tab-maps');
  });
});

import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

describe('My Campaigns -> campaign -> Creation or Live Play', () => {
  test('My Campaigns opens the campaign, not a global mode picker', () => {
    const library = read('../../MyCampaignsPage.js');
    expect(library).toContain('navigate(`/campaign/${id}`)');
    expect(library).toContain('if (campaignId) navigate(`/campaign/${campaignId}`)');
    expect(library).not.toContain('navigate(`/campaign/${campaignId}#tab-campaign-rules`)');
    expect(library).toContain('navigate(`/player/campaign/${id}`)');
  });

  test('each campaign selects a mode before showing the full prep tools', () => {
    const dashboard = read('../../CampaignDashboard.js');
    expect(dashboard).toContain('isCreationModeLocation(location.search, location.hash)');
    expect(dashboard).toContain('if (choosingMode)');
    expect(dashboard).toContain('<CampaignModeChooser');
    expect(dashboard).toContain('onCreation={() => navigate(campaignCreationRoute(campaignId))}');
    expect(dashboard).toContain('onLive={handleOpenGMScreen}');
    expect(dashboard).toContain('Back to campaign modes');
    expect(dashboard).toContain('CampaignToolFinder');
  });

  test('Live Play can return to mode choice or move directly to Creation Mode', () => {
    const live = read('../LiveSessionGridPage.js');
    expect(live).toContain('navigate(campaignModeRoute(campaignId))');
    expect(live).toContain('navigate(campaignCreationRoute(campaignId))');
    expect(live).toContain('Live Play Mode');
  });
});

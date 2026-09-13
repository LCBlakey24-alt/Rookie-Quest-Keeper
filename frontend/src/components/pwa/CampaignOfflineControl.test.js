import { campaignContextFromPath } from './CampaignOfflineControl';

describe('offline campaign route detection', () => {
  test.each([
    ['/player/campaign/abc123', { campaignId: 'abc123', audience: 'player' }],
    ['/player/campaign/table%20one', { campaignId: 'table one', audience: 'player' }],
    ['/mobile/abc123', { campaignId: 'abc123', audience: 'player' }],
    ['/campaign/abc123', { campaignId: 'abc123', audience: 'gm' }],
    ['/gm-screen/abc123', { campaignId: 'abc123', audience: 'gm' }],
    ['/characters/abc123', { campaignId: '', audience: '' }],
  ])('%s resolves to the correct offline audience', (pathname, expected) => {
    expect(campaignContextFromPath(pathname)).toEqual(expected);
  });
});

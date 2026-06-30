import { combineLinkedCampaigns, summarizeHandouts } from './playerDashboardUtils';

describe('playerDashboardUtils', () => {
  test('combines joined and character-linked campaigns without duplicates', () => {
    const campaigns = [{ id: 'c1', name: 'GM Campaign' }];
    const characters = [{ id: 'hero', name: 'Rook', campaign_id: 'c1' }, { id: 'hero2', name: 'Ash', campaign_id: 'c2', campaign_name: 'Linked Campaign' }];
    expect(combineLinkedCampaigns(campaigns, characters)).toEqual([{ id: 'c1', name: 'GM Campaign' }, { id: 'c2', name: 'Linked Campaign', description: '', from_character: 'Ash' }]);
  });

  test('summarizes handout counts for the player dashboard', () => {
    expect(summarizeHandouts([{ read: false, saved: true }, { read: true, saved: false }])).toEqual({ total: 2, unread: 1, saved: 1 });
  });
});

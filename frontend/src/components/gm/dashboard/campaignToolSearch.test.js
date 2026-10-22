import { findCampaignTools } from './campaignToolSearch';

describe('campaign tool finder', () => {
  it('finds the GM screen when using common table phrases', () => {
    expect(findCampaignTools('npc relationships')[0].id).toBe('npcs');
    expect(findCampaignTools('calendar')[0].id).toBe('chronicle');
    expect(findCampaignTools('bestiary')[0].id).toBe('combat');
    expect(findCampaignTools('music')[0].id).toBe('uploads');
  });
  it('searches across tab groups and does not change route IDs', () => {
    expect(findCampaignTools('notes').map(tab => tab.id)).toContain('ingame-notes');
    expect(findCampaignTools('players')[0].id).toBe('players');
    expect(findCampaignTools('spells homebrew').map(tab => tab.id)).toEqual([]);
  });
  it('shows frequent tools before typing, limits results, and supports case-insensitive labels', () => {
    expect(findCampaignTools('')).toHaveLength(8);
    expect(findCampaignTools('NPC')[0].id).toBe('npcs');
    expect(findCampaignTools('  CALENDAR  ')[0].id).toBe('chronicle');
    expect(findCampaignTools('', 3)).toHaveLength(3);
  });
});

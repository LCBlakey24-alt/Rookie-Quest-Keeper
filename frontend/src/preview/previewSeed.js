import { DEMO_CHARACTER_FIXTURES } from '@/data/demoCharacterFixtures';
import { PREVIEW_USER } from './previewMode';

export const PREVIEW_CAMPAIGN_ID = 'preview-campaign';

export function createPreviewSeed() {
  const now = new Date().toISOString();
  return {
    version: 1,
    campaigns: [{
      id: PREVIEW_CAMPAIGN_ID, name: 'Preview campaign', dm_user_id: PREVIEW_USER, join_code: 'PREV01',
      description: 'A sample table for trying the GM and player tools. Edit this campaign, open a character sheet, or share a handout with the player view.',
      system: 'D&D 5e', rules_edition: '2014', edition: '2014',
      world_name: 'Sample setting', world_setting_notes: 'A private sample GM note.',
      max_character_level: 20, environment: {}, created_at: now, updated_at: now,
    }],
    characters: DEMO_CHARACTER_FIXTURES.slice(0, 2).map(({ character }) => ({
      ...JSON.parse(JSON.stringify(character)), user_id: PREVIEW_USER,
      campaign_id: PREVIEW_CAMPAIGN_ID, campaign_name: 'Preview campaign',
      campaign_join_status: 'active', created_at: now, updated_at: now,
    })),
    collections: {
      [PREVIEW_CAMPAIGN_ID]: {
        timeline: [{ id: 'preview-event', campaign_id: PREVIEW_CAMPAIGN_ID, type: 'session', event_type: 'session', title: 'Try the campaign timeline', description: 'Add an event in the GM view, then open the player view to see it here.', session_number: 1, in_game_date: '', timestamp: now, created_at: now }],
        handouts: [{ id: 'preview-handout', campaign_id: PREVIEW_CAMPAIGN_ID, title: 'Welcome to the preview', category: 'letter', content: 'You can read and save this handout. New handouts shared from the GM pages will appear in this player workspace.', shared_with: [PREVIEW_USER], allow_player_sharing: true, created_at: now }],
        'ingame-notes': [{ id: 'preview-gm-note', campaign_id: PREVIEW_CAMPAIGN_ID, content: 'A sample GM note. Edit it or create another to try session preparation.', created_at: now }],
      },
    },
    notes: [{ id: 'preview-note', campaign_id: PREVIEW_CAMPAIGN_ID, campaign_name: 'Preview campaign', title: 'My first note', content: 'Try editing this note. Your preview changes are saved in this browser.', created_at: now, updated_at: now }],
    recaps: [], receipts: {}, objects: {}, homebrew: [],
  };
}

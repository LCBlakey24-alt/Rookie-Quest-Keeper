import {
  buildRookSystemContext,
  extractCampaignIdFromPath,
  getRookMicroSuggestions,
  getRookPageMeta,
  getRookStarterPrompts,
} from './rookAssistantKnowledge';

describe('rookAssistantKnowledge', () => {
  test('returns page-aware meta for major app routes', () => {
    expect(getRookPageMeta('/home')).toMatchObject({ key: 'dashboard', label: 'Dashboard Guide' });
    expect(getRookPageMeta('/characters')).toMatchObject({ key: 'characters', label: 'Character Builder Coach' });
    expect(getRookPageMeta('/characters/abc123')).toMatchObject({ key: 'character-sheet', label: 'Player Sheet Helper' });
    expect(getRookPageMeta('/campaigns')).toMatchObject({ key: 'campaigns', label: 'Campaign Launcher' });
    expect(getRookPageMeta('/campaign/camp123')).toMatchObject({ key: 'campaign-dashboard', label: 'Campaign Co-GM' });
    expect(getRookPageMeta('/gm-screen/camp123')).toMatchObject({ key: 'gm-live', label: 'Live Play Co-GM' });
    expect(getRookPageMeta('/homebrew')).toMatchObject({ key: 'homebrew', label: 'Homebrew Workshop Assistant' });
    expect(getRookPageMeta('/uploads')).toMatchObject({ key: 'uploads', label: 'Upload & Import Assistant' });
    expect(getRookPageMeta('/admin')).toMatchObject({ key: 'admin', label: 'Admin QA Assistant' });
  });

  test('extracts campaign IDs from campaign, GM, display, and mobile routes', () => {
    expect(extractCampaignIdFromPath('/campaign/camp123')).toBe('camp123');
    expect(extractCampaignIdFromPath('/campaign/camp123/player-display')).toBe('camp123');
    expect(extractCampaignIdFromPath('/gm-screen/camp123')).toBe('camp123');
    expect(extractCampaignIdFromPath('/gm-second-screen/camp123')).toBe('camp123');
    expect(extractCampaignIdFromPath('/player-display/camp123')).toBe('camp123');
    expect(extractCampaignIdFromPath('/mobile/camp123')).toBe('camp123');
    expect(extractCampaignIdFromPath('/characters/char123')).toBe('');
  });

  test('returns starter prompts and quick chips for the current assistant mode', () => {
    expect(getRookStarterPrompts('/gm-screen/camp123')).toContain('Describe this room in 20 seconds');
    expect(getRookMicroSuggestions('/characters/char123')).toContain('Turn checklist');
    expect(getRookMicroSuggestions('/homebrew')).toContain('Balance check');
  });

  test('builds system context with route mode, original pools, and optional page data', () => {
    const context = buildRookSystemContext('/characters/char123', 'CURRENT CHARACTER SHEET CONTEXT:\n- Name: Test Hero');

    expect(context).toContain('You are ROOK');
    expect(context).toContain('Route key: character-sheet');
    expect(context).toContain('Elf names:');
    expect(context).toContain('Orphan/urchin names:');
    expect(context).toContain('Homebrew quality checks:');
    expect(context).toContain('CURRENT CHARACTER SHEET CONTEXT');
    expect(context).toContain('Test Hero');
  });
});

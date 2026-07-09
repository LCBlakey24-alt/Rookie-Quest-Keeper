import {
  extractCharacterIdFromPath,
  fetchCampaignContext,
  getAssistantPathname,
  getRookContextNote,
  isPlayerFacingCampaignPath,
  summarizeCampaignForRook,
  summarizeCharacterForRook,
  truncateText,
} from './rookContextHydration';

describe('rookContextHydration', () => {
  test('normalises assistant pathnames for player display and character edit routes', () => {
    expect(getAssistantPathname('/campaign/camp123/player-display')).toBe('/player-display/global');
    expect(getAssistantPathname('/characters/char123/edit')).toBe('/characters/create/edit');
    expect(getAssistantPathname('/campaign/camp123')).toBe('/campaign/camp123');
  });

  test('detects player-facing campaign routes', () => {
    expect(isPlayerFacingCampaignPath('/player-display/camp123', '/player-display/global')).toBe(true);
    expect(isPlayerFacingCampaignPath('/gm-second-screen/camp123', '/player-display/global')).toBe(true);
    expect(isPlayerFacingCampaignPath('/mobile/camp123', '/mobile/camp123')).toBe(true);
    expect(isPlayerFacingCampaignPath('/campaign/camp123', '/campaign/camp123')).toBe(false);
  });

  test('extracts character IDs from sheet and edit routes only', () => {
    expect(extractCharacterIdFromPath('/characters/char123')).toBe('char123');
    expect(extractCharacterIdFromPath('/characters/char123/edit')).toBe('char123');
    expect(extractCharacterIdFromPath('/characters/create')).toBe('create');
    expect(extractCharacterIdFromPath('/campaign/camp123')).toBe('');
  });

  test('summarises character sheet data for Rook without inventing missing values', () => {
    const context = summarizeCharacterForRook({
      name: 'Mara Emberhand',
      race: 'Human',
      character_class: 'Wizard',
      level: 5,
      subclass: 'Evocation',
      background: 'Scholar',
      current_hit_points: 21,
      max_hit_points: 32,
      armor_class: 13,
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 10,
      charisma: 11,
      feats: [{ name: 'War Caster' }],
      spells_known: [{ name: 'Fireball' }],
      notes: 'Likes solving ancient locks.',
    });

    expect(context).toContain('CURRENT CHARACTER SHEET CONTEXT');
    expect(context).toContain('Mara Emberhand');
    expect(context).toContain('Wizard level 5');
    expect(context).toContain('INT 18');
    expect(context).toContain('War Caster');
    expect(context).toContain('Fireball');
    expect(context).toContain('avoid inventing missing sheet details');
  });

  test('summarises GM campaign context with setting and GM notes', () => {
    const context = summarizeCampaignForRook({
      campaign: {
        name: 'Ashfall Vale',
        system: '5e 2024',
        world_setting: 'gothic_horror',
        world_setting_notes: 'A bleak valley under a red moon.',
        available_classes: ['Fighter', 'Wizard'],
        max_character_level: 12,
      },
      setting: {
        content: 'The mines below Ashfall connect to an older city.',
        dm_rules: 'The count is secretly undead.',
      },
      environment: {
        location: 'Old Road',
        weather: 'rain',
        lighting: 'dusk',
        mood: 'uneasy',
        notes: 'Crows are watching the party.',
      },
      rules: { total_count: 2, rules: [{ name: 'House Rules', source_type: 'manual' }] },
      playerFacing: false,
    });

    expect(context).toContain('CURRENT GM CAMPAIGN CONTEXT');
    expect(context).toContain('Ashfall Vale');
    expect(context).toContain('GM-only rules/notes');
    expect(context).toContain('The count is secretly undead.');
    expect(context).toContain('House Rules');
  });

  test('summarises player-facing campaign context without GM-only notes', () => {
    const context = summarizeCampaignForRook({
      campaign: { name: 'Ashfall Vale', system: '5e 2024', world_setting_notes: 'Public tone note.' },
      setting: { content: 'Secret setting text.', dm_rules: 'The count is secretly undead.' },
      environment: { location: 'Old Road', notes: 'Visible fog covers the path.' },
      rules: { total_count: 1, rules: [{ name: 'Public Rules' }] },
      playerFacing: true,
    });

    expect(context).toContain('CURRENT PLAYER-FACING CAMPAIGN CONTEXT');
    expect(context).toContain('Ashfall Vale');
    expect(context).toContain('Visible fog covers the path.');
    expect(context).toContain('Do not reveal GM-only secrets');
    expect(context).not.toContain('Secret setting text.');
    expect(context).not.toContain('The count is secretly undead.');
  });

  test('fetchCampaignContext skips setting endpoint for player-facing routes', async () => {
    const calls = [];
    const apiClient = {
      get: jest.fn((url) => {
        calls.push(url);
        if (url.includes('/setting')) return Promise.resolve({ data: { dm_rules: 'Secret' } });
        if (url.includes('/environment')) return Promise.resolve({ data: { location: 'Road' } });
        if (url.includes('/custom-rules')) return Promise.resolve({ data: { total_count: 0, rules: [] } });
        return Promise.resolve({ data: { name: 'Player Campaign', system: '5e' } });
      }),
    };

    const context = await fetchCampaignContext(apiClient, 'camp123', true);

    expect(context).toContain('CURRENT PLAYER-FACING CAMPAIGN CONTEXT');
    expect(context).toContain('Player Campaign');
    expect(calls).not.toContain('/campaigns/camp123/setting');
  });

  test('context note reflects the loaded source', () => {
    expect(getRookContextNote({ characterId: 'char123' })).toBe('Character sheet loaded — Rook can answer from this character.');
    expect(getRookContextNote({ campaignId: 'camp123', pageDataContext: 'context' })).toBe('Campaign context loaded — Rook can prep from this campaign.');
    expect(getRookContextNote({ campaignId: 'camp123', pageDataContext: 'context', playerFacingCampaign: true })).toBe('Player-safe campaign context loaded.');
    expect(getRookContextNote({ campaignId: 'camp123' })).toBe('');
  });

  test('truncateText trims long context cleanly', () => {
    expect(truncateText('abcdef', 3)).toBe('abc…');
    expect(truncateText(' short ', 20)).toBe('short');
  });
});

import { importDesktopCampaignPack, mergeDesktopWorkspace } from './desktopCampaignPack';
import { DESKTOP_STORAGE_KEY } from './previewMode';

function workspace(overrides = {}) {
  return {
    version: 1,
    campaigns: [],
    characters: [],
    collections: {},
    notes: [],
    recaps: [],
    receipts: {},
    objects: {},
    homebrew: [],
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('desktop campaign packs', () => {
  test('updates matching pack records while preserving local records', () => {
    const merged = mergeDesktopWorkspace(
      workspace({
        campaigns: [{ id: 'campaign-a', name: 'Old name' }, { id: 'local-only', name: 'Local' }],
        collections: {
          'campaign-a': {
            handouts: [{ id: 'source-1', title: 'Old source' }, { id: 'local-note', title: 'My local note' }],
          },
        },
      }),
      workspace({
        campaigns: [{ id: 'campaign-a', name: 'Updated name' }],
        collections: {
          'campaign-a': {
            handouts: [{ id: 'source-1', title: 'Updated source' }, { id: 'source-2', title: 'New source' }],
          },
        },
      }),
    );

    expect(merged.campaigns).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'campaign-a', name: 'Updated name' }),
      expect.objectContaining({ id: 'local-only', name: 'Local' }),
    ]));
    expect(merged.collections['campaign-a'].handouts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'source-1', title: 'Updated source' }),
      expect.objectContaining({ id: 'source-2', title: 'New source' }),
      expect.objectContaining({ id: 'local-note', title: 'My local note' }),
    ]));
  });

  test('content updates change reference material without resetting live campaigns, characters or personal notes', () => {
    const existing = workspace({
      campaigns: [{ id: 'eldritch', name: 'Old title', session_number: 12, treasury: { gp: 900 } }],
      characters: [{ id: 'pc1', name: 'Player', current_hit_points: 9, level: 7 }],
      notes: [{ id: 'session-note', content: 'Local session note' }],
      recaps: [{ id: 'session-recap', content: 'We defeated the lich' }],
      receipts: { currentEncounter: { round: 4 } },
      objects: { activeMap: { fog: ['A1'] } },
      collections: { eldritch: {
        handouts: [{ id: 'worldmap', title: 'Old map', image_url: 'old.png' }, { id: 'local-handout', title: 'Private note' }],
        npcs: [{ id: 'captain', name: 'Captain', current_hp: 4, status: 'injured' }],
      } },
    });
    const incoming = workspace({
      campaigns: [{ id: 'eldritch', name: 'Eldritch Heralds', session_number: 1, treasury: { gp: 1 } }],
      characters: [{ id: 'pc1', name: 'Overwritten', current_hit_points: 100, level: 1 }, { id: 'new-pc', name: 'New character' }],
      notes: [{ id: 'session-note', content: 'Overwritten log' }, { id: 'new-note', content: 'New lore note' }],
      recaps: [{ id: 'session-recap', content: 'Overwritten recap' }],
      receipts: { currentEncounter: { round: 1 } },
      objects: { activeMap: { fog: [] } },
      collections: { eldritch: {
        handouts: [{ id: 'worldmap', title: 'New map', image_url: 'new.png' }],
        npcs: [{ id: 'captain', name: 'Captain Iron', current_hp: 99, status: 'healthy' }],
      } },
    });
    const updated = mergeDesktopWorkspace(existing, incoming, { campaignUpdate: true });
    expect(updated.campaigns[0]).toEqual(expect.objectContaining({
      name: 'Eldritch Heralds', session_number: 12, treasury: { gp: 900 },
    }));
    expect(updated.characters.find(c => c.id === 'pc1')).toEqual(existing.characters[0]);
    expect(updated.characters.find(c => c.id === 'new-pc')).toBeTruthy();
    expect(updated.notes.find(n => n.id === 'session-note').content).toBe('Local session note');
    expect(updated.notes.find(n => n.id === 'new-note')).toBeTruthy();
    expect(updated.recaps[0].content).toBe('We defeated the lich');
    expect(updated.receipts.currentEncounter.round).toBe(4);
    expect(updated.objects.activeMap.fog).toEqual(['A1']);
    expect(updated.collections.eldritch.handouts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'worldmap', title: 'New map', image_url: 'new.png' }),
      expect.objectContaining({ id: 'local-handout', title: 'Private note' }),
    ]));
    expect(updated.collections.eldritch.npcs[0]).toEqual(expect.objectContaining({
      name: 'Captain Iron', current_hp: 4, status: 'injured',
    }));
  });

  test('imports attachments into handouts and saves the merged workspace', async () => {
    const storage = memoryStorage({
      [DESKTOP_STORAGE_KEY]: JSON.stringify(workspace()),
    });
    const runtime = {
      location: { hostname: 'desktop' },
      localStorage: storage,
      rookieDesktop: {
        offline: true,
        importCampaignPack: jest.fn().mockResolvedValue({
          canceled: false,
          file_name: 'Tia-Karta.rqkpack',
          pack: {
            format: 'rookie-quest-keeper-campaign-pack',
            version: 1,
            pack_id: 'tia-karta',
            pack_name: 'Tia-Karta Campaign Library',
            attachment_urls: {
              'world-map': 'rqk-attachment://tia-karta/world-map.jpg',
            },
            workspace: workspace({
              campaigns: [{ id: 'eldritch-heralds', name: 'Eldritch Heralds' }],
              collections: {
                'eldritch-heralds': {
                  handouts: [{
                    id: 'map-handout',
                    title: 'World Map',
                    attachment_ref: 'world-map',
                    attachment_type: 'image/jpeg',
                  }],
                },
              },
            }),
          },
        }),
      },
    };

    const result = await importDesktopCampaignPack(runtime);
    const saved = JSON.parse(storage.getItem(DESKTOP_STORAGE_KEY));

    expect(result.pack_name).toBe('Tia-Karta Campaign Library');
    expect(result.campaign_count).toBe(1);
    expect(result.attachment_count).toBe(1);
    expect(saved.campaigns[0].name).toBe('Eldritch Heralds');
    expect(saved.collections['eldritch-heralds'].handouts[0].attachment_url)
      .toBe('rqk-attachment://tia-karta/world-map.jpg');
  });
});

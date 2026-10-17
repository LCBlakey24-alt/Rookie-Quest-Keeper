import { createPreviewApi } from './previewApi';
import {
  DESKTOP_STORAGE_KEY,
  DESKTOP_USER,
  isLocalPreview,
  isOfflineDesktop,
  localWorkspaceStorageKey,
  localWorkspaceUser,
} from './previewMode';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('offline desktop workspace', () => {
  const originalDesktop = window.rookieDesktop;

  beforeEach(() => {
    Object.defineProperty(window, 'rookieDesktop', {
      configurable: true,
      value: { offline: true, edition: 'desktop', platform: 'win32' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'rookieDesktop', {
      configurable: true,
      value: originalDesktop,
    });
  });

  test('is recognised as a local workspace without a server', () => {
    expect(isOfflineDesktop()).toBe(true);
    expect(isLocalPreview()).toBe(true);
    expect(localWorkspaceUser()).toBe(DESKTOP_USER);
    expect(localWorkspaceStorageKey()).toBe(DESKTOP_STORAGE_KEY);
  });

  test('the Campaigns library lists locally saved campaigns and linked characters', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);
    const first = api.request('post', '/campaigns', { name: 'Tia-Karta', description: 'Home campaign' });
    const second = api.request('post', '/campaigns', { name: 'Second campaign' });
    api.request('post', '/characters', { name: 'Local hero', campaign_id: first.id });
    api.request('post', '/characters', { name: 'Another hero', campaign_id: first.id, campaign_join_status: 'pending' });

    const cards = api.request('get', '/library/campaigns');
    expect(cards).toHaveLength(2);
    expect(cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first.id, name: 'Tia-Karta', linked_character_count: 2, player_count: 2, pending_approval_count: 1 }),
      expect.objectContaining({ id: second.id, name: 'Second campaign', linked_character_count: 0 }),
    ]));
    expect(createPreviewApi(storage).request('get', '/library/campaigns')).toEqual(cards);
  });

  test('opening campaign Home reads saved quests, NPCs, notes and calendar offline', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);
    const campaign = api.request('post', '/campaigns', { name: 'Eldritch Heralds' });
    api.request('post', `/campaigns/${campaign.id}/quests`, { title: 'Investigate the ruins' });
    api.request('post', `/campaigns/${campaign.id}/npcs`, { name: 'The archivist' });
    api.request('post', `/campaigns/${campaign.id}/ingame-notes`, { content: 'Session prep' });
    api.request('put', `/campaigns/${campaign.id}/calendar`, { current_day: 12, current_month: 3, current_year: 1024 });

    const home = createPreviewApi(storage).request('get', `/campaigns/${campaign.id}/home-bootstrap`);
    expect(home.campaign.name).toBe('Eldritch Heralds');
    expect(home.quests).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Investigate the ruins' })]));
    expect(home.npcs).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'The archivist' })]));
    expect(home.notes).toEqual(expect.arrayContaining([expect.objectContaining({ content: 'Session prep' })]));
    expect(home.calendar).toEqual(expect.objectContaining({ current_day: 12, current_month: 3 }));
    expect(home.arcs).toEqual([]);
    expect(home.events).toEqual([]);
    expect(() => createPreviewApi(storage).request('get', '/campaigns/missing/home-bootstrap')).toThrow('Preview campaign not found.');
  });

  test('shared Chaos/Fate token ledger survives restart and never resets companion state', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);
    const campaign = api.request('post', '/campaigns', { name: 'Eldritch Heralds' });
    const route = `/campaigns/${campaign.id}/chaos-fate`;
    api.request('put', route, { chaos: 2, fate: 3, history: [{ action: 'spend', amount: 3 }] });
    expect(createPreviewApi(storage).request('get', route)).toMatchObject({ chaos: 2, fate: 3 });
    expect(api.request('get', `/campaigns/${campaign.id}/live-state`)).toEqual({});
    api.request('put', `/campaigns/${campaign.id}/live-state`, { companion_npc_ids: [] });
    expect(createPreviewApi(storage).request('get', route)).toMatchObject({ chaos: 2, fate: 3 });
  });

  test('starts empty and persists desktop data under its own storage key', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);

    expect(api.request('get', '/campaigns')).toEqual([]);
    expect(api.request('get', '/characters')).toEqual([]);

    const campaign = api.request('post', '/campaigns', { name: 'Offline campaign' });
    expect(campaign.name).toBe('Offline campaign');

    const saved = JSON.parse(storage.getItem(DESKTOP_STORAGE_KEY));
    expect(saved.campaigns).toHaveLength(1);
    expect(saved.campaigns[0].dm_user_id).toBe(DESKTOP_USER);
  });
});

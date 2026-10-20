import { createPreviewApi } from './previewApi';
import { createPreviewSeed } from './previewSeed';
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

  test.each([
    ['broken JSON', '{broken'],
    ['an empty stored value', ''],
    ['a null stored workspace', 'null'],
    ['an unsupported workspace version', JSON.stringify({ ...createPreviewSeed({ empty: true }), version: 2 })],
    ['a workspace with missing fields', JSON.stringify({ version: 1, campaigns: [], characters: [] })],
    ['array-shaped objects', JSON.stringify({ ...createPreviewSeed({ empty: true }), objects: [] })],
  ])('preserves %s and blocks edits instead of creating an empty replacement', (_description, raw) => {
    const storage = memoryStorage();
    storage.setItem(DESKTOP_STORAGE_KEY, raw);
    const write = jest.spyOn(storage, 'setItem');
    const api = createPreviewApi(storage);
    expect(() => api.request('get', '/campaigns')).toThrow('saved workspace safely');
    expect(() => api.request('post', '/campaigns', { name: 'Must not replace original' })).toThrow('recover a verified backup');
    expect(() => api.request('patch', '/characters/unknown', { current_hit_points: 0 })).toThrow('saved workspace safely');
    expect(() => api.request('delete', '/campaigns/unknown')).toThrow('saved workspace safely');
    expect(storage.getItem(DESKTOP_STORAGE_KEY)).toBe(raw);
    expect(write).not.toHaveBeenCalled();
  });

  test('unreadable or unavailable desktop storage never claims an editable empty installation', () => {
    const write = jest.fn();
    const unreadable = createPreviewApi({ getItem: () => { throw new Error('Storage unavailable'); }, setItem: write });
    expect(() => unreadable.request('get', '/dashboard/bootstrap')).toThrow('saved workspace safely');
    expect(() => unreadable.request('post', '/campaigns', { name: 'Unsaved' })).toThrow('Do not clear application data');
    expect(write).not.toHaveBeenCalled();
    const unavailable = createPreviewApi(null);
    expect(() => unavailable.request('post', '/campaigns', { name: 'Unsaved' })).toThrow('recover a verified backup');
  });

  test('quota failure preserves persisted bytes, rolls back all edits and allows a later successful retry', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);
    const campaign = api.request('post', '/campaigns', { name: 'Keep this campaign' });
    const character = api.request('post', '/characters', { name: 'Keep current resources', current_hit_points: 7, campaign_id: campaign.id });
    const originalRaw = storage.getItem(DESKTOP_STORAGE_KEY);
    const write = storage.setItem;
    storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    expect(() => api.request('patch', `/characters/${character.id}`, { current_hit_points: 0 })).toThrow('could not save this change');
    expect(() => api.request('delete', `/campaigns/${campaign.id}`)).toThrow('could not save this change');
    expect(() => api.request('post', '/campaigns', { name: 'Not saved' })).toThrow('could not save this change');
    expect(storage.getItem(DESKTOP_STORAGE_KEY)).toBe(originalRaw);
    expect(api.request('get', '/campaigns')).toEqual([campaign]);
    expect(api.request('get', `/characters/${character.id}`)).toEqual(character);
    storage.setItem = write;
    api.request('patch', `/characters/${character.id}`, { current_hit_points: 6 });
    expect(createPreviewApi(storage).request('get', `/characters/${character.id}`).current_hit_points).toBe(6);
  });

  test('a failed first save leaves a clean installation empty without inventing saved records', () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error('Quota'); };
    const api = createPreviewApi(storage);
    expect(() => api.request('post', '/campaigns', { name: 'Not saved' })).toThrow('could not save this change');
    expect(storage.getItem(DESKTOP_STORAGE_KEY)).toBeNull();
    expect(api.request('get', '/campaigns')).toEqual([]);
  });

  test('a workspace replaced or made unreadable after startup cannot be overwritten by cached state', () => {
    const storage = memoryStorage();
    const api = createPreviewApi(storage);
    const campaign = api.request('post', '/campaigns', { name: 'Original saved campaign' });
    const originalRead = storage.getItem;
    const originalRaw = storage.getItem(DESKTOP_STORAGE_KEY);
    const write = jest.spyOn(storage, 'setItem');
    storage.getItem = () => { throw new Error('Read unavailable'); };
    expect(() => api.request('patch', `/campaigns/${campaign.id}`, { name: 'Must not overwrite' })).toThrow('saved workspace safely');
    expect(write).not.toHaveBeenCalled();
    storage.getItem = originalRead;
    storage.setItem(DESKTOP_STORAGE_KEY, '{replaced while open');
    write.mockClear();
    expect(() => api.request('delete', `/campaigns/${campaign.id}`)).toThrow('changed outside this window');
    expect(storage.getItem(DESKTOP_STORAGE_KEY)).toBe('{replaced while open');
    expect(write).not.toHaveBeenCalled();
    storage.setItem(DESKTOP_STORAGE_KEY, originalRaw);
    expect(api.request('get', `/campaigns/${campaign.id}`).name).toBe('Original saved campaign');
  });

});

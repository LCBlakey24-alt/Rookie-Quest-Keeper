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

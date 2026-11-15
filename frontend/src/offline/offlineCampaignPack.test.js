import apiClient from '@/lib/apiClient';
import {
  saveOfflineCampaignPackMetadata,
  storeOfflineApiResponse,
  getOfflineCacheScope,
} from '@/offline/offlineApiCache';
import { buildGmOfflinePackRequests, downloadCampaignOfflinePack } from './offlineCampaignPack';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/offline/offlineApiCache', () => ({
  getOfflineCacheScope: jest.fn(() => 'user:gm'),
  getOfflineCampaignPackMetadata: jest.fn(),
  listOfflineCampaignPacks: jest.fn(async () => []),
  removeOfflineCampaignPack: jest.fn(),
  saveOfflineCampaignPackMetadata: jest.fn(async pack => pack),
  storeOfflineApiResponse: jest.fn(async config => `key:${config.url}`),
}));

jest.mock('@/offline/offlineMediaCache', () => ({
  cacheOfflineMediaUrls: jest.fn(async urls => ({ saved: urls, failed: [] })),
  extractOfflineMediaUrls: jest.fn(() => []),
  removeOfflineMediaUrls: jest.fn(async () => undefined),
}));

function response(url, data) {
  return { data, status: 200, headers: {}, config: { method: 'get', url } };
}

describe('offline campaign pack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOfflineCacheScope.mockReturnValue('user:gm');
    storeOfflineApiResponse.mockImplementation(async config => `key:${config.url}`);
    saveOfflineCampaignPackMetadata.mockImplementation(async pack => pack);
    apiClient.get.mockImplementation(async url => {
      if (url === '/campaigns/c1') return response(url, { id: 'c1', name: 'Test Campaign' });
      if (url === '/campaigns/c1/live-party') return response(url, [{ id: 'p1', character_id: 'char-1', name: 'Hero' }]);
      if (url === '/campaigns/c1/custom-rules') return response(url, { rules: [{ id: 'rule-1', name: 'House Rules' }] });
      if (url === '/campaigns/c1/custom-rules/rule-1') return response(url, { id: 'rule-1', name: 'House Rules', content: 'Full rule text' });
      if (url === '/characters/char-1') return response(url, { id: 'char-1', name: 'Hero' });
      return response(url, []);
    });
  });

  test('covers the current GM campaign workspaces', () => {
    const urls = buildGmOfflinePackRequests('c1').map(item => item.url);
    expect(urls).toEqual(expect.arrayContaining([
      '/campaigns/c1/content',
      '/campaigns/c1/world',
      '/campaigns/c1/tables',
      '/campaigns/c1/story-arcs',
      '/campaigns/c1/events',
      '/campaigns/c1/event-locations',
      '/campaigns/c1/initiative',
      '/campaigns/c1/display-state',
      '/campaign-invites/c1/members',
    ]));
    expect(urls.length).toBeGreaterThanOrEqual(30);
  });

  test('downloads GM reads, full custom rule text, and linked character sheets', async () => {
    const pack = await downloadCampaignOfflinePack('c1');

    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/quests', expect.objectContaining({ timeout: 30000 }));
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/npcs', expect.objectContaining({ timeout: 30000 }));
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/combat-scenarios', expect.objectContaining({ timeout: 30000 }));
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/handouts', expect.objectContaining({ timeout: 30000 }));
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/custom-rules/rule-1', expect.objectContaining({ timeout: 30000 }));
    expect(apiClient.get).toHaveBeenCalledWith('/characters/char-1', expect.objectContaining({ timeout: 30000 }));
    expect(storeOfflineApiResponse).toHaveBeenCalled();
    expect(saveOfflineCampaignPackMetadata).toHaveBeenCalled();
    expect(pack.campaignName).toBe('Test Campaign');
    expect(pack.characterIds).toEqual(['char-1']);
    expect(pack.customRuleIds).toEqual(['rule-1']);
    expect(pack.failedSections).toBe(0);
    expect(pack.complete).toBe(true);
  });

  test('keeps a usable partial pack when an optional section is unavailable', async () => {
    apiClient.get.mockImplementation(async url => {
      if (url === '/campaigns/c1') return response(url, { id: 'c1', name: 'Test Campaign' });
      if (url === '/campaigns/c1/maps') throw new Error('Map service unavailable');
      return response(url, []);
    });

    const pack = await downloadCampaignOfflinePack('c1');
    expect(pack.complete).toBe(false);
    expect(pack.failedSections).toBe(1);
    expect(pack.sections.find(section => section.key === 'maps')?.status).toBe('unavailable');
  });

  test('does not claim success if the required campaign record cannot be refreshed', async () => {
    apiClient.get.mockImplementation(async url => {
      if (url === '/campaigns/c1') throw new Error('Offline');
      return response(url, []);
    });

    await expect(downloadCampaignOfflinePack('c1')).rejects.toThrow('Offline');
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
  });

  test('does not claim a required section was saved when local storage fails', async () => {
    storeOfflineApiResponse.mockResolvedValueOnce('');
    await expect(downloadCampaignOfflinePack('c1')).rejects.toThrow('Could not save this section');
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
  });

  test('marks an optional storage failure as unavailable', async () => {
    storeOfflineApiResponse.mockImplementationOnce(async config => `key:${config.url}`)
      .mockResolvedValueOnce('');
    const pack = await downloadCampaignOfflinePack('c1');
    expect(pack.complete).toBe(false);
    expect(pack.sections.find(section => section.key === 'setting').status).toBe('unavailable');
  });

  test('fails when pack metadata could not be saved', async () => {
    saveOfflineCampaignPackMetadata.mockResolvedValueOnce(null);
    await expect(downloadCampaignOfflinePack('c1')).rejects.toThrow('Could not save the offline copy');
  });

  test('stops rather than filing the pack under a new account', async () => {
    apiClient.get.mockImplementationOnce(async url => {
      getOfflineCacheScope.mockReturnValue('user:other');
      return response(url, { id: 'c1' });
    });
    await expect(downloadCampaignOfflinePack('c1')).rejects.toThrow('account changed');
    expect(storeOfflineApiResponse).not.toHaveBeenCalled();
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
  });
});

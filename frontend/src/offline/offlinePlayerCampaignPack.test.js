import apiClient from '@/lib/apiClient';
import {
  saveOfflineCampaignPackMetadata,
  storeOfflineApiResponse,
  getOfflineCacheScope,
} from '@/offline/offlineApiCache';
import { downloadPlayerOfflinePack } from './offlinePlayerCampaignPack';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/offline/offlineApiCache', () => ({
  getOfflineCacheScope: jest.fn(() => 'user:player'),
  getOfflineCampaignPackMetadata: jest.fn(),
  removeOfflineCampaignPack: jest.fn(),
  saveOfflineCampaignPackMetadata: jest.fn(async pack => pack),
  storeOfflineApiResponse: jest.fn(async config => `key:${config.url}`),
}));

function response(url, data) {
  return { data, status: 200, headers: {}, config: { method: 'get', url } };
}

function httpError(status, detail = 'Request failed') {
  const error = new Error(detail);
  error.response = { status, data: { detail } };
  return error;
}

describe('player offline campaign pack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOfflineCacheScope.mockReturnValue('user:player');
    storeOfflineApiResponse.mockImplementation(async config => `key:${config.url}`);
    saveOfflineCampaignPackMetadata.mockImplementation(async pack => pack);
    apiClient.get.mockImplementation(async url => {
      if (url === '/player/campaign/c1') return response(url, { id: 'c1', name: 'Player Campaign' });
      if (url === '/characters') return response(url, [{ id: 'char-1', campaign_id: 'c1', name: 'Hero' }]);
      if (url === '/characters/char-1') return response(url, { id: 'char-1', name: 'Hero' });
      if (url === '/player/handouts') return response(url, [{ id: 'h1', campaign_id: 'c1', title: 'Revealed clue' }]);
      return response(url, []);
    });
  });

  test('downloads only player-safe routes and linked character sheets', async () => {
    const pack = await downloadPlayerOfflinePack('c1');
    const urls = apiClient.get.mock.calls.map(call => call[0]);

    expect(urls).toContain('/player/campaign/c1');
    expect(urls).toContain('/player/handouts');
    expect(urls).toContain('/characters/char-1');
    expect(urls).not.toContain('/campaigns/c1/handouts');
    expect(urls).not.toContain('/campaigns/c1/ingame-notes');
    expect(urls).not.toContain('/campaigns/c1/quests');
    expect(urls).not.toContain('/campaigns/c1/combat-scenarios');
    expect(urls).not.toContain('/campaigns/c1/npcs');
    expect(pack.audience).toBe('player');
    expect(pack.playerSafe).toBe(true);
    expect(pack.characterIds).toEqual(['char-1']);
    expect(storeOfflineApiResponse).toHaveBeenCalled();
  });

  test('keeps a partial player pack when an optional route is forbidden', async () => {
    apiClient.get.mockImplementation(async url => {
      if (url === '/player/campaign/c1') return response(url, { id: 'c1', name: 'Player Campaign' });
      if (url === '/campaigns/c1/custom-rules') throw httpError(403, 'Not visible');
      return response(url, []);
    });

    const pack = await downloadPlayerOfflinePack('c1');
    expect(pack.complete).toBe(false);
    expect(pack.sections.find(section => section.key === 'rules')?.status).toBe('unavailable');
  });

  test('aborts immediately on 401 so cache scope cannot change mid-download', async () => {
    apiClient.get.mockImplementation(async url => {
      if (url === '/player/campaign/c1') return response(url, { id: 'c1', name: 'Player Campaign' });
      if (url === '/campaigns/c1/players') throw httpError(401, 'Token expired');
      return response(url, []);
    });

    await expect(downloadPlayerOfflinePack('c1')).rejects.toThrow('Token expired');
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalledWith('/player/handouts', expect.anything());
  });

  test('does not claim a required section was saved when local storage fails', async () => {
    storeOfflineApiResponse.mockResolvedValueOnce('');
    await expect(downloadPlayerOfflinePack('c1')).rejects.toThrow('Could not save this section');
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
  });

  test('fails if the pack metadata was not stored', async () => {
    saveOfflineCampaignPackMetadata.mockResolvedValueOnce(null);
    await expect(downloadPlayerOfflinePack('c1')).rejects.toThrow('Could not save the offline copy');
  });

  test('stops on account change before storing the prior account response', async () => {
    apiClient.get.mockImplementationOnce(async url => {
      getOfflineCacheScope.mockReturnValue('user:other');
      return response(url, { id: 'c1' });
    });
    await expect(downloadPlayerOfflinePack('c1')).rejects.toThrow('account changed');
    expect(storeOfflineApiResponse).not.toHaveBeenCalled();
    expect(saveOfflineCampaignPackMetadata).not.toHaveBeenCalled();
  });
});

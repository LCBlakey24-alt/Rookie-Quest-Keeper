import apiClient from '@/lib/apiClient';
import { publishDisplayState } from '@/lib/liveDisplayBus';
import { publishCampaignDisplayStateWithStatus } from './liveDisplayPublishStatus';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  publishDisplayState: jest.fn(),
}));

describe('publishCampaignDisplayStateWithStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishes locally first and reports a successful remote sync', async () => {
    const state = { sync_id: 'state-1', mode: 'title', payload: { title: 'Reveal' } };
    const remoteState = { ...state, sequence: 2 };
    apiClient.put.mockResolvedValue({ data: remoteState });

    const result = await publishCampaignDisplayStateWithStatus('campaign-1', state);

    expect(publishDisplayState).toHaveBeenNthCalledWith(1, 'campaign-1', state);
    expect(apiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1/display-state', state);
    expect(publishDisplayState).toHaveBeenNthCalledWith(2, 'campaign-1', remoteState);
    expect(result).toEqual({ state: remoteState, remoteSynced: true });
  });

  test('keeps the local publish and reports remoteSynced false when the API fails', async () => {
    const state = { sync_id: 'state-2', mode: 'image', payload: { title: 'Map' } };
    const error = new Error('offline');
    apiClient.put.mockRejectedValue(error);

    const result = await publishCampaignDisplayStateWithStatus('campaign-1', state);

    expect(publishDisplayState).toHaveBeenCalledTimes(1);
    expect(publishDisplayState).toHaveBeenCalledWith('campaign-1', state);
    expect(result).toEqual({ state, remoteSynced: false, error });
  });
});

import apiClient from '@/lib/apiClient';
import { currentDisplayAccount, publishDisplayState } from '@/lib/liveDisplayBus';
import { publishCampaignDisplayStateWithStatus } from './liveDisplayPublishStatus';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  currentDisplayAccount: jest.fn(),
  publishDisplayState: jest.fn(),
}));

describe('publishCampaignDisplayStateWithStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentDisplayAccount.mockReturnValue('account-a');
  });

  test('publishes locally first and reports a successful remote sync', async () => {
    const state = { sync_id: 'state-1', mode: 'title', payload: { title: 'Reveal' } };
    const remoteState = { ...state, sequence: 2 };
    apiClient.put.mockResolvedValue({ data: remoteState });

    const result = await publishCampaignDisplayStateWithStatus('campaign-1', state);

    expect(publishDisplayState).toHaveBeenNthCalledWith(1, 'campaign-1', state, 'account-a');
    expect(apiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1/display-state', state);
    expect(publishDisplayState).toHaveBeenNthCalledWith(2, 'campaign-1', remoteState, 'account-a');
    expect(result).toEqual({ state: remoteState, remoteSynced: true });
  });

  test('keeps the local publish and reports remoteSynced false when the API fails', async () => {
    const state = { sync_id: 'state-2', mode: 'image', payload: { title: 'Map' } };
    const error = new Error('offline');
    apiClient.put.mockRejectedValue(error);

    const result = await publishCampaignDisplayStateWithStatus('campaign-1', state);

    expect(publishDisplayState).toHaveBeenCalledTimes(1);
    expect(publishDisplayState).toHaveBeenCalledWith('campaign-1', state, 'account-a');
    expect(result).toEqual({ state, remoteSynced: false, error });
  });

  test('does not publish an old account response after a sign-in switch', async () => {
    const state = { sync_id: 'state-a', mode: 'title', payload: { title: 'Account A only' } };
    let answer;
    apiClient.put.mockReturnValue(new Promise(resolve => { answer = resolve; }));

    const pending = publishCampaignDisplayStateWithStatus('campaign-1', state);
    currentDisplayAccount.mockReturnValue('account-b');
    answer({ data: { ...state, sequence: 2 } });

    await expect(pending).resolves.toEqual({ state, remoteSynced: false, staleAccount: true });
    expect(publishDisplayState).toHaveBeenCalledTimes(1);
    expect(publishDisplayState).toHaveBeenCalledWith('campaign-1', state, 'account-a');
  });
});

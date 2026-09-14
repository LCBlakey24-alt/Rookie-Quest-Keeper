import apiClient from '@/lib/apiClient';
import {
  acknowledgePlayerDisplayState,
  displayStateRevisionIdentity,
  isPlayerDisplayPath,
} from './liveDisplayBus';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe('player display delivery acknowledgement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('only treats the real player-display route as a display client', () => {
    expect(isPlayerDisplayPath('/campaign/c-1/player-display')).toBe(true);
    expect(isPlayerDisplayPath('/campaign/c-1/player-display/')).toBe(true);
    expect(isPlayerDisplayPath('/gm-screen/c-1')).toBe(false);
    expect(isPlayerDisplayPath('/campaign/c-1')).toBe(false);
  });

  test('posts the exact rendered sync id from a player display client', async () => {
    apiClient.post.mockResolvedValue({ data: { acknowledged: true, sync_id: 'sync-42' } });
    const runtimeWindow = { location: { pathname: '/campaign/c-1/player-display' } };
    const state = {
      sync_id: 'sync-42',
      mode: 'image',
      payload: { display_target: 'standing-tv' },
    };

    const result = await acknowledgePlayerDisplayState('c-1', state, runtimeWindow);

    expect(apiClient.post).toHaveBeenCalledWith('/campaigns/c-1/display-state/ack', {
      sync_id: 'sync-42',
      display_target: 'standing-tv',
      mode: 'image',
    });
    expect(result).toEqual({ acknowledged: true, sync_id: 'sync-42' });
  });

  test('never acknowledges from GM or unrelated pages', async () => {
    const runtimeWindow = { location: { pathname: '/gm-screen/c-1' } };
    const result = await acknowledgePlayerDisplayState('c-1', { sync_id: 'sync-42', mode: 'title', payload: {} }, runtimeWindow);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({ acknowledged: false, skipped: true });
  });

  test('keeps display rendering tolerant when acknowledgement is offline', async () => {
    const error = new Error('offline');
    apiClient.post.mockRejectedValue(error);
    const runtimeWindow = { location: { pathname: '/campaign/c-1/player-display' } };

    const result = await acknowledgePlayerDisplayState('c-1', { sync_id: 'sync-99', mode: 'combat', payload: {} }, runtimeWindow);

    expect(result.acknowledged).toBe(false);
    expect(result.error).toBe(error);
  });

  test('treats a newer revision of the same reveal as a fresh display update', () => {
    const first = displayStateRevisionIdentity({
      sync_id: 'group-check-1',
      updated_at: '2026-09-14T12:00:00.000Z',
      sequence: 10,
    });
    const next = displayStateRevisionIdentity({
      sync_id: 'group-check-1',
      updated_at: '2026-09-14T12:00:05.000Z',
      sequence: 10,
    });

    expect(next).not.toBe(first);
  });
});

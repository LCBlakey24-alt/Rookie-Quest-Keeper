import React from 'react';
import { render, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import OfflineSyncManager from './OfflineSyncManager';
import { getOfflineCacheScope } from '@/offline/offlineApiCache';
import {
  listOfflineCombatClosures,
  listOfflineCombatLootSyncs,
  listOfflineCombatSyncs,
  removeOfflineCombatClose,
} from '@/offline/offlineCombatSyncQueue';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { warning: jest.fn(), success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
jest.mock('@/offline/offlineCombatSyncQueue', () => ({
  listOfflineCombatSyncs: jest.fn().mockResolvedValue([]),
  listOfflineCombatLootSyncs: jest.fn().mockResolvedValue([]),
  listOfflineCombatClosures: jest.fn(),
  removeOfflineCombatClose: jest.fn(),
  removeOfflineCombatLootSync: jest.fn(),
  removeOfflineCombatSync: jest.fn(),
  markOfflineCombatCloseError: jest.fn(),
  markOfflineCombatConflict: jest.fn(),
  markOfflineCombatError: jest.fn(),
  markOfflineCombatLootError: jest.fn(),
  combatStateSnapshot: jest.fn(),
  combatStatesMatch: jest.fn(),
}));

let queued;
beforeEach(() => {
  jest.clearAllMocks();
  listOfflineCombatSyncs.mockResolvedValue([]);
  listOfflineCombatLootSyncs.mockResolvedValue([]);
  queued = null;
  listOfflineCombatClosures.mockImplementation(async () => queued ? [queued] : []);
  removeOfflineCombatClose.mockImplementation(async () => { queued = null; });
  apiClient.get.mockResolvedValue({ data: {} });
  apiClient.delete.mockResolvedValue({ data: {} });
});

test('a stale display-close 409 does not clear a newer fight initiative queue', async () => {
  queued = {
    key: 'close-1', campaignId: 'campaign-1',
    displayState: { mode: 'blank', sync_id: 'old-end', sequence: 100,
      payload: { title: 'Old fight ended' } },
  };
  apiClient.put.mockRejectedValue({ response: { status: 409 } });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(removeOfflineCombatClose).toHaveBeenCalledWith('close-1'));
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('outdated combat display'));
});

test('legacy offline closure without a timestamped revision is discarded safely', async () => {
  queued = { key: 'legacy-close', campaignId: 'campaign-1',
    displayState: { mode: 'blank', payload: { title: 'Old fight ended' } } };
  render(<OfflineSyncManager />);
  await waitFor(() => expect(removeOfflineCombatClose).toHaveBeenCalledWith('legacy-close'));
  expect(apiClient.put).not.toHaveBeenCalled();
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Legacy combat display'));
});

test('replaying offline combat applies through the campaign, checked against its baseline', async () => {
  const { removeOfflineCombatSync } = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatClosures.mockResolvedValue([]);
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9', characterName: 'Pip',
    baseState: { current_hit_points: 10 }, state: { current_hit_points: 4 }, status: 'queued',
  }]);
  apiClient.post.mockResolvedValue({ data: { applied: true } });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(removeOfflineCombatSync).toHaveBeenCalledWith('combat-1'));
  const [url, body, options] = apiClient.post.mock.calls[0];
  expect(url).toBe('/campaigns/campaign-1/characters/char-9/combat-state/apply');
  expect(body).toEqual({ expected: { current_hit_points: 10 }, state: { current_hit_points: 4 } });
  expect(options.rqkExpectedAuthScope).toBe(getOfflineCacheScope());
  expect(apiClient.patch).not.toHaveBeenCalled(); // never an unconditional write
});

test('a change made elsewhere between read and write is a conflict, and the change stays queued', async () => {
  const { markOfflineCombatConflict, removeOfflineCombatSync } = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatClosures.mockResolvedValue([]);
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9', characterName: 'Pip',
    baseState: { current_hit_points: 10 }, state: { current_hit_points: 4 }, status: 'queued',
  }]);
  apiClient.post.mockRejectedValue({ response: { status: 409, data: { detail: { state: { current_hit_points: 7 } } } } });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(markOfflineCombatConflict).toHaveBeenCalledWith('combat-1', { current_hit_points: 7 }, expect.any(String)));
  expect(removeOfflineCombatSync).not.toHaveBeenCalled();
});

test('an account switch during replay stops it: nothing more is sent, removed or marked for the old account', async () => {
  const queue = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatClosures.mockResolvedValue([]);
  const scopeA = getOfflineCacheScope();
  listOfflineCombatSyncs.mockResolvedValue([
    { key: 'a-1', scope: scopeA, campaignId: 'c', characterId: 'one', characterName: 'One', baseState: {}, state: { current_hit_points: 1 }, status: 'queued' },
    { key: 'a-2', scope: scopeA, campaignId: 'c', characterId: 'two', characterName: 'Two', baseState: {}, state: { current_hit_points: 2 }, status: 'queued' },
  ]);
  listOfflineCombatLootSyncs.mockResolvedValue([{ key: 'loot-a', scope: scopeA, campaignId: 'c', operationId: 'op', item: {} }]);
  queue.combatStatesMatch.mockReturnValue(true);
  // Account B signs in while the first request (whatever it is) is in flight.
  let first = true;
  const switchDuring = (data) => async () => {
    if (first) {
      first = false;
      window.localStorage.setItem('dm_token', 'b-token');
      window.localStorage.setItem('dm_username', 'player-b');
    }
    return { data };
  };
  apiClient.get.mockImplementation(switchDuring({ current_hit_points: 0 }));
  apiClient.post.mockImplementation(switchDuring({ applied: true }));
  apiClient.patch.mockResolvedValue({ data: {} });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(first).toBe(false));
  await new Promise((resolve) => setTimeout(resolve, 30));
  // Nothing else goes out under B: no write, no second record, no loot.
  expect(apiClient.patch).not.toHaveBeenCalled();
  expect(apiClient.post.mock.calls.length).toBeLessThanOrEqual(1);
  expect(queue.removeOfflineCombatSync).not.toHaveBeenCalled();
  expect(queue.markOfflineCombatError).not.toHaveBeenCalled();
  window.localStorage.clear();
});

test('Apply Offline on a conflict writes only over the cloud state shown, as the queuing account', async () => {
  const { fireEvent, screen } = require('@testing-library/react');
  const queue = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatClosures.mockResolvedValue([]);
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9', characterName: 'Pip', status: 'conflict',
    baseState: { current_hit_points: 10 }, serverState: { current_hit_points: 7 }, state: { current_hit_points: 4 },
  }]);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  apiClient.post.mockRejectedValue({ response: { status: 409, data: { detail: { state: { current_hit_points: 2 } } } } });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(document.querySelector('.rqk-sync-launcher')).not.toBeNull());
  fireEvent.click(document.querySelector('.rqk-sync-launcher'));
  fireEvent.click(await screen.findByRole('button', { name: /Apply Offline/ }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
  const [, body, options] = apiClient.post.mock.calls[0];
  expect(body.expected).toEqual({ current_hit_points: 7 });
  expect(options.rqkExpectedAuthScope).toBe(getOfflineCacheScope());
  // The cloud moved on again: still a conflict, still queued.
  await waitFor(() => expect(queue.markOfflineCombatConflict).toHaveBeenCalledWith('combat-1', { current_hit_points: 2 }, expect.any(String)));
  expect(queue.removeOfflineCombatSync).not.toHaveBeenCalled();
  window.confirm.mockRestore();
});

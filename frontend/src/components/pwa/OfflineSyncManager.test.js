import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { getOfflineCacheScope } from '@/offline/offlineApiCache';
import OfflineSyncManager from './OfflineSyncManager';
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
jest.mock('@/offline/offlineApiCache', () => ({ getOfflineCacheScope: jest.fn() }));
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
  getOfflineCacheScope.mockReturnValue('user:gm');
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
  await waitFor(() => expect(removeOfflineCombatClose).toHaveBeenCalledWith('close-1', expect.objectContaining({ key: 'close-1' })));
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('outdated combat display'));
});

test('legacy offline closure without a timestamped revision is discarded safely', async () => {
  queued = { key: 'legacy-close', campaignId: 'campaign-1',
    displayState: { mode: 'blank', payload: { title: 'Old fight ended' } } };
  render(<OfflineSyncManager />);
  await waitFor(() => expect(removeOfflineCombatClose).toHaveBeenCalledWith('legacy-close', expect.objectContaining({ key: 'legacy-close' })));
  expect(apiClient.put).not.toHaveBeenCalled();
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Legacy combat display'));
});

test('replaying offline combat reads the campaign combat state, not the owner-only character', async () => {
  const { combatStatesMatch, removeOfflineCombatSync } = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatClosures.mockResolvedValue([]);
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9', characterName: 'Pip',
    baseState: { current_hit_points: 10 }, state: { current_hit_points: 4 }, status: 'queued',
  }]);
  combatStatesMatch.mockReturnValue(true);
  apiClient.patch.mockResolvedValue({ data: {} });
  render(<OfflineSyncManager />);
  await waitFor(() => expect(removeOfflineCombatSync).toHaveBeenCalledWith('combat-1', expect.objectContaining({ key: 'combat-1' })));
  expect(apiClient.get.mock.calls[0][0]).toBe('/campaigns/campaign-1/characters/char-9/combat-state');
  expect(apiClient.patch).toHaveBeenCalledWith('/characters/char-9', { current_hit_points: 4 }, expect.anything());
});

test('stops replay when the signed-in account changes during the cloud read', async () => {
  const { combatStatesMatch } = jest.requireMock('@/offline/offlineCombatSyncQueue');
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9',
    baseState: { current_hit_points: 10 }, state: { current_hit_points: 4 }, status: 'pending',
  }]);
  combatStatesMatch.mockReturnValue(true);
  let resolveRead;
  apiClient.get.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve; }));
  render(<OfflineSyncManager />);
  await waitFor(() => expect(resolveRead).toBeDefined());
  getOfflineCacheScope.mockReturnValue('user:player');
  await act(async () => { resolveRead({ data: {} }); });
  expect(apiClient.patch).not.toHaveBeenCalled();
});

test('hides the previous account queue immediately when another tab changes auth', async () => {
  listOfflineCombatSyncs.mockResolvedValue([{
    key: 'combat-1', campaignId: 'campaign-1', characterId: 'char-9',
    characterName: 'Pip', scope: 'user:gm', status: 'conflict',
  }]);
  render(<OfflineSyncManager />);
  expect(await screen.findByText('1 Sync Conflict')).toBeInTheDocument();

  getOfflineCacheScope.mockReturnValue('user:player');
  listOfflineCombatSyncs.mockImplementation(() => new Promise(() => {}));
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'dm_token' })); });
  expect(screen.queryByText('1 Sync Conflict')).not.toBeInTheDocument();
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
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

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EndSessionReviewModal from './EndSessionReviewModal';
import apiClient from '@/lib/apiClient';
import { publishCampaignDisplayStateWithStatus } from '@/lib/liveDisplayPublishStatus';
import { createDisplayState } from '@/lib/liveDisplayBus';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: jest.fn((mode, payload) => ({ mode, payload })),
}));
jest.mock('@/lib/liveDisplayPublishStatus', () => ({
  publishCampaignDisplayStateWithStatus: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const summary = {
  campaignName: 'Synthetic World',
  generated_at: '2026-11-07T08:00:00Z',
  session: {
    playerRolls: 2, gmRolls: 1, totalRolls: 2, totalDice: 2,
    nat20s: 1, nat1s: 0, actors: [{ name: 'Aria', rolls: 2, nat20s: 1, nat1s: 0 }],
    awards: [{ title: 'Crit Goblin', name: 'Aria', value: '1 Nat 20' }],
  },
  allTime: { totalRolls: 20, totalDice: 20, nat20s: 3, nat1s: 1 },
};

beforeEach(() => {
  jest.clearAllMocks();
  // The Jest setup resets factory mock implementations between tests.
  createDisplayState.mockImplementation((mode, payload) => ({ mode, payload }));
  apiClient.get.mockImplementation(async url => ({
    data: url.includes('/roll-events/summary') ? summary : [],
  }));
  apiClient.post.mockImplementation(async url => ({
    data: url.endsWith('/roll-events/end-session') ? summary : { id: 'note-1' },
  }));
  apiClient.put.mockResolvedValue({ data: {} });
  publishCampaignDisplayStateWithStatus.mockImplementation(async (_, state) => ({
    state, remoteSynced: true,
  }));
});

async function renderReady(onClose = jest.fn()) {
  render(<EndSessionReviewModal campaignId="test-campaign" campaignName="Synthetic World" onClose={onClose} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send Dice-Only Player Show' })).toBeEnabled());
  return onClose;
}

test('failed preview displays a real error, never zero-stat session ready to archive', async () => {
  apiClient.get.mockImplementationOnce(async () => { throw new Error('offline'); });
  render(<EndSessionReviewModal campaignId="test-campaign" campaignName="Synthetic World" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Session statistics could not be loaded');
  expect(screen.getByRole('button', { name: 'Send Dice-Only Player Show' })).toBeDisabled();
  expect(apiClient.post).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Retry Preview' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send Dice-Only Player Show' })).toBeEnabled());
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('remote display failure keeps archived summary and retry never archives a second time', async () => {
  publishCampaignDisplayStateWithStatus
    .mockResolvedValueOnce({ state: {}, remoteSynced: false })
    .mockResolvedValueOnce({ state: {}, remoteSynced: true });
  const onClose = await renderReady();

  fireEvent.click(screen.getByRole('button', { name: 'Send Dice-Only Player Show' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry Player Display' })).toBeEnabled());
  expect(onClose).not.toHaveBeenCalled();
  expect(toast.warning).toHaveBeenCalledWith('Rolls archived — player display not synced', expect.any(Object));
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('rolls have already been archived');
  expect(screen.getByRole('button', { name: 'Refresh Preview' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Retry Player Display' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  const archives = apiClient.post.mock.calls.filter(([url]) => url.endsWith('/roll-events/end-session'));
  const recapNotes = apiClient.post.mock.calls.filter(([url]) => url.endsWith('/ingame-notes'));
  expect(archives).toHaveLength(1);
  expect(recapNotes).toHaveLength(1);
  expect(publishCampaignDisplayStateWithStatus).toHaveBeenCalledTimes(2);
  expect(publishCampaignDisplayStateWithStatus).toHaveBeenLastCalledWith(
    'test-campaign', expect.objectContaining({ mode: 'end-session-stats', payload: summary }),
  );
  expect(toast.success).toHaveBeenCalledWith(
    'Session recap accepted by the display server',
    expect.objectContaining({ description: expect.stringMatching(/not yet acknowledged/i) }),
  );
});

test('successful archive with a failed optional GM note is reported, not swallowed', async () => {
  apiClient.post.mockImplementation(async url => {
    if (url.endsWith('/ingame-notes')) throw new Error('notes service unavailable');
    return { data: summary };
  });
  const onClose = await renderReady();
  fireEvent.click(screen.getByRole('button', { name: 'Send Dice-Only Player Show' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/recap note could not be saved/i));
  expect(publishCampaignDisplayStateWithStatus).toHaveBeenCalledTimes(1);
});

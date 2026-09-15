import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import QuestPlayerSharingPanel from './QuestPlayerSharingPanel';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows private quests as GM only and can explicitly share one', async () => {
  const quest = { id: 'quest-1', title: 'Hidden objective', shared_with_players: false };
  apiClient.get.mockResolvedValueOnce({ data: [quest] });
  apiClient.put.mockResolvedValueOnce({ data: { ...quest, shared_with_players: true } });

  render(<QuestPlayerSharingPanel campaignId="campaign-1" />);

  const row = await screen.findByRole('button', { name: /hidden objective/i });
  expect(row).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('GM only')).toBeInTheDocument();

  fireEvent.click(row);
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(
    '/campaigns/campaign-1/quests/quest-1',
    { shared_with_players: true },
  ));
  expect(await screen.findByText('Visible to players')).toBeInTheDocument();
  expect(toast.success).toHaveBeenCalledWith('Quest shared with players');
});

test('can hide an already shared quest again', async () => {
  const quest = { id: 'quest-1', title: 'Visible objective', shared_with_players: true };
  apiClient.get.mockResolvedValueOnce({ data: [quest] });
  apiClient.put.mockResolvedValueOnce({ data: { ...quest, shared_with_players: false } });

  render(<QuestPlayerSharingPanel campaignId="campaign-1" />);
  fireEvent.click(await screen.findByRole('button', { name: /visible objective/i }));

  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(
    '/campaigns/campaign-1/quests/quest-1',
    { shared_with_players: false },
  ));
  expect(await screen.findByText('GM only')).toBeInTheDocument();
});

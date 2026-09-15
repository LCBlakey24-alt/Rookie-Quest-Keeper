import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PlayerQuestsPanel from './PlayerQuestsPanel';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const sharedQuest = {
  id: 'quest-1',
  title: 'Find the courier',
  summary: 'The courier is missing.',
  hook: 'Last seen on the forest road.',
  status: 'active',
  is_pinned: true,
  objectives: [
    { id: 'o1', title: 'Search the old road', status: 'completed', optional: false },
    { id: 'o2', title: 'Ask the charcoal burners', status: 'upcoming', optional: true },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('loads shared quests and shows player-safe objective progress', async () => {
  apiClient.get.mockResolvedValueOnce({ data: [sharedQuest] });
  render(<PlayerQuestsPanel campaignId="campaign-1" />);

  expect(await screen.findByText('Find the courier')).toBeInTheDocument();
  expect(screen.getByText('1/2')).toBeInTheDocument();
  expect(screen.getByText('The courier is missing.')).toBeInTheDocument();
  expect(screen.getByText('Ask the charcoal burners')).toBeInTheDocument();
  expect(screen.getByText('Optional')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/player/campaign/campaign-1/quests');
});

test('shows a clear empty state when the GM has not shared any quests', async () => {
  apiClient.get.mockResolvedValueOnce({ data: [] });
  render(<PlayerQuestsPanel campaignId="campaign-1" />);

  expect(await screen.findByText('No quests have been shared yet.')).toBeInTheDocument();
  expect(screen.getByText(/when your gm reveals an objective/i)).toBeInTheDocument();
});

test('keeps previously loaded quests visible when a refresh fails', async () => {
  apiClient.get
    .mockResolvedValueOnce({ data: [sharedQuest] })
    .mockRejectedValueOnce({ response: { data: { detail: 'Server unavailable' } } });
  render(<PlayerQuestsPanel campaignId="campaign-1" />);

  await screen.findByText('Find the courier');
  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Server unavailable'));
  expect(screen.getByText('Find the courier')).toBeInTheDocument();
});

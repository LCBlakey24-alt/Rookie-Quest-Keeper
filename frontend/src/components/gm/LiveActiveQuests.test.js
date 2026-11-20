import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LiveActiveQuests from './LiveActiveQuests';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

beforeEach(() => { apiClient.get.mockReset(); window.localStorage.clear(); });

test('shows active quests and opens the runner focused on one', async () => {
  apiClient.get.mockResolvedValue({ data: [
    { id: 'q1', title: 'The Ship Without a Crew', status: 'active', objectives: [{ title: 'Search the ship', status: 'upcoming' }], linked_npc_ids: ['n1'] },
  ] });
  const onOpenQuests = jest.fn();
  render(<LiveActiveQuests campaignId="camp-1" onOpenQuests={onOpenQuests} />);
  expect(await screen.findByText('The Ship Without a Crew')).toBeInTheDocument();
  expect(screen.getByText('Next: Search the ship')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('live-run-quest-q1'));
  expect(window.localStorage.getItem('gm.liveQuestFocus.camp-1')).toBe('q1');
  expect(onOpenQuests).toHaveBeenCalled();
});

test('stays out of the way when there are no quests or the request fails', async () => {
  apiClient.get.mockResolvedValueOnce({ data: [] });
  const { container, unmount } = render(<LiveActiveQuests campaignId="camp-1" />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
  expect(container).toBeEmptyDOMElement();
  unmount();
  apiClient.get.mockRejectedValueOnce(new Error('offline'));
  const second = render(<LiveActiveQuests campaignId="camp-1" />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(second.container).toBeEmptyDOMElement();
});

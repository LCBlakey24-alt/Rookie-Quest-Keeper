import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PlayerNotesTab from './PlayerNotesTab';
import { PlayerHandoutsPanel } from './HandoutsTab';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/components/RookFormFillPanel', () => () => null);

beforeEach(() => jest.resetAllMocks());

test('notes are scoped to the open campaign and new notes retain that campaign', async () => {
  apiClient.get.mockImplementation(async path => ({ data: path === '/player/notes' ? [
    { id: 'n1', campaign_id: 'c1', title: 'This campaign', content: 'Note', updated_at: '2026-09-09' },
    { id: 'n2', campaign_id: 'c2', title: 'Another campaign', content: 'Hidden' },
  ] : [] }));
  apiClient.post.mockResolvedValue({ data: {} });
  render(<PlayerNotesTab campaignId="c1" />);
  expect(await screen.findByText('This campaign')).toBeInTheDocument();
  expect(screen.queryByText('Another campaign')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('add-player-note-btn'));
  fireEvent.change(screen.getByTestId('note-content-input'), { target: { value: 'New note' } });
  fireEvent.click(screen.getByTestId('save-note-btn'));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/player/notes', expect.objectContaining({ campaign_id: 'c1', content: 'New note' })));
});

test('failed notes load is not reported as an empty notebook', async () => {
  apiClient.get.mockRejectedValue(new Error('offline'));
  render(<PlayerNotesTab campaignId="c1" />);
  expect(await screen.findByRole('status')).toHaveTextContent('Could not refresh');
  expect(screen.queryByText('No Personal Notes Yet')).not.toBeInTheDocument();
});

test('handouts stay scoped and remain visible after a failed refresh', async () => {
  apiClient.get.mockResolvedValueOnce({ data: [
    { handout_id: 'h1', campaign_id: 'c1', title: 'Shared map', read: true },
    { handout_id: 'h2', campaign_id: 'c2', title: 'Other map' },
  ] }).mockRejectedValueOnce(new Error('offline'));
  render(<PlayerHandoutsPanel campaignId="c1" />);
  expect(await screen.findByText('Shared map')).toBeInTheDocument();
  expect(screen.queryByText('Other map')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh handouts' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('could not be refreshed'));
  expect(screen.getByText('Shared map')).toBeInTheDocument();
});

test('failed handouts load does not clear the unread summary', async () => {
  const onSummaryChange = jest.fn();
  apiClient.get.mockRejectedValue(new Error('offline'));
  render(<PlayerHandoutsPanel onSummaryChange={onSummaryChange} />);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('could not be refreshed'));
  expect(screen.queryByText('No handouts yet')).not.toBeInTheDocument();
  expect(onSummaryChange).not.toHaveBeenCalled();
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import SessionTimeline from './SessionTimeline';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const savedEvent = {
  id: 'event-1',
  campaign_id: 'campaign-1',
  event_type: 'major',
  type: 'major',
  title: 'The Crownless Council Forms',
  description: 'The first council seats were filled.',
  session_number: 8,
  in_game_date: 'Day 24',
  timestamp: '2026-08-24T12:00:00Z',
};

function renderTimeline() {
  return render(<SessionTimeline campaignId="campaign-1" />);
}

describe('SessionTimeline reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads the documented events wrapper and normalises backend event fields', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { events: [savedEvent] } });

    renderTimeline();

    expect(await screen.findByText('The Crownless Council Forms')).toBeInTheDocument();
    expect(screen.getByText('Major Event')).toBeInTheDocument();
    expect(screen.getByText('Day 24')).toBeInTheDocument();
    expect(screen.queryByText('No timeline events yet')).not.toBeInTheDocument();
  });

  test('does not present an initial load failure as an empty campaign history', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline'));

    renderTimeline();

    expect(await screen.findByTestId('timeline-load-warning')).toHaveTextContent(
      'Timeline could not be loaded. Retry before assuming it is empty.'
    );
    expect(screen.getByTestId('timeline-unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No timeline events yet')).not.toBeInTheDocument();
  });

  test('preserves last-known-good events when refresh fails', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { events: [savedEvent] } })
      .mockRejectedValueOnce(new Error('offline'));

    renderTimeline();
    expect(await screen.findByText('The Crownless Council Forms')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('timeline-refresh-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('timeline-load-warning')).toHaveTextContent(
        'Timeline refresh failed. Showing the last loaded events.'
      );
    });
    expect(screen.getByText('The Crownless Council Forms')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Could not load the campaign timeline.');
  });

  test('does not fabricate a local event when saving fails and keeps the draft', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { events: [] } });
    apiClient.post.mockRejectedValueOnce(new Error('offline'));

    renderTimeline();
    expect(await screen.findByText('No timeline events yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unsaved Turning Point' } });
    fireEvent.change(screen.getByLabelText('In-world date'), { target: { value: 'Day 30' } });
    fireEvent.click(screen.getByTestId('timeline-save-btn'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Timeline event was not saved. Your draft is still here.'));
    expect(screen.getByLabelText('Title')).toHaveValue('Unsaved Turning Point');
    expect(screen.getByLabelText('In-world date')).toHaveValue('Day 30');
    expect(screen.getByText('No timeline events yet')).toBeInTheDocument();
    expect(toast.info).not.toHaveBeenCalled();
  });

  test('does not remove an event from the UI when deletion fails', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { events: [savedEvent] } });
    apiClient.delete.mockRejectedValueOnce(new Error('offline'));

    renderTimeline();
    expect(await screen.findByText('The Crownless Council Forms')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Timeline event was not deleted.'));
    expect(screen.getByText('The Crownless Council Forms')).toBeInTheDocument();
    expect(toast.info).not.toHaveBeenCalled();
  });
});

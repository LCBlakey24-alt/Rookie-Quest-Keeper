import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import SiteUpdatesPanel from './SiteUpdatesPanel';
jest.mock('@/lib/apiClient', () => ({ get: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('renders published news using the existing site updates API', async () => {
  apiClient.get.mockResolvedValue({ data: [{ id: 'one', label: 'Keeper News', title: 'New features', text: 'New character sheets are ready.', is_pinned: true }] });
  render(<SiteUpdatesPanel />);
  expect(await screen.findByRole('heading', { name: 'New features' })).toBeInTheDocument();
  expect(screen.getByText('New character sheets are ready.')).toBeInTheDocument();
  expect(screen.getByText(/Pinned/)).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/site-updates', { params: { limit: 6 } });
});

test('handles an empty announcement list without fake news', async () => {
  apiClient.get.mockResolvedValue({ data: [] });
  render(<SiteUpdatesPanel />);
  expect(await screen.findByText(/No announcements yet/)).toBeInTheDocument();
});

test('does not mistake a failed fetch for an empty site', async () => {
  apiClient.get.mockRejectedValue(new Error('offline'));
  render(<SiteUpdatesPanel />);
  expect(await screen.findByText('Latest announcements are temporarily unavailable.')).toHaveAttribute('role', 'status');
});

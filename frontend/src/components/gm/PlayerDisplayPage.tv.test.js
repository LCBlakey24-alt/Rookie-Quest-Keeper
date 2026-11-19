import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PlayerDisplayPage from './PlayerDisplayPage';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));

test('the TV link reads the public display by code, with no sign-in', async () => {
  apiClient.get.mockResolvedValue({ data: {
    campaign_name: 'Synthetic One',
    state: { campaign_id: 'camp', mode: 'title', updated_at: '2026-11-18T20:00:00Z', payload: { title: 'The Gilded Anchor' } },
    party: [{ id: 'p1', name: 'Synthetic Ranger', character_class: 'Ranger', level: 3 }],
  } });
  render(<MemoryRouter><PlayerDisplayPage tvCode="ABCD2345" /></MemoryRouter>);
  expect(await screen.findByText('The Gilded Anchor')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/tv/ABCD2345/display-state');
  expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/campaigns/'));
});

test('a code that is no longer active shows a clear notice', async () => {
  apiClient.get.mockRejectedValue({ response: { status: 404 } });
  render(<MemoryRouter><PlayerDisplayPage tvCode="OLDCODE2" /></MemoryRouter>);
  expect(await screen.findByText('This TV code is not active')).toBeInTheDocument();
});

test('a slow older reply never replaces a newer scene', async () => {
  jest.useFakeTimers();
  try {
    const replies = [];
    apiClient.get.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    const scene = (title, sequence) => ({ data: { state: { campaign_id: 'camp', mode: 'title', sequence, updated_at: '2026-11-19T10:00:00Z', payload: { title } }, party: [] } });
    render(<MemoryRouter><PlayerDisplayPage tvCode="ABCD2345" /></MemoryRouter>);
    await act(async () => { jest.advanceTimersByTime(2600); });
    expect(replies).toHaveLength(2);
    await act(async () => { replies[1](scene('New scene', 2)); });
    expect(screen.getByText('New scene')).toBeInTheDocument();
    await act(async () => { replies[0](scene('Old scene', 1)); });
    expect(screen.getByText('New scene')).toBeInTheDocument();
    expect(screen.queryByText('Old scene')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

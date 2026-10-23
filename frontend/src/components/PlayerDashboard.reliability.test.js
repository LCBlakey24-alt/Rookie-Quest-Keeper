import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlayerDashboard from './PlayerDashboard';
import { fetchPlayerDashboardSections, fetchPlayerHandoutSummary } from '@/components/dashboard/player/playerDashboardData';

jest.mock('@/components/dashboard/player/playerDashboardData', () => ({
  fetchPlayerDashboardSections: jest.fn(),
  fetchPlayerHandoutSummary: jest.fn(),
  describePlayerDashboardFailures: jest.fn(() => 'Some data is temporarily unavailable.'),
}));
jest.mock('@/components/JoinCampaignModal', () => function JoinTestProbe({ onSuccess }) {
  return <button type="button" onClick={onSuccess}>Simulate confirmed campaign join</button>;
});
jest.mock('@/components/dashboard/player/PlayerSuggestionBox', () => () => null);
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

const snapshot = (name, failures = []) => ({
  ok: failures.length === 0,
  failures,
  characters: name ? [{ id: name.toLowerCase().replace(/\s+/g, '-'), name, level: 5, character_class: 'Fighter' }] : [],
  campaigns: [],
});
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  fetchPlayerHandoutSummary.mockResolvedValue({ total: 0, unread: 0, saved: 0 });
});

test('a slower prior refresh cannot overwrite the newest player character list', async () => {
  const slow = deferred();
  fetchPlayerDashboardSections
    .mockResolvedValueOnce(snapshot('First Hero'))
    .mockImplementationOnce(() => slow.promise)
    .mockResolvedValueOnce(snapshot('Newest Hero'));

  render(<MemoryRouter><PlayerDashboard /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'First Hero' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(fetchPlayerDashboardSections).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'Simulate confirmed campaign join' }));
  expect(await screen.findByRole('heading', { name: 'Newest Hero' })).toBeInTheDocument();

  slow.resolve(snapshot('Older Hero'));
  await waitFor(() => expect(fetchPlayerDashboardSections).toHaveBeenCalledTimes(3));
  expect(screen.getByRole('heading', { name: 'Newest Hero' })).toBeInTheDocument();
  expect(screen.queryByText('Older Hero')).not.toBeInTheDocument();
});

test('failed first load does not claim saved player sheets and campaigns are empty', async () => {
  fetchPlayerDashboardSections.mockResolvedValue({
    ok: false,
    failures: ['characters', 'campaigns'],
    characters: null,
    campaigns: null,
  });
  render(<MemoryRouter><PlayerDashboard /></MemoryRouter>);
  expect(await screen.findByText('Characters could not be loaded')).toBeInTheDocument();
  expect(screen.queryByText('No characters yet')).not.toBeInTheDocument();

  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Campaigns' }), { button: 0, ctrlKey: false });
  expect(await screen.findByText('Campaigns could not be loaded')).toBeInTheDocument();
  expect(screen.queryByText('No linked campaigns')).not.toBeInTheDocument();
});

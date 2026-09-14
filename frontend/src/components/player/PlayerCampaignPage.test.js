import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fetchPlayerCampaignSections } from './playerCampaignData';
import { fetchPlayerHandoutSummary } from '@/components/dashboard/player/playerDashboardData';
import { PlayerCampaignWorkspace } from './PlayerCampaignPage';

jest.mock('./playerCampaignData', () => ({ fetchPlayerCampaignSections: jest.fn() }));
jest.mock('@/components/dashboard/player/playerDashboardData', () => ({ fetchPlayerHandoutSummary: jest.fn() }));
jest.mock('./CombatInitiativeSubmitter', () => () => null);

const data = {
  campaign: { id: 'c1', name: 'Test table', description: 'Shared description' },
  party: [{ id: 'p1', name: 'Hero', level: 3 }],
  characters: [{ id: 'p1', name: 'Hero', current_hit_points: 0, max_hit_points: 20, armor_class: 16 }],
  failures: [],
};

function SheetRouteProbe() {
  const location = useLocation();
  return <div data-testid="campaign-sheet-return-state">{location.state?.playerReturnTo || 'none'}</div>;
}

beforeEach(() => {
  jest.resetAllMocks();
  fetchPlayerHandoutSummary.mockResolvedValue({ total: 0, unread: 0, saved: 0 });
});

test('offers a real character sheet link, preserves zero HP and omits GM actions', async () => {
  fetchPlayerCampaignSections.mockResolvedValue(data);
  render(<MemoryRouter><PlayerCampaignWorkspace campaignId="c1" /></MemoryRouter>);
  expect(await screen.findByText('Test table')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Hero sheet' })).toHaveAttribute('href', '/characters/p1');
  expect(screen.getByText('HP 0 / 20')).toBeInTheDocument();
  expect(screen.getByText('AC 16')).toBeInTheDocument();
  expect(fetchPlayerHandoutSummary).toHaveBeenCalledWith(expect.anything(), 'c1');
  expect(screen.getByRole('link', { name: 'Player home' })).toHaveAttribute('href', '/player');
  expect(screen.queryByText('GM Notes')).not.toBeInTheDocument();
});

test('opens a sheet with the current player campaign as its return context', async () => {
  fetchPlayerCampaignSections.mockResolvedValue(data);
  render(
    <MemoryRouter initialEntries={['/player/campaign/c1']}>
      <Routes>
        <Route path="/player/campaign/:campaignId" element={<PlayerCampaignWorkspace campaignId="c1" />} />
        <Route path="/characters/:characterId" element={<SheetRouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Test table')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Open Hero sheet' }));

  expect(await screen.findByTestId('campaign-sheet-return-state')).toHaveTextContent('/player/campaign/c1');
});

test('keeps loaded campaign details when refresh fails', async () => {
  fetchPlayerCampaignSections.mockResolvedValueOnce(data).mockResolvedValueOnce({ campaign: null, party: null, characters: null, failures: ['campaign details', 'characters'] });
  render(<MemoryRouter><PlayerCampaignWorkspace campaignId="c1" /></MemoryRouter>);
  await screen.findByText('Test table');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Could not refresh');
  expect(screen.getByText('Test table')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Hero sheet' })).toBeInTheDocument();
});

test('shows an explicit warning when unread handout status cannot be checked', async () => {
  fetchPlayerCampaignSections.mockResolvedValue(data);
  fetchPlayerHandoutSummary.mockRejectedValue(new Error('offline'));

  render(<MemoryRouter><PlayerCampaignWorkspace campaignId="c1" /></MemoryRouter>);

  expect(await screen.findByText('Test table')).toBeInTheDocument();
  const warning = await screen.findByTestId('player-campaign-handout-summary-warning');
  expect(warning).toHaveTextContent('Could not check unread Handouts yet');
  expect(screen.queryByLabelText('0 unread')).not.toBeInTheDocument();
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PlayerDashboard from './PlayerDashboard';
import {
  fetchPlayerDashboardSections,
  fetchPlayerHandoutSummary,
} from '@/components/dashboard/player/playerDashboardData';

jest.mock('@/components/dashboard/player/playerDashboardData', () => ({
  describePlayerDashboardFailures: jest.fn(() => ''),
  fetchPlayerDashboardSections: jest.fn(),
  fetchPlayerHandoutSummary: jest.fn(),
}));

jest.mock('@/components/dashboard/player/PlayerDashboardHeader', () => () => null);
jest.mock('@/components/dashboard/player/PlayerDashboardLoading', () => () => <div>Loading player dashboard</div>);
jest.mock('@/components/dashboard/player/PlayerJoinStrip', () => () => null);
jest.mock('@/components/dashboard/player/PlayerDashboardContext', () => () => null);
jest.mock('@/components/dashboard/player/PlayerDashboardTabs', () => ({ children }) => <div>{children}</div>);
jest.mock('@/components/dashboard/player/PlayerCharactersPanel', () => ({ characters, onOpenCharacter }) => (
  <div>
    Characters ready
    {characters?.[0] && <button type="button" onClick={() => onOpenCharacter(characters[0])}>Open mocked sheet</button>}
  </div>
));
jest.mock('@/components/dashboard/player/PlayerCampaignsPanel', () => () => null);
jest.mock('@/components/dashboard/player/PlayerSuggestionBox', () => () => null);
jest.mock('@/components/JoinCampaignModal', () => () => null);

function SheetRouteProbe() {
  const location = useLocation();
  return <div data-testid="sheet-return-state">{location.state?.playerReturnTo || 'none'}</div>;
}

beforeEach(() => {
  jest.resetAllMocks();
  window.localStorage.clear();
  fetchPlayerDashboardSections.mockResolvedValue({
    ok: true,
    failures: [],
    characters: [{ id: 'hero-1', name: 'Hero', level: 2, character_class: 'Fighter' }],
    campaigns: [],
  });
  fetchPlayerHandoutSummary.mockResolvedValue({ total: 0, unread: 0, saved: 0 });
});

test('does not turn a failed handout summary request into a confirmed zero state', async () => {
  fetchPlayerHandoutSummary.mockRejectedValue(new Error('offline'));

  render(<MemoryRouter><PlayerDashboard /></MemoryRouter>);

  expect(await screen.findByText('Characters ready')).toBeInTheDocument();
  const warning = await screen.findByTestId('player-handout-summary-warning');
  expect(warning).toHaveTextContent('Received-handout status is temporarily unavailable');
  expect(warning).toHaveTextContent('Unread items have not been counted yet');
});

test('opens a character sheet with Player Home as its safe return context', async () => {
  render(
    <MemoryRouter initialEntries={['/player']}>
      <Routes>
        <Route path="/player" element={<PlayerDashboard />} />
        <Route path="/characters/:characterId" element={<SheetRouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Characters ready')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open mocked sheet' }));

  expect(await screen.findByTestId('sheet-return-state')).toHaveTextContent('/player');
});

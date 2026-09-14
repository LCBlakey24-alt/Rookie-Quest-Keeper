import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
jest.mock('@/components/dashboard/player/PlayerCharactersPanel', () => () => <div>Characters ready</div>);
jest.mock('@/components/dashboard/player/PlayerCampaignsPanel', () => () => null);
jest.mock('@/components/dashboard/player/PlayerSuggestionBox', () => () => null);
jest.mock('@/components/JoinCampaignModal', () => () => null);

beforeEach(() => {
  jest.resetAllMocks();
  window.localStorage.clear();
  fetchPlayerDashboardSections.mockResolvedValue({
    ok: true,
    failures: [],
    characters: [{ id: 'hero-1', name: 'Hero', level: 2, character_class: 'Fighter' }],
    campaigns: [],
  });
});

test('does not turn a failed handout summary request into a confirmed zero state', async () => {
  fetchPlayerHandoutSummary.mockRejectedValue(new Error('offline'));

  render(<MemoryRouter><PlayerDashboard /></MemoryRouter>);

  expect(await screen.findByText('Characters ready')).toBeInTheDocument();
  const warning = await screen.findByTestId('player-handout-summary-warning');
  expect(warning).toHaveTextContent('Received-handout status is temporarily unavailable');
  expect(warning).toHaveTextContent('Unread items have not been counted yet');
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useDashboardData from '@/components/dashboard/useDashboardData';
import UnifiedDashboard from './UnifiedDashboard';

jest.mock('@/components/dashboard/useDashboardData', () => ({
  __esModule: true,
  default: jest.fn(),
}));

function dashboardFixture(overrides = {}) {
  return {
    characters: [{ id: 'char-1', name: 'Javen Crow', level: 9, race: 'Human' }],
    campaigns: [{ id: 'camp-1', name: 'Baldering' }],
    homebrewItems: [{ id: 'hb-1', name: 'Steelstitch Jumper', content_type: 'item' }],
    loading: false,
    slowLoad: false,
    refreshing: false,
    recentCharacters: [{ id: 'char-1', name: 'Javen Crow', level: 9, race: 'Human', updated_at: '2026-08-24T12:00:00Z' }],
    recentCampaigns: [],
    recentHomebrew: [],
    loadDashboard: jest.fn(),
    ...overrides,
  };
}

function renderDashboard(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <UnifiedDashboard username="Lewis" onLogout={jest.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('UnifiedDashboard simplified home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDashboardData.mockReturnValue(dashboardFixture());
  });

  test('keeps the home screen focused on four destinations and recent activity', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Characters Open and manage your heroes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Campaigns Prep, run, and return to your tables/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Character Start a new playable hero/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Homebrew Create and manage custom content/i })).toBeInTheDocument();
    expect(screen.getByText('Javen Crow')).toBeInTheDocument();
  });

  test('does not bring the retired noticeboard sections back', () => {
    renderDashboard();

    expect(screen.queryByText('Site Updates')).not.toBeInTheDocument();
    expect(screen.queryByText('Hub checks')).not.toBeInTheDocument();
    expect(screen.queryByText('System status')).not.toBeInTheDocument();
    expect(screen.queryByText('Command centre')).not.toBeInTheDocument();
  });

  test('keeps refresh and logout available without extra dashboard panels', () => {
    const loadDashboard = jest.fn();
    const onLogout = jest.fn();
    useDashboardData.mockReturnValue(dashboardFixture({ loadDashboard }));

    renderDashboard({ onLogout });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(loadDashboard).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

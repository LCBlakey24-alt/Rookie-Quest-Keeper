import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useDashboardData from '@/components/dashboard/useDashboardData';
import UnifiedDashboard from './UnifiedDashboard';

jest.mock('@/components/dashboard/home/SiteUpdatesPanel', () => () => <section><h2>News &amp; Updates</h2><p>Site announcements</p></section>);

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
    recentCampaigns: [{ id: 'camp-1', name: 'Balderin', world_name: 'Tia-Karta', updated_at: '2026-08-23T12:00:00Z' }],
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

  test('prioritises news, site updates and recent activity without a duplicate Player hub', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'News & Updates' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Javen Crow/ })).toHaveAttribute('href', '/characters/char-1');
    expect(screen.getByRole('link', { name: /Balderin/ })).toHaveAttribute('href', '/campaign/camp-1');
    expect(screen.queryByRole('heading', { name: 'Start something' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Continue' })).not.toBeInTheDocument();
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

  test('presents a failed read as a retryable warning rather than empty activity', () => {
    const loadDashboard = jest.fn();
    useDashboardData.mockReturnValue(dashboardFixture({
      recentCharacters: [],
      recentCampaigns: [],
      recentHomebrew: [],
      dashboardWarning: 'Could not refresh characters. Showing last known data where available.',
      loadDashboard,
    }));

    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent('Could not refresh characters');
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    expect(loadDashboard).toHaveBeenCalledWith({ notifyFailure: false });
  });

  test('keeps the loading state announced while dashboard data is pending', () => {
    useDashboardData.mockReturnValue(dashboardFixture({ loading: true, slowLoad: true }));

    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent('Opening dashboard…');
    expect(screen.getByRole('status')).toHaveTextContent('The backend may be waking up.');
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).not.toBeInTheDocument();
  });
});

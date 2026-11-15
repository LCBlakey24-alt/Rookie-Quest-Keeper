
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useDashboardData from '@/components/dashboard/useDashboardData';
import UnifiedDashboard from './UnifiedDashboard';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock('@/components/dashboard/useDashboardData', () => ({ __esModule: true, default: jest.fn() }));

function fixture(overrides = {}) {
  return {
    characters: [{ id: 'char-1', name: 'Sample Hero', level: 5, race: 'Human' }],
    campaigns: [{ id: 'camp-1', name: 'Sample Campaign' }],
    homebrewItems: [
      { id: 'hb-1', name: 'Hidden Item', visibility: 'private' },
      { id: 'hb-2', name: 'Public Item', visibility: 'public' },
    ],
    loading: false, slowLoad: false, refreshing: false,
    recentCharacters: [{ id: 'char-1', name: 'Sample Hero', level: 5, updated_at: '2026-08-24T12:00:00Z' }],
    recentCampaigns: [{ id: 'camp-1', name: 'Sample Campaign', updated_at: '2026-08-23T12:00:00Z' }],
    recentHomebrew: [], dashboardWarning: '',
    loadDashboard: jest.fn(), ...overrides,
  };
}
function renderHome(props = {}) {
  return render(<MemoryRouter><UnifiedDashboard username="Demo" onLogout={jest.fn()} {...props}/></MemoryRouter>);
}

describe('home beta notice', () => {
  beforeEach(() => { jest.clearAllMocks(); useDashboardData.mockReturnValue(fixture()); });
  test('always shows the beta status and opens the existing feedback form event', () => {
    const spy = jest.fn();
    window.addEventListener('rook-feedback-open', spy);
    renderHome();
    expect(screen.getByTestId('beta-notice-home')).toHaveTextContent('EARLY ACCESS · PUBLIC BETA');
    fireEvent.click(screen.getByTestId('beta-notice-feedback'));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('rook-feedback-open', spy);
  });
});

describe('Home Dashboard v5', () => {
  beforeEach(() => { jest.clearAllMocks(); window.localStorage.clear(); useDashboardData.mockReturnValue(fixture()); });
  test('the hub wheel shows each count, opens its page and has a list alternative', () => {
    renderHome();
    const wheel = screen.getByTestId('home-hub-wheel');
    expect(wheel).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Characters: 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shared Creations: 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Character' })).toBeInTheDocument();
    const dice = jest.fn();
    window.addEventListener('rq-dice-open', dice);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dice roller' }));
    window.removeEventListener('rq-dice-open', dice);
    expect(dice).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('home-hub-view-toggle'));
    expect(screen.queryByTestId('home-hub-wheel')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Characters: 1/ })).toHaveAttribute('href', '/characters');
    expect(window.localStorage.getItem('rqk.home.hubView')).toBe('list');
  });
  test('shows the four personal cards without counting private homebrew as shared', () => {
    window.localStorage.setItem('rqk.home.hubView', 'list');
    renderHome();
    expect(screen.getByRole('heading', { name: 'Your Adventure Hub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Announcements' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Characters: 1/ })).toHaveAttribute('href', '/characters');
    expect(screen.getByRole('link', { name: /Campaigns: 1/ })).toHaveAttribute('href', '/campaigns');
    expect(screen.getByRole('link', { name: /Homebrew: 2/ })).toHaveAttribute('href', '/homebrew');
    expect(screen.getByRole('link', { name: /Shared Creations: 1/ })).toHaveAttribute('href', '/homebrew');
    expect(screen.queryByText('Start Your Adventure')).not.toBeInTheDocument();
  });
  test('offers getting started only for a genuinely empty account', () => {
    useDashboardData.mockReturnValue(fixture({
      characters: [], campaigns: [], homebrewItems: [],
      recentCharacters: [], recentCampaigns: [], recentHomebrew: [],
    }));
    renderHome();
    expect(screen.getByRole('heading', { name: 'Start Your Adventure' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create a Character/ })).toHaveAttribute('href', '/characters/new');
    expect(screen.getByRole('link', { name: /Create a Campaign/ })).toHaveAttribute('href', '/campaigns');
  });
  test('does not call an established homebrew-only account empty', () => {
    useDashboardData.mockReturnValue(fixture({
      characters: [], campaigns: [], homebrewItems: [{ id: 'hb-42', name: 'Saved spell', visibility: 'private' }],
      recentCharacters: [], recentCampaigns: [], recentHomebrew: [],
    }));
    window.localStorage.setItem('rqk.home.hubView', 'list');
    renderHome();
    expect(screen.queryByText('Start Your Adventure')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Homebrew: 1/ })).toHaveAttribute('href', '/homebrew');
  });
  test('retains warning and retry, without claiming an offline account is empty', () => {
    const loadDashboard = jest.fn();
    useDashboardData.mockReturnValue(fixture({ characters: [], campaigns: [], dashboardWarning: 'Could not refresh your library', loadDashboard }));
    renderHome();
    expect(screen.queryByText('Start Your Adventure')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    expect(loadDashboard).toHaveBeenCalledWith({ notifyFailure: false });
  });
  test('preserves refresh and logout controls', () => {
    const loadDashboard = jest.fn(); const onLogout = jest.fn();
    useDashboardData.mockReturnValue(fixture({ loadDashboard }));
    renderHome({ onLogout });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(loadDashboard).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
  test('keeps initial loading readable', () => {
    useDashboardData.mockReturnValue(fixture({ loading: true, slowLoad: true }));
    renderHome();
    expect(screen.getByRole('status')).toHaveTextContent('Opening dashboard…');
    expect(screen.getByRole('status')).toHaveTextContent('The backend may be waking up.');
  });
});

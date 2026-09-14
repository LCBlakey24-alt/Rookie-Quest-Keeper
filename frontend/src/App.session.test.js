import React, { Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import apiClient from '@/lib/apiClient';
import { clearAuthToken, setAuthToken } from '@/lib/auth';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('@/components/app/AppShell', () => ({ children }) => <div>{children}</div>);
jest.mock('@/components/UnifiedDashboard', () => ({ username }) => <h1>Dashboard for {username}</h1>);
jest.mock('@/components/gm/PlayerDisplayPage', () => () => <h1>Player display</h1>);
jest.mock('@/components/AuthPage', () => ({ onLogin }) => <button onClick={() => onLogin('new-token', 'New Keeper')}>Sign in</button>);
jest.mock('@/components/RookGlobalAssistant', () => () => null);
jest.mock('@/components/FloatingDiceRoller', () => () => null);
jest.mock('@/components/GlobalFeedbackButton', () => () => null);
jest.mock('@/components/admin/ImpersonationBanner', () => () => null);
jest.mock('@/components/ui/GlobalScrollRecovery', () => () => null);
jest.mock('@/components/ui/GlobalActionFillEffects', () => () => null);
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ setTheme: () => {} }), THEMES: {} }));

function openApp(path = '/home') {
  return render(<Suspense fallback={<p>Loading</p>}><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></Suspense>);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('dm_username', 'Keeper');
  setAuthToken('current-token');
  apiClient.get.mockResolvedValue({ data: {} });
});
afterEach(() => localStorage.clear());

test.each([429, 500, 502, 503])('a temporary %s profile failure keeps the signed-in workspace', async status => {
  apiClient.get.mockRejectedValue({ response: { status } });
  openApp();
  expect(await screen.findByRole('heading', { name: 'Dashboard for Keeper' })).toBeInTheDocument();
  expect(localStorage.getItem('dm_token')).toBe('current-token');
  expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
});

test('a confirmed expired session returns to sign-in', async () => {
  apiClient.get.mockRejectedValue({ response: { status: 401 } });
  openApp();
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(localStorage.getItem('dm_token')).toBeNull();
});

test('an API-triggered session clear immediately closes protected routes', async () => {
  openApp();
  await screen.findByRole('heading', { name: 'Dashboard for Keeper' });
  act(() => clearAuthToken());
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});

test('signing out in another tab updates the route gate', async () => {
  openApp();
  await screen.findByRole('heading', { name: 'Dashboard for Keeper' });
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'dm_token' }));
  });
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});

test('a late profile failure cannot sign out a newly selected account', async () => {
  let rejectProbe;
  apiClient.get.mockReturnValue(new Promise((resolve, reject) => { rejectProbe = reject; }));
  openApp();
  await screen.findByRole('heading', { name: 'Dashboard for Keeper' });
  await act(async () => {
    localStorage.setItem('dm_username', 'Another Keeper');
    setAuthToken('another-token');
    rejectProbe({ response: { status: 401 } });
  });
  expect(screen.getByRole('heading', { name: 'Dashboard for Another Keeper' })).toBeInTheDocument();
  expect(localStorage.getItem('dm_token')).toBe('another-token');
});

test('successful sign-in persists the username alongside the session', async () => {
  localStorage.clear();
  openApp('/auth');
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(localStorage.getItem('dm_username')).toBe('New Keeper'));
  expect(await screen.findByRole('heading', { name: 'Dashboard for New Keeper' })).toBeInTheDocument();
});

test('a player display link resumes after signing in', async () => {
  localStorage.clear();
  openApp('/player-display/campaign-1?view=tv');
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'Player display' })).toBeInTheDocument();
  expect(screen.queryByText(/Dashboard for/)).not.toBeInTheDocument();
});

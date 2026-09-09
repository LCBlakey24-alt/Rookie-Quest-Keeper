import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import apiClient from '@/lib/apiClient';
import * as mode from './previewMode';

jest.mock('@/components/app/AppShell', () => ({ children }) => <div>{children}</div>);
jest.mock('@/components/AuthPage', () => () => <div>Sign in screen</div>);
jest.mock('@/components/RookGlobalAssistant', () => () => null);
jest.mock('@/components/FloatingDiceRoller', () => () => null);
jest.mock('@/components/GlobalFeedbackButton', () => () => null);
jest.mock('@/components/GlobalScrollRecovery', () => () => null);
jest.mock('@/components/ui/GlobalActionFillEffects', () => () => null);

// Keep theme switching independent of this route/authentication integration test.
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ setTheme: () => {} }), THEMES: {} }));

afterEach(() => { jest.restoreAllMocks(); localStorage.clear(); });

test('the staging sign-in URL opens the real dashboard and sample data without authenticating', async () => {
  jest.spyOn(mode, 'isLocalPreview').mockReturnValue(true);
  const get = jest.spyOn(apiClient, 'get');
  const post = jest.spyOn(apiClient, 'post');
  render(<React.Suspense fallback={<p>Loading page</p>}><MemoryRouter initialEntries={['/auth']}><AppRoutes /></MemoryRouter></React.Suspense>);
  expect(await screen.findByText('Preview campaign')).toBeInTheDocument();
  expect(screen.getByText('Demo Fighter')).toBeInTheDocument();
  expect(screen.queryByText('Sign in screen')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  expect(get.mock.calls.some(([url]) => url === '/auth/me')).toBe(false);
  expect(post.mock.calls.some(([url]) => url.startsWith('/auth/'))).toBe(false);
});

test('a normal site still requires sign-in before opening the dashboard', async () => {
  jest.spyOn(mode, 'isLocalPreview').mockReturnValue(false);
  localStorage.clear();
  render(<React.Suspense fallback={<p>Loading page</p>}><MemoryRouter initialEntries={['/home']}><AppRoutes /></MemoryRouter></React.Suspense>);
  expect(await screen.findByText('Sign in screen')).toBeInTheDocument();
  expect(screen.queryByText('Preview campaign')).not.toBeInTheDocument();
});

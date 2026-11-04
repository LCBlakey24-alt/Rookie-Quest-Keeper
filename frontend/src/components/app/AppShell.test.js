import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import AppShell from './AppShell';

let mockPathname = '/campaigns';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: mockPathname }),
}), { virtual: true });

jest.mock('@/lib/apiClient', () => ({
  get: jest.fn(() => Promise.resolve({ data: { is_admin: false } })),
}), { virtual: true });

jest.mock('@/styles/appShellRail.css', () => ({}), { virtual: true });
jest.mock('@/styles/railFeedbackButtons.css', () => ({}), { virtual: true });

describe('Keeper simplified navigation', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    mockPathname = '/campaigns';
    localStorage.setItem('dm_username', 'TestKeeper');
    sessionStorage.clear();
    apiClient.get.mockResolvedValue({ data: { is_admin: false } });
  });

  afterEach(() => {
    window.innerWidth = originalWidth;
    sessionStorage.clear();
    localStorage.removeItem('dm_username');
  });

  test('retains canonical vector branding with no Player home navigation', () => {
    const html = renderToStaticMarkup(<AppShell><main>GM prep content</main></AppShell>);
    expect(html).toContain('/brand/rookie-quest-keeper-app-icon.svg');
    expect(html).toContain('GM prep content');
    expect(html).not.toContain('Player home');
    expect(html).toContain('Homebrew');
  });

  test.each([320, 390, 719])('keeps four main tabs plus More for ordinary players at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Dashboard', 'Characters', 'Campaigns', 'Homebrew',
    ]);
    expect(within(nav).getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    const moreTrigger = screen.getByRole('button', { name: 'Open more tools' });
    fireEvent.click(moreTrigger);
    const more = screen.getByRole('menu', { name: 'More app tools' });
    expect(within(more).getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/account');
    expect(within(more).getByRole('menuitem', { name: 'Uploads' })).toHaveAttribute('href', '/uploads');
    expect(within(more).queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('keeps player campaign details under the Campaigns tab', async () => {
    mockPathname = '/player/campaign/c1';
    window.innerWidth = 390;
    await act(async () => { render(<AppShell><main>Player campaign content</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(nav).getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
  });

  test('keeps Settings marked inside More', async () => {
    mockPathname = '/account';
    window.innerWidth = 390;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    const trigger = screen.getByRole('button', { name: 'Open more tools, current section Settings' });
    fireEvent.click(trigger);
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });

  test('shows Admin as fifth mobile tab only after the backend grants access', async () => {
    window.innerWidth = 390;
    apiClient.get.mockResolvedValue({ data: { is_admin: true } });
    await act(async () => { render(<AppShell><main>Admin tools</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    await waitFor(() => expect(within(nav).getAllByRole('link')).toHaveLength(5));
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Dashboard', 'Characters', 'Campaigns', 'Homebrew', 'Admin',
    ]);
    expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    const more = screen.getByRole('button', { name: 'Open more tools' });
    expect(more.closest('.rqk-app-topbar')).toBeInTheDocument();
    fireEvent.click(more);
    expect(screen.getByRole('menu', { name: 'More app tools' })).toBeInTheDocument();
  });

  test.each([720, 1180, 1440])('retains primary and secondary destinations on larger screens at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(nav).getAllByRole('link')).toHaveLength(6);
    expect(within(nav).getByRole('link', { name: 'Homebrew' })).toHaveAttribute('href', '/homebrew');
    expect(screen.getByRole('link', { name: 'Rookie Quest Keeper dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Rook' })).toBeInTheDocument();
  });

  test('closes More on resize and preserves four destinations', async () => {
    window.innerWidth = 390;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    fireEvent.click(screen.getByRole('button', { name: 'Open more tools' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Player home' })).not.toBeInTheDocument();
    window.innerWidth = 390;
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('button', { name: 'Open more tools' })).toHaveAttribute('aria-expanded', 'false');
  });
});

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

  test.each([320, 390, 719])('keeps five primary tabs and a top-bar tools menu for ordinary players at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Home', 'Characters', 'Campaigns', 'Homebrew', 'Community',
    ]);
    expect(within(nav).getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    const moreTrigger = screen.getByRole('button', { name: 'Open more tools' });
    fireEvent.click(moreTrigger);
    const more = screen.getByRole('menu', { name: 'More app tools' });
    expect(within(more).getByRole('menuitem', { name: 'Account settings' })).toHaveAttribute('href', '/account');
    expect(within(more).getByRole('menuitem', { name: 'Legacy uploads' })).toHaveAttribute('href', '/uploads');
    expect(within(more).queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('keeps the labelled desktop rail on Homebrew and compact detail rail only on detail pages', async () => {
    window.innerWidth = 1440;
    mockPathname = '/home';
    const view = render(<AppShell><main>Home screen</main></AppShell>);
    const shell = view.container.querySelector('.rqk-app-shell');
    expect(shell).not.toHaveAttribute('data-rq-focus');

    mockPathname = '/homebrew';
    view.rerender(<AppShell><main>Homebrew screen</main></AppShell>);
    expect(shell).not.toHaveAttribute('data-rq-focus');
    expect(within(screen.getByRole('navigation', { name: 'Main app sections' }))
      .getByRole('link', { name: 'Homebrew' })).toHaveAttribute('aria-current', 'page');

    mockPathname = '/campaign/sample-id';
    view.rerender(<AppShell><main>Campaign detail screen</main></AppShell>);
    expect(shell).toHaveAttribute('data-rq-focus', 'detail');
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
    const trigger = screen.getByRole('button', { name: 'Open more tools, current section Account settings' });
    fireEvent.click(trigger);
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Account settings' })).toHaveAttribute('aria-current', 'page');
  });

  test('keeps the five primary mobile tabs and exposes Admin in More only after backend approval', async () => {
    window.innerWidth = 390;
    apiClient.get.mockResolvedValue({ data: { is_admin: true } });
    await act(async () => { render(<AppShell><main>Admin tools</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    await waitFor(() => expect(within(nav).getAllByRole('link')).toHaveLength(5));
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Home', 'Characters', 'Campaigns', 'Homebrew', 'Community',
    ]);
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'Open more tools' });
    expect(more.closest('.rqk-app-topbar')).toBeInTheDocument();
    fireEvent.click(more);
    expect(within(screen.getByRole('menu', { name: 'More app tools' })).getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  test.each([720, 1180, 1440])('keeps the approved five primary destinations on larger screens at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    const nav = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(nav).getAllByRole('link')).toHaveLength(5);
    expect(within(nav).getByRole('link', { name: 'Homebrew' })).toHaveAttribute('href', '/homebrew');
    expect(screen.getByRole('link', { name: 'Rookie Quest Keeper dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Rook' })).toBeInTheDocument();
  });

  test('closes More on resize and preserves five primary destinations', async () => {
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

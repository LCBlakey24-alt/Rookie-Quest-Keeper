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

jest.mock('@/components/level-up-grant/LevelUpGrantWatcher', () => () => null);

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

  describe('phone navigation polish', () => {
    test('the More panel takes focus when it opens and a tap outside closes it', async () => {
      window.innerWidth = 390;
      await act(async () => { render(<AppShell><main>Content</main></AppShell>); });
      fireEvent.click(screen.getByRole('button', { name: 'Open more tools' }));
      const more = screen.getByRole('menu', { name: 'More app tools' });
      expect(within(more).getAllByRole('menuitem')[0]).toHaveFocus();
      fireEvent.click(screen.getByTestId('mobile-more-backdrop'));
      expect(screen.queryByRole('menu', { name: 'More app tools' })).not.toBeInTheDocument();
    });

    test('the veil is not a control: keyboard users close with Escape or the close button', async () => {
      window.innerWidth = 390;
      await act(async () => { render(<AppShell><main>Content</main></AppShell>); });
      fireEvent.click(screen.getByRole('button', { name: 'Open more tools' }));
      const veil = screen.getByTestId('mobile-more-backdrop');
      expect(veil.tagName).toBe('DIV');
      expect(veil).toHaveAttribute('aria-hidden', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Close more tools' }));
      expect(screen.queryByRole('menu', { name: 'More app tools' })).not.toBeInTheDocument();
    });

    test('phones show the brand mark linking home beside the section title', async () => {
      window.innerWidth = 390;
      await act(async () => { render(<AppShell><main>Content</main></AppShell>); });
      expect(screen.getByRole('link', { name: 'Rookie Quest Keeper home' })).toHaveAttribute('href', '/home');
    });

    test('on a phone, the creator swaps the brand mark for a back arrow home and marks the shell as a task', async () => {
      window.innerWidth = 390;
      mockPathname = '/characters/new';
      let view;
      await act(async () => { view = render(<AppShell><main>Content</main></AppShell>); });
      expect(screen.getByRole('link', { name: 'Back to home dashboard' })).toHaveAttribute('href', '/home');
      expect(screen.queryByRole('link', { name: 'Rookie Quest Keeper home' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Open more tools/ })).not.toBeInTheDocument();
      expect(view.container.querySelector('.rqk-app-shell')).toHaveAttribute('data-rq-task', 'true');
    });

    test('ordinary pages are not marked as a task', async () => {
      window.innerWidth = 390;
      let view;
      await act(async () => { view = render(<AppShell><main>Content</main></AppShell>); });
      expect(view.container.querySelector('.rqk-app-shell')).not.toHaveAttribute('data-rq-task');
    });

    test('larger screens keep their own header without the phone brand mark', async () => {
      window.innerWidth = 1280;
      await act(async () => { render(<AppShell><main>Content</main></AppShell>); });
      expect(screen.queryByRole('link', { name: 'Rookie Quest Keeper home' })).not.toBeInTheDocument();
    });

    test('every tab carries the current-tab indicator, hidden from assistive tech', async () => {
      window.innerWidth = 390;
      await act(async () => { render(<AppShell><main>Content</main></AppShell>); });
      const nav = screen.getByRole('navigation', { name: 'Main app sections' });
      within(nav).getAllByRole('link').forEach((link) => {
        const indicator = link.querySelector('.rqk-app-rail-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator).toHaveAttribute('aria-hidden', 'true');
      });
      // Accessible names are unchanged by the indicator.
      expect(within(nav).getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
    });
  });
});

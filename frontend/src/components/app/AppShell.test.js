import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import AppShell from './AppShell';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/campaigns' }),
}), { virtual: true });

jest.mock('@/lib/apiClient', () => ({
  get: jest.fn(() => Promise.resolve({ data: { is_admin: false } })),
}), { virtual: true });

jest.mock('@/styles/appShellRail.css', () => ({}), { virtual: true });
jest.mock('@/styles/railFeedbackButtons.css', () => ({}), { virtual: true });

describe('AppShell', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    window.innerWidth = originalWidth;
  });

  test('renders the current app navigation, brand mark, and page content', () => {
    const html = renderToStaticMarkup(<AppShell><main>GM prep content</main></AppShell>);

    expect(html).toContain('/brand/rqk-logo-mini.svg');
    expect(html).toContain('Campaigns');
    expect(html).toContain('Characters');
    expect(html).toContain('Homebrew');
    expect(html).toContain('GM prep content');
    expect(html).not.toContain('Search Rookie Quest Keeper');
    expect(html).not.toContain('Search characters, campaigns, notes');
  });

  test.each([320, 390, 719])('keeps the phone dock to four sections and More at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });

    const navigation = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(navigation).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dashboard', 'Characters', 'Campaigns', 'Homebrew',
    ]);
    expect(within(navigation).getByRole('link', { name: 'Campaigns' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Rookie Quest Keeper dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Player home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask Rook' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open more tools' }));
    const more = screen.getByRole('menu', { name: 'More app tools' });
    expect(within(more).getByRole('menuitem', { name: 'Player home' })).toHaveAttribute('href', '/player');
    expect(within(more).getByRole('menuitem', { name: 'Uploads' })).toHaveAttribute('href', '/uploads');
    expect(within(more).getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/account');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open more tools' })).toHaveAttribute('aria-expanded', 'false');
  });

  test.each([720, 1180, 1440])('preserves the full navigation rail at %ipx', async (width) => {
    window.innerWidth = width;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });

    const navigation = screen.getByRole('navigation', { name: 'Main app sections' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(7);
    expect(within(navigation).getByRole('link', { name: 'Player home' })).toHaveAttribute('href', '/player');
    expect(screen.getByRole('link', { name: 'Rookie Quest Keeper dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Rook' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open more tools' })).not.toBeInTheDocument();
  });

  test('closes More and restores the correct navigation when resizing', async () => {
    window.innerWidth = 390;
    await act(async () => { render(<AppShell><main>Dashboard content</main></AppShell>); });
    fireEvent.click(screen.getByRole('button', { name: 'Open more tools' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Player home' })).toBeInTheDocument();

    window.innerWidth = 390;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('link', { name: 'Player home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open more tools' })).toHaveAttribute('aria-expanded', 'false');
  });
});

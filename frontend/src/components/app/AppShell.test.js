import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
  test('renders desktop workspace search and page content', () => {
    const html = renderToStaticMarkup(<AppShell><main>GM prep content</main></AppShell>);

    expect(html).toContain('Search Rookie Quest Keeper');
    expect(html).toContain('Search characters, campaigns, notes');
    expect(html).toContain('My Campaigns');
    expect(html).toContain('GM prep content');
  });
});

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import RouteLoadingScreen from './RouteLoadingScreen';

describe('RouteLoadingScreen', () => {
  afterEach(() => jest.useRealTimers());

  test('renders the Keeper wordmark with real brand imagery and no pretend progress stages', () => {
    const html = renderToStaticMarkup(<RouteLoadingScreen />);
    expect(html).toContain('ROOKIE QUEST');
    expect(html).toContain('KEEPER');
    expect(html).toContain('Preparing your workspace');
    expect(html).toContain('rqk-route-brand-rule');
    expect(html).toContain('/brand/keeper-symbol.png');
    expect(html).not.toContain('rqk-route-orbit');
    expect(html).not.toContain('Loading checklist');
    expect(html).not.toContain('rqk-route-card');
  });

  test('shows recovery control after 10 seconds, not before', () => {
    jest.useFakeTimers();
    render(<RouteLoadingScreen />);
    expect(screen.queryByRole('button', { name: 'Reload Keeper' })).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByRole('button', { name: 'Reload Keeper' })).toBeInTheDocument();
    expect(screen.getByText(/saved campaigns have not been reset/)).toBeInTheDocument();
  });

  test('uses a decorative logo and an accessible live status', () => {
    const { container } = render(<RouteLoadingScreen />);
    const logo = container.querySelector('img[src="/brand/keeper-symbol.png"]');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', '');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { name: 'KEEPER', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Every great story begins at the table.')).toBeInTheDocument();
  });

  test('keeps the current flat-navy design and reduced-motion fallback', () => {
    const styles = readFileSync(join(__dirname, 'RouteLoadingScreen.css'), 'utf8');
    expect(styles).toContain('--rq-citrus-navy');
    expect(styles).toContain('--rq-citrus-gradient');
    expect(styles).toContain('prefers-reduced-motion: reduce');
    expect(styles).not.toContain('radial-gradient');
    expect(styles).not.toContain('rqkLedgerOrbit');
  });

  test('cleans up the stall timer when loading ends', () => {
    jest.useFakeTimers();
    const { unmount } = render(<RouteLoadingScreen />);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

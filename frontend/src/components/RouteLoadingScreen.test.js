import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import RouteLoadingScreen from './RouteLoadingScreen';

describe('RouteLoadingScreen', () => {
  afterEach(() => jest.useRealTimers());

  test('renders a quiet, accessible loading screen without fake progress stages', () => {
    const html = renderToStaticMarkup(<RouteLoadingScreen />);
    expect(html).toContain('Opening Rookie Quest Keeper');
    expect(html).toContain('Preparing your workspace');
    expect(html).toContain('route-loading-screen');
    expect(html).not.toContain('Loading checklist');
    expect(html).not.toContain('Sheets</li>');
  });

  test('shows recovery control after 10 seconds, not before', () => {
    jest.useFakeTimers();
    render(<RouteLoadingScreen />);
    expect(screen.queryByRole('button', { name: 'Reload Keeper' })).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByRole('button', { name: 'Reload Keeper' })).toBeInTheDocument();
    expect(screen.getByText(/saved campaigns have not been reset/)).toBeInTheDocument();
  });

  test('cleans up the stall timer when loading ends', () => {
    jest.useFakeTimers();
    const { unmount } = render(<RouteLoadingScreen />);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

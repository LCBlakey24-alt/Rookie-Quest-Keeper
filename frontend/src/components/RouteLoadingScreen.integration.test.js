import React from 'react';
import { act, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import RouteLoadingScreen from './RouteLoadingScreen';

describe('one Keeper loading screen for full-page transitions', () => {
  test('reuses the campaign library branding with an accessible route-specific status', () => {
    const { container } = render(
      <RouteLoadingScreen
        label="Live Play is loading"
        status="Opening Live Play…"
        description="Gathering session controls."
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('route-loading-screen');
    expect(screen.getByRole('region', { name: 'Live Play is loading' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'KEEPER' })).toBeInTheDocument();
    expect(screen.getByText('Opening Live Play…')).toBeInTheDocument();
    expect(screen.getByText('Gathering session controls.')).toBeInTheDocument();
    expect(container.querySelector('.rq-hex-loader--lg image')).toHaveAttribute('href', '/brand/rqk-hex-logo-360.png');
    expect(container.querySelector('.loading-spinner')).not.toBeInTheDocument();
  });

  test('offers a recovery option only if an initial page load takes unusually long', () => {
    jest.useFakeTimers();
    try {
      render(<RouteLoadingScreen status="Opening characters…" />);
      expect(screen.queryByRole('group', { name: 'Loading recovery' })).not.toBeInTheDocument();
      act(() => jest.advanceTimersByTime(10_000));
      expect(screen.getByRole('group', { name: 'Loading recovery' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload Keeper' })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test.each([
    'App.js',
    'components/MyCampaignsPage.js',
    'components/MyCharactersPage.js',
    'components/UnifiedDashboard.js',
    'components/CampaignDashboard.js',
    'components/gm/LiveSessionGridPage.js',
    'components/dashboard/player/PlayerDashboardLoading.js',
    'components/AccountSettings.js',
    'components/AdminPage.js',
    'components/admin/VerifiedAdminRoute.js',
    'components/CleanCharacterSheet.js',
    'components/hex-sheet/HexCharacterSheet.js',
    'components/CharacterProfileEditor.js',
    'components/MobilePlayerCampaignView.js',
    'components/player/PlayerCampaignPage.js',
  ])('uses the campaign library loading screen for %s rather than another full-page design', (relative) => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
    expect(source).toContain('RouteLoadingScreen');
    expect(source).toMatch(/<RouteLoadingScreen(?:\s|\/>)/);
  });
});

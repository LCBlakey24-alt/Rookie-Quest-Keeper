import fs from 'fs';
import path from 'path';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import CombatInitiativeSubmitter from './CombatInitiativeSubmitter';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

const source = fs.readFileSync(path.join(__dirname, 'CombatInitiativeSubmitter.js'), 'utf8');

describe('player combat initiative widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses the flat player palette instead of the retired red theme', () => {
    expect(source).toContain("panel: '#0C2234'");
    expect(source).toContain("card: '#102B40'");
    expect(source).toContain("blue: '#7CCBFF'");
    expect(source).toContain("lineStrong: '#FF2DAA'");
    expect(source).not.toMatch(/var\(--rq-accent-primary\)|#d00000/i);
  });

  test('polls gently while idle, faster during combat, and pauses hidden tabs', () => {
    expect(source).toContain('const ACTIVE_POLL_MS = 4000;');
    expect(source).toContain('const IDLE_POLL_MS = 15000;');
    expect(source).toContain('combatActive ? ACTIVE_POLL_MS : IDLE_POLL_MS');
    expect(source).toContain("document.visibilityState !== 'hidden'");
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibility)");
    expect(source).toContain('window.setInterval(refreshIfVisible, pollMs)');
  });

  test('shows an explicit unavailable state when initiative status cannot be checked', async () => {
    apiClient.get.mockRejectedValue(new Error('offline'));

    render(<CombatInitiativeSubmitter campaignId="campaign-a" />);

    const unavailable = await screen.findByTestId('player-combat-initiative-unavailable');
    expect(unavailable).toHaveTextContent('Initiative status unavailable');
    expect(unavailable).toHaveTextContent('Retry before assuming no initiative is needed');
    expect(screen.queryByTestId('player-combat-initiative')).not.toBeInTheDocument();
  });

  test('keeps the last confirmed active combat visible when a refresh fails', async () => {
    apiClient.get
      .mockResolvedValueOnce({
        data: {
          combat_active: true,
          combat_id: 'combat-1',
          submission: null,
          character: { id: 'hero-1', name: 'Hero', initiative_bonus: 3 },
        },
      })
      .mockRejectedValueOnce(new Error('temporary outage'));

    render(<CombatInitiativeSubmitter campaignId="campaign-a" />);

    expect(await screen.findByTestId('player-combat-initiative')).toBeInTheDocument();
    expect(screen.getByText('Hero has not submitted initiative yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Refresh initiative status'));

    await waitFor(() => {
      expect(screen.getByTestId('player-combat-initiative-warning')).toHaveTextContent('Showing the last confirmed combat state');
    });
    expect(screen.getByTestId('player-combat-initiative')).toBeInTheDocument();
    expect(screen.getByText('Hero has not submitted initiative yet.')).toBeInTheDocument();
  });

  test('confirmed inactive combat stays hidden', async () => {
    apiClient.get.mockResolvedValue({
      data: { combat_active: false, combat_id: '', submission: null },
    });

    const { container } = render(<CombatInitiativeSubmitter campaignId="campaign-a" />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

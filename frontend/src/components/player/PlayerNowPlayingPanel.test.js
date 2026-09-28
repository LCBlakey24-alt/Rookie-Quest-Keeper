import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PlayerNowPlayingPanel, { buildPlayerNowPlayingSummary } from './PlayerNowPlayingPanel';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('PlayerNowPlayingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('recognises a player turn even when the GM display prefixes the active player id', () => {
    const summary = buildPlayerNowPlayingSummary({
      mode: 'combat',
      payload: {
        title: 'Bridge Ambush',
        round: 3,
        active_id: 'player-char-1',
        party: [
          { id: 'char-1', name: 'Rina', type: 'player' },
          { id: 'char-2', name: 'Javen', type: 'player' },
        ],
        tokens: [{ id: 'goblin-1', name: 'Goblin', type: 'enemy' }],
      },
    }, ['char-1']);

    expect(summary).toMatchObject({
      kind: 'combat',
      title: 'Bridge Ambush',
      round: 3,
      activeName: 'Rina',
      isPlayersTurn: true,
      subtitle: 'Your turn · Round 3',
      partyCount: 2,
      visibleEnemies: 1,
    });
  });

  test('renders active combat as a live player-facing table status', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        mode: 'combat',
        payload: {
          title: 'Crypt Fight',
          round: 2,
          active_id: 'enemy-1',
          party: [{ id: 'char-1', name: 'Hero', type: 'player' }],
          tokens: [{ id: 'enemy-1', name: 'Wight', type: 'enemy' }],
        },
      },
    });

    render(<PlayerNowPlayingPanel campaignId="c1" characters={[{ id: 'char-1', name: 'Hero' }]} />);

    expect(await screen.findByText('Crypt Fight')).toBeInTheDocument();
    expect(screen.getByText("Wight's turn · Round 2")).toBeInTheDocument();
    expect(screen.getByText('Visible foes').parentElement).toHaveTextContent('1');
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/display-state');
  });

  test('shows an explicit warning instead of pretending the live state is empty when loading fails', async () => {
    apiClient.get.mockRejectedValue({
      response: { data: { detail: 'Network unavailable' } },
    });

    render(<PlayerNowPlayingPanel campaignId="c1" characters={[]} />);

    const warning = await screen.findByTestId('player-live-status-unavailable');
    expect(warning).toHaveTextContent('Live table status unavailable');
    expect(warning).toHaveTextContent('Network unavailable');
  });

  test('blank display state stays out of the way when the live read succeeds', async () => {
    apiClient.get.mockResolvedValue({ data: { mode: 'blank', payload: {} } });

    const { container } = render(<PlayerNowPlayingPanel campaignId="c1" characters={[]} />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/display-state'));
    expect(container.querySelector('[data-testid="player-now-playing"]')).toBeNull();
    expect(container.querySelector('[data-testid="player-live-status-unavailable"]')).toBeNull();
  });
});

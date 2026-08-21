import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CombatConsolidatedTab from './CombatConsolidatedTab';
import apiClient from '@/lib/apiClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/components/gm/CombatTab', () => function MockCombatTab({ scenarios, players, selectedScenario }) {
  return (
    <div data-testid="mock-combat-tab">
      <span data-testid="scenario-count">{scenarios.length}</span>
      <span data-testid="player-count">{players.length}</span>
      <span data-testid="selected-scenario">{selectedScenario?.name || 'none'}</span>
    </div>
  );
});

jest.mock('@/components/gm/MonstersTab', () => function MockMonstersTab() {
  return <div>Monster Builder</div>;
});

describe('CombatConsolidatedTab load reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('preserves last known encounters and party when a later refresh fails', async () => {
    let failRefresh = false;
    apiClient.get.mockImplementation(url => {
      if (failRefresh) return Promise.reject(new Error('offline'));
      if (url === '/campaigns/campaign-1') return Promise.resolve({ data: { name: 'Tia-Karta' } });
      if (url.endsWith('/live-party')) return Promise.resolve({ data: [{ id: 'player-1', name: 'Valo' }] });
      if (url.endsWith('/combat-scenarios')) return Promise.resolve({ data: [{ id: 'enc-1', name: 'River Defence', combatants: [] }] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<CombatConsolidatedTab campaignId="campaign-1" />);

    await waitFor(() => expect(screen.getByTestId('scenario-count')).toHaveTextContent('1'));
    expect(screen.getByTestId('player-count')).toHaveTextContent('1');
    expect(screen.getByTestId('selected-scenario')).toHaveTextContent('River Defence');

    failRefresh = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByTestId('combat-prep-load-warning')).toHaveTextContent('keeping the last known data');
    expect(screen.getByTestId('scenario-count')).toHaveTextContent('1');
    expect(screen.getByTestId('player-count')).toHaveTextContent('1');
    expect(screen.getByTestId('selected-scenario')).toHaveTextContent('River Defence');
  });

  test('does not consume a quest encounter handoff when saved encounters fail to load', async () => {
    localStorage.setItem('gm.questEncounter.campaign-1', 'enc-wanted');
    apiClient.get.mockImplementation(url => {
      if (url === '/campaigns/campaign-1') return Promise.resolve({ data: { name: 'Tia-Karta' } });
      if (url.endsWith('/live-party')) return Promise.resolve({ data: [{ id: 'player-1', name: 'Valo' }] });
      if (url.endsWith('/combat-scenarios')) return Promise.reject(new Error('encounters unavailable'));
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<CombatConsolidatedTab campaignId="campaign-1" />);

    expect(await screen.findByTestId('combat-prep-load-warning')).toHaveTextContent('saved encounters');
    expect(localStorage.getItem('gm.questEncounter.campaign-1')).toBe('enc-wanted');
  });
});

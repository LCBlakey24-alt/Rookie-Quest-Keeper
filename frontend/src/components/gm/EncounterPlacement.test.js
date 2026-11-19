import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import EncounterPlacement from './EncounterPlacement';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// The canvas itself is covered elsewhere; here, expose its tokens and moves.
jest.mock('@/components/MapBuilder/MapCanvas', () => ({ __esModule: true, default: ({ tokens, onTokenMove, mapData }) => (
  <div data-testid="canvas" data-size={`${mapData.width}x${mapData.height}`}>
    {tokens.map(token => <span key={token.id} data-testid={`token-${token.id}`} data-side={token.isEnemy ? 'enemy' : 'ally'}>{token.x},{token.y}</span>)}
    <button type="button" onClick={() => onTokenMove('bandit', 6, 4)}>move bandit</button>
  </div>
) }));

const scenario = {
  id: 's1', name: 'Road ambush', battlefield_mode: 'saved', map_id: 'm1', grid_cols: 30, grid_rows: 20,
  combatants: [{ id: 'bandit', name: 'Bandit', type: 'monster' }, { id: 'guide', name: 'Sela the guide', type: 'npc' }],
  placements: [{ id: 'bandit', col: 10, row: 3 }],
};
const withParty = [{ id: 'hero', name: 'Synthetic Ranger', type: 'player' }, ...scenario.combatants];

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: [{ id: 'm1', name: 'Forest road', width: 15, height: 10, terrain: [] }] });
  apiClient.put.mockImplementation((url, body) => Promise.resolve({ data: { ...scenario, ...body } }));
});

test('places tokens on the encounter map, switches friend or foe, and saves both', async () => {
  const onSaved = jest.fn();
  render(<EncounterPlacement campaignId="c1" scenario={scenario} combatants={withParty} onSaved={onSaved} />);
  await waitFor(() => expect(screen.getByTestId('canvas')).toHaveAttribute('data-size', '15x10'));
  expect(screen.getByText(/On Forest road/)).toBeInTheDocument();
  expect(screen.getByTestId('token-bandit')).toHaveTextContent('10,3');
  expect(screen.getByTestId('token-guide')).toHaveAttribute('data-side', 'ally');
  expect(screen.queryByTestId('side-toggle-hero')).toBeNull();

  fireEvent.click(screen.getByTestId('side-toggle-guide'));
  expect(screen.getByTestId('token-guide')).toHaveAttribute('data-side', 'enemy');
  fireEvent.click(screen.getByText('move bandit'));
  fireEvent.click(screen.getByTestId('save-placements'));

  await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
  const [url, body] = apiClient.put.mock.calls[0];
  expect(url).toBe('/campaigns/c1/combat-scenarios/s1');
  expect(body.combatants).toEqual([scenario.combatants[0], { ...scenario.combatants[1], side: 'enemy' }]);
  expect(body.placements).toEqual(expect.arrayContaining([{ id: 'bandit', col: 6, row: 4 }, { id: 'hero', col: 1, row: 1 }]));
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ placements: body.placements }));
});

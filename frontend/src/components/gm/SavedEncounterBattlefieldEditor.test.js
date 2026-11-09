import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SavedEncounterBattlefieldEditor from './SavedEncounterBattlefieldEditor';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const scenario = {
  id: 'enc-1', name: 'Forest Ambush', combatants: [
    { id: 'hero-1', name: 'Aria', hp: 12, maxHp: 30 },
    { id: 'wolf-1', name: 'Wolf', hp: 11, maxHp: 11 },
  ],
  battlefield_mode: 'saved', map_id: 'map-old', terrain_type: 'stone',
  grid_cols: 30, grid_rows: 20, feet_per_square: 5,
};

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.put.mockReset();
  apiClient.get.mockResolvedValue({ data: [{ id: 'map-old', name: 'Old Map' }] });
});

test('a deliberate saved edit sends battlefield fields without overwriting combatants', async () => {
  const onSaved = jest.fn();
  apiClient.put.mockResolvedValue({ data: { ...scenario, map_id: '', map_url: null,
    battlefield_mode: 'generic', terrain_type: 'grass' } });
  render(<SavedEncounterBattlefieldEditor campaignId="c1" scenario={scenario} onSaved={onSaved} />);
  fireEvent.click(screen.getByText('Edit saved encounter battlefield'));
  fireEvent.click(screen.getByRole('button', { name: 'Generic textured floor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Grass' }));
  expect(apiClient.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save battlefield changes' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(apiClient.put).toHaveBeenCalledWith('/campaigns/c1/combat-scenarios/enc-1', expect.objectContaining({
    map_id: '', map_url: null, terrain_type: 'grass', battlefield_mode: 'generic',
  }));
  expect(apiClient.put.mock.calls[0][1]).not.toHaveProperty('combatants');
  expect(apiClient.put.mock.calls[0][1]).not.toHaveProperty('loot');
  expect(scenario.combatants[0].hp).toBe(12);
  expect(scenario.map_id).toBe('map-old');
});

test('failed map-only save preserves the draft and never claims a successful save', async () => {
  const onSaved = jest.fn();
  apiClient.put.mockRejectedValue(new Error('offline'));
  render(<SavedEncounterBattlefieldEditor campaignId="c1" scenario={scenario} onSaved={onSaved} />);
  fireEvent.click(screen.getByText('Edit saved encounter battlefield'));
  fireEvent.click(screen.getByRole('button', { name: 'Generic textured floor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mud' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save battlefield changes' }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Mud' })).toHaveAttribute('aria-pressed', 'true');
});

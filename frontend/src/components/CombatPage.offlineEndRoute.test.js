import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CombatPage from './CombatPage';
import apiClient from '@/lib/apiClient';
import { queueOfflineCombatEnd, queueOfflineCombatState } from '@/offline/offlineCombatSyncQueue';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: {
  get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn(),
} }));
jest.mock('@/offline/offlineApiCache', () => ({ readOfflineApiResponse: jest.fn().mockResolvedValue(null) }));
jest.mock('@/offline/offlineCombatSyncQueue', () => ({
  combatStateSnapshot: jest.fn(x => ({ current_hit_points: x.hp, max_hit_points: x.maxHp, conditions: x.conditions || [] })),
  queueOfflineCombatState: jest.fn(), queueOfflineCombatEnd: jest.fn(), queueOfflineCombatClose: jest.fn(),
}));
jest.mock('@/lib/liveDisplayBus', () => ({ createDisplayState: jest.fn((mode, payload) => ({ mode, payload })), publishDisplayState: jest.fn(), publishCampaignDisplayState: jest.fn().mockResolvedValue(null) }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() } }));
jest.mock('@/components/NPCCombatRecruiter', () => () => null);
jest.mock('@/components/gm/QuickBestiaryCombatPicker', () => () => null);
jest.mock('@/components/MapBuilder/MapCanvas', () => () => null);
jest.mock('@/components/gm/TargetedAttackPanel', () => () => null);

const scenario = { id: 'combat-demo', name: 'Synthetic fight', combatants: [
  { id: 'enemy', name: 'Venom Enemy', type: 'monster', hp: 0, maxHp: 14, initiative: 20, loot: [{ name: 'Venom', quantity: 1 }] },
  { id: 'pc', character_id: 'pc1', name: 'Hero', type: 'player', hp: 12, maxHp: 28, initiative: 10, conditions: ['poisoned'] },
] };
const checkpoint = (baseline = true) => ({
  scenarioId: scenario.id, combatants: scenario.combatants, currentTurn: 0, round: 2,
  ...(baseline ? { initialPlayerStates: { pc1: { current_hit_points: 20, max_hit_points: 28 } } } : {}),
  collectedLoot: [],
});
const mount = () => render(<MemoryRouter initialEntries={[{ pathname: '/combat/synthetic', state: { scenario, campaignName: 'Synthetic', source: 'live-play' } }]}>
  <Routes>
    <Route path="/combat/:campaignId" element={<CombatPage />} />
    <Route path="/gm-screen/:campaignId" element={<div data-testid="back-at-live-play">Returned to Live Play</div>} />
  </Routes>
</MemoryRouter>);
async function collectThenEnd() {
  await screen.findByTitle('End combat');
  expect(JSON.parse(localStorage.getItem('gm.activeCombat.synthetic') || '{}').initialPlayerStates).toHaveProperty('pc1');
  fireEvent.click(screen.getByRole('button', { name: /Collect Loot/ }));
  await act(async () => { fireEvent.click(screen.getByTitle('End combat')); });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  apiClient.get.mockResolvedValue({ data: [] });
  queueOfflineCombatEnd.mockResolvedValue({ closeRecord: { key: 'offline-close' }, lootRecords: [{}] });
  queueOfflineCombatState.mockResolvedValue({ key: 'old-queue' });
});
afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

test('actual End combat click queues both player baseline and loot atomically then exits', async () => {
  localStorage.setItem('gm.activeCombat.synthetic', JSON.stringify(checkpoint(true)));
  mount();
  await collectThenEnd();
  expect({ queue: queueOfflineCombatEnd.mock.calls.length, errors: toast.error.mock.calls, online: navigator.onLine, confirms: window.confirm.mock.calls.length }).toEqual({ queue: 1, errors: [], online: false, confirms: 1 });
  expect(queueOfflineCombatEnd).toHaveBeenCalledWith(expect.objectContaining({
    campaignId: 'synthetic',
    characters: [expect.objectContaining({ characterId: 'pc1', baseState: expect.objectContaining({ current_hit_points: 20 }) })],
    loot: [expect.objectContaining({ itemName: 'Venom', operationId: expect.any(String) })],
  }));
  expect(queueOfflineCombatState).not.toHaveBeenCalled();
  expect(screen.getByTestId('back-at-live-play')).toBeInTheDocument();
});

test('restored fight without original baseline refuses offline ending even if final state exists', async () => {
  localStorage.setItem('gm.activeCombat.synthetic', JSON.stringify(checkpoint(false)));
  mount();
  await screen.findByTitle('End combat');
  await act(async () => { fireEvent.click(screen.getByTitle('End combat')); });
  expect(queueOfflineCombatEnd).not.toHaveBeenCalled();
  expect(queueOfflineCombatState).not.toHaveBeenCalled();
  expect(screen.getByTitle('End combat')).toBeInTheDocument();
});

test('offline queue failure retains fight and loot for retry without double-creating loot', async () => {
  localStorage.setItem('gm.activeCombat.synthetic', JSON.stringify(checkpoint(true)));
  queueOfflineCombatEnd.mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ closeRecord: {}, lootRecords: [{}] });
  mount();
  await collectThenEnd();
  expect(screen.getByTitle('End combat')).toBeInTheDocument();
  expect(localStorage.getItem('gm.activeCombat.synthetic')).not.toBeNull();
  await act(async () => { fireEvent.click(screen.getByTitle('End combat')); });
  expect(queueOfflineCombatEnd).toHaveBeenCalledTimes(2);
  const firstId = queueOfflineCombatEnd.mock.calls[0][0].loot[0].operationId;
  const secondId = queueOfflineCombatEnd.mock.calls[1][0].loot[0].operationId;
  expect(secondId).toBe(firstId);
  expect(screen.getByTestId('back-at-live-play')).toBeInTheDocument();
});

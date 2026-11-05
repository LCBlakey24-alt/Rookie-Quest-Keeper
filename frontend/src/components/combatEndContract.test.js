/**
 * Ending a fight must not depend on a tooltip.
 *
 * CombatPage added a document-level capture listener matching
 * [title="End combat"], swallowed the click and ran its own offline ending.
 * That title was also the only accessible name on an icon-only button, so
 * giving the button an aria-label and dropping the title -- the obvious
 * accessibility fix -- would have silently disconnected offline protection.
 *
 * It was also a weaker duplicate: CombatPageTable's own endCombatOffline
 * refuses to end a fight whose pre-combat baseline is missing, and the
 * listener had no such guard.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CHECKPOINT_VERSION, combatCheckpointKey } from './combat/combatCheckpoint';
import CombatPage from './CombatPage';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
// Plain functions, not jest.fn(): jest.config sets resetMocks, which strips
// the implementation out of a jest.fn() declared in a module factory, and
// these have to keep returning a promise for the component to chain .catch.
jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: () => ({}),
  publishCampaignDisplayState: () => Promise.resolve(),
  publishDisplayState: () => Promise.resolve(),
  clearCampaignDisplayState: () => Promise.resolve(),
}));
jest.mock('@/components/MapBuilder/MapCanvas', () => () => <div />);
jest.mock('@/components/NPCCombatRecruiter', () => () => <div />);
jest.mock('@/components/gm/QuickBestiaryCombatPicker', () => () => <div />);
jest.mock('@/components/gm/TargetedAttackPanel', () => () => <div />);

const mockQueueOfflineCombatEnd = jest.fn();
jest.mock('@/offline/offlineCombatSyncQueue', () => ({
  ...jest.requireActual('@/offline/offlineCombatSyncQueue'),
  queueOfflineCombatEnd: (...args) => mockQueueOfflineCombatEnd(...args),
}));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');
const CAMPAIGN = 'camp-1';
// Comments stripped first: the replacement file explains the selectors it
// removed, and a naive grep matches its own explanation.
const SRC = fs.readFileSync(path.join(__dirname, 'CombatPage.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function saveFight(overrides = {}) {
  localStorage.setItem(combatCheckpointKey(CAMPAIGN), JSON.stringify({
    version: CHECKPOINT_VERSION, campaignId: CAMPAIGN,
    scenarioId: 'enc-7', scenarioName: 'Dock ambush',
    combatants: [
      { id: 'c1', name: 'Rina', type: 'player', character_id: 'char-1', hp: 22, maxHp: 54, ac: 19, initiative: 18 },
      { id: 'c2', name: 'Goblin', type: 'enemy', hp: 3, maxHp: 7, ac: 15, initiative: 12 },
    ],
    currentTurn: 0, round: 2, selectedMapId: '', mapTokens: [], collectedLoot: [],
    initialPlayerStates: { 'char-1': { hp: 54, max_hp: 54 } },
    source: 'live-play', savedAt: Date.now(), ...overrides,
  }));
}

function open() {
  return render(
    <MemoryRouter initialEntries={[`/combat/${CAMPAIGN}`]}>
      <Routes>
        <Route path="/combat/:campaignId" element={<CombatPage />} />
        <Route path="/gm-screen/:campaignId" element={<h1>Live Play</h1>} />
        <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  apiClient.get.mockResolvedValue({ data: [] });
  mockQueueOfflineCombatEnd.mockResolvedValue(true);
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  window.confirm.mockRestore();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('the route no longer reaches into the page by selector', () => {
  test('nothing matches on a title attribute', () => {
    expect(SRC).not.toContain('title="End combat"');
    expect(SRC).not.toContain('combat-loot-save');
  });

  test('no document-level click interception remains', () => {
    expect(SRC).not.toContain('addEventListener');
    expect(SRC).not.toContain('querySelector');
    expect(SRC).not.toContain('stopImmediatePropagation');
  });
});

describe('End Combat has a name of its own', () => {
  test('it is reachable by its accessible name, not its tooltip', async () => {
    saveFight();
    open();
    await screen.findByTestId('combat-table-page');
    expect(screen.getByRole('button', { name: 'End combat' })).toBeInTheDocument();
  });
});

describe('the offline ending still happens, through the component', () => {
  test('ending offline queues the player state and leaves Live Play', async () => {
    saveFight();
    open();
    await screen.findByTestId('combat-table-page');

    fireEvent.click(screen.getByRole('button', { name: 'End combat' }));

    await waitFor(() => expect(mockQueueOfflineCombatEnd).toHaveBeenCalled());
    const payload = mockQueueOfflineCombatEnd.mock.calls[0][0];
    expect(payload.campaignId).toBe(CAMPAIGN);
    expect(payload.characters).toHaveLength(1);
    // The pre-combat baseline, not the wounded total, is what syncs against.
    expect(payload.characters[0].baseState).toEqual({ hp: 54, max_hp: 54 });
    expect(payload.characters[0].state.current_hit_points).toBe(22);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Live Play' })).toBeInTheDocument());
  });

  test('a fight with no safe baseline is refused, which the old listener never checked', async () => {
    saveFight({ initialPlayerStates: {} });
    open();
    await screen.findByTestId('combat-table-page');

    fireEvent.click(screen.getByRole('button', { name: 'End combat' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('missing its safe pre-combat baseline'),
    ));
    expect(mockQueueOfflineCombatEnd).not.toHaveBeenCalled();
    // The fight is kept, not abandoned.
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).not.toBeNull();
  });

  test('a failed queue keeps the fight open rather than losing it', async () => {
    mockQueueOfflineCombatEnd.mockResolvedValue(null);
    saveFight();
    open();
    await screen.findByTestId('combat-table-page');

    fireEvent.click(screen.getByRole('button', { name: 'End combat' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('could not store the offline combat ending safely'),
    ));
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).not.toBeNull();
  });

  test('the GM is asked before the fight ends', async () => {
    saveFight();
    window.confirm.mockReturnValue(false);
    open();
    await screen.findByTestId('combat-table-page');

    fireEvent.click(screen.getByRole('button', { name: 'End combat' }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(mockQueueOfflineCombatEnd).not.toHaveBeenCalled();
  });
});

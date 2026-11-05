/**
 * Mounted test: refreshing the combat tab must not abandon the fight.
 *
 * Before this, CombatPageTable read its encounter from location.state alone.
 * A refresh, a browser-restored tab or a second window on the table laptop
 * lost that state, so the GM was navigated back to the campaign with "No
 * combat encounter found" while the whole fight stayed in localStorage.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CHECKPOINT_VERSION, combatCheckpointKey } from './combat/combatCheckpoint';
import { getAuthToken } from '@/lib/auth';
import CombatPageTable from './CombatPageTable';

jest.mock('@/lib/auth', () => ({ ...jest.requireActual('@/lib/auth'), getAuthToken: jest.fn() }));
jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: jest.fn(() => ({})),
  publishCampaignDisplayState: jest.fn(() => Promise.resolve()),
  clearCampaignDisplayState: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/components/MapBuilder/MapCanvas', () => () => <div data-testid="map-canvas" />);
jest.mock('@/components/NPCCombatRecruiter', () => () => <div />);
jest.mock('@/components/gm/QuickBestiaryCombatPicker', () => () => <div />);
jest.mock('@/components/gm/TargetedAttackPanel', () => () => <div />);

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');

const CAMPAIGN = 'camp-1';
const ACCOUNT = 'keeper-gm';
const TEST_TOKEN = `header.${btoa(JSON.stringify({ sub: ACCOUNT, exp: 9999999999 }))}.signature`;

function saveFight(overrides = {}) {
  localStorage.setItem(combatCheckpointKey(CAMPAIGN), JSON.stringify({
    version: CHECKPOINT_VERSION,
    ownerId: ACCOUNT,
    campaignId: CAMPAIGN,
    scenarioId: 'enc-7',
    scenarioName: 'Dock ambush',
    combatants: [
      { id: 'c1', name: 'Rina Ironside', type: 'player', character_id: 'char-1',
        hp: 22, maxHp: 54, ac: 19, initiative: 18, conditions: ['poisoned'] },
      { id: 'c2', name: 'Goblin', type: 'enemy', hp: 3, maxHp: 7, ac: 15, initiative: 12 },
    ],
    currentTurn: 1,
    round: 4,
    selectedMapId: '',
    mapTokens: [],
    collectedLoot: [],
    initialPlayerStates: { 'char-1': { hp: 54, max_hp: 54 } },
    source: 'live-play',
    savedAt: Date.now(),
    ...overrides,
  }));
}

/** Mount /combat/:campaignId with NO router state, as a refresh would. */
function openColdTab() {
  return render(
    <MemoryRouter initialEntries={[`/combat/${CAMPAIGN}`]}>
      <Routes>
        <Route path="/combat/:campaignId" element={<CombatPageTable />} />
        <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
        <Route path="/gm-screen/:campaignId" element={<h1>Live Play</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  getAuthToken.mockReturnValue(TEST_TOKEN);
  apiClient.get.mockReset();
  apiClient.get.mockResolvedValue({ data: [] });
});

test('a refreshed combat tab resumes the saved fight instead of leaving it', async () => {
  saveFight();
  openColdTab();

  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Live Play' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Campaign prep' })).not.toBeInTheDocument();
});

test('the resumed fight keeps its round, its wounds and its conditions', async () => {
  saveFight();
  openColdTab();
  await screen.findByTestId('combat-table-page');

  expect(screen.getByText('Dock ambush')).toBeInTheDocument();
  expect(screen.getAllByText('Rina Ironside').length).toBeGreaterThan(0);

  // "Round" and its number are separate elements, so read the container.
  const round = document.querySelector('.combat-round');
  expect(round).toHaveTextContent('Round');
  expect(round).toHaveTextContent('4');

  // The wounded totals are the point: a recovery that healed everyone would
  // be worse than no recovery at all.
  const page = screen.getByTestId('combat-table-page');
  expect(page.textContent).toContain('22/54');

  // Conditions render as abbreviated chips, so read them back from the
  // checkpoint the page rewrote rather than asserting on chip text.
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.combatants.find(item => item.id === 'c1').conditions).toEqual(['poisoned']);
  expect(saved.combatants.find(item => item.id === 'c1').maxHp).toBe(54);
});

test('with no saved fight the GM is still returned to the campaign', async () => {
  openColdTab();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Campaign prep' })).toBeInTheDocument());
});

test('a corrupt checkpoint is refused and explained, not turned into a fight', async () => {
  localStorage.setItem(combatCheckpointKey(CAMPAIGN), '{ this is not json');
  openColdTab();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Campaign prep' })).toBeInTheDocument());
  expect(toast.error).toHaveBeenCalledWith('The saved fight could not be read.');
});

test("another campaign's fight is never adopted", async () => {
  saveFight({ campaignId: 'camp-SOMEONE-ELSE' });
  openColdTab();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Campaign prep' })).toBeInTheDocument());
  expect(toast.error).toHaveBeenCalledWith('The saved fight belongs to a different campaign.');
});

test('a recovered fight remembers it came from Live Play', async () => {
  // Checked through the checkpoint rather than by driving End Combat, which
  // needs the network path; the routing value is what this fixes.
  saveFight({ source: 'live-play' });
  openColdTab();
  await screen.findByTestId('combat-table-page');
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.source).toBe('live-play');
  expect(saved.campaignId).toBe(CAMPAIGN);
  expect(saved.version).toBe(CHECKPOINT_VERSION);
});

test('a launch from Encounter Review still works and is not treated as a recovery', async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/combat/${CAMPAIGN}`,
      state: {
        source: 'live-play',
        campaignName: 'Spilsby Wednesday',
        scenario: { id: 'enc-9', name: 'Harbour brawl', combatants: [
          { id: 'n1', name: 'Smuggler', type: 'enemy', hp: 11, max_hp: 11, ac: 13, initiative: 9 },
        ] },
      },
    }]}>
      <Routes>
        <Route path="/combat/:campaignId" element={<CombatPageTable />} />
        <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  expect(screen.getByText('Harbour brawl')).toBeInTheDocument();
});

test('a checkpoint from an older build still shows a real maximum, not 22/undefined', async () => {
  // Older builds wrote max_hp without the normalised maxHp the table renders.
  saveFight({
    combatants: [
      { id: 'c1', name: 'Rina Ironside', type: 'player', character_id: 'char-1',
        hp: 22, max_hp: 54, ac: 19, initiative: 18 },
    ],
    currentTurn: 0,
  });
  openColdTab();
  await screen.findByTestId('combat-table-page');
  const page = screen.getByTestId('combat-table-page');
  expect(page.textContent).toContain('22/54');
  expect(page.textContent).not.toContain('undefined');
  expect(page.textContent).not.toContain('NaN');
});

test('another account sees no combat data and cannot erase the checkpoint', async () => {
  saveFight();
  const saved = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  getAuthToken.mockReturnValue(`header.${btoa(JSON.stringify({ sub: 'other-gm', exp: 9999999999 }))}.signature`);
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  expect(screen.queryByText('Dock ambush')).not.toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(saved);
});

test('launching another encounter leaves the unfinished fight untouched', async () => {
  saveFight();
  const saved = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/combat/${CAMPAIGN}`,
      state: { scenario: { id: 'enc-OTHER', name: 'Other encounter',
        combatants: [{ id: 'new', name: 'New foe', type: 'enemy', hp: 9, maxHp: 9 }] } },
    }]}>
      <Routes>
        <Route path="/combat/:campaignId" element={<CombatPageTable />} />
        <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  expect(screen.queryByText('Other encounter')).not.toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(saved);
  expect(screen.getByRole('button', { name: 'Resume saved encounter' })).toBeInTheDocument();
});

test('legacy checkpoint is recovered only after online account and GM ownership proof', async () => {
  saveFight({ ownerId: undefined, version: undefined });
  apiClient.get.mockImplementation(url => {
    if (url === '/auth/me') return Promise.resolve({ data: { username: ACCOUNT } });
    if (url === `/campaigns/${CAMPAIGN}`) {
      return Promise.resolve({ data: { id: CAMPAIGN, dm_user_id: ACCOUNT } });
    }
    return Promise.resolve({ data: [] });
  });
  openColdTab();
  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.ownerId).toBe(ACCOUNT);
  expect(saved.round).toBe(4);
});

test('offline legacy failure preserves checkpoint without exposing its roster', async () => {
  saveFight({ ownerId: undefined, version: undefined });
  const raw = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  apiClient.get.mockResolvedValue({ data: { offline: true }, rqkOffline: true });
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/older fight has no account owner stamp/i)).toBeInTheDocument());
  expect(screen.queryByText('Dock ambush')).not.toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(raw);
});

test('future checkpoint version is preserved and never auto-replaced', async () => {
  saveFight({ version: CHECKPOINT_VERSION + 1 });
  const raw = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(raw);
});

test('two enemies with the same name recover separately with loot and positions', async () => {
  saveFight({ combatants: [
    { id: 'g1', name: 'Guard', type: 'enemy', hp: 5, maxHp: 12, tempHp: 3, initiative: 18 },
    { id: 'g2', name: 'Guard', type: 'enemy', hp: 1, maxHp: 12, initiative: 9 },
  ], mapTokens: [{ id: 'g1', x: 1, y: 2 }, { id: 'g2', x: 6, y: 7 }],
  collectedLoot: [{ name: 'Gold ring', offlineOperationId: 'loot-1' }],
  currentTurn: 1 });
  openColdTab();
  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  expect(screen.getAllByText('Guard').length).toBeGreaterThanOrEqual(2);
  const data = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(data.combatants.map(item => item.id)).toEqual(['g1', 'g2']);
  expect(data.combatants.map(item => item.hp)).toEqual([5, 1]);
  expect(data.mapTokens).toEqual([{ id: 'g1', x: 1, y: 2 }, { id: 'g2', x: 6, y: 7 }]);
  expect(data.collectedLoot).toHaveLength(1);
});

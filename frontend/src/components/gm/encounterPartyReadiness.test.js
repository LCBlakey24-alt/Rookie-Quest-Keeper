/**
 * Mounted: a missing party is told apart from an empty one, and the roster
 * the GM is shown is the roster that launches (#765, reconciled onto main).
 *
 * Covers the release checklist not already guarded by encounterPartialLoad,
 * encounterReviewSweep (#764), encounterCombatantIdentity and
 * encounterLaunchReadiness. Synthetic data only.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveEncounterLauncher from './LiveEncounterLauncher';
import { setAuthToken, clearAuthToken } from '@/lib/auth';
import { forgetDraftsInMemory } from './encounterReviewDraft';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');

const CAMPAIGN = 'camp-1';
const OTHER = 'camp-2';
const MESSAGE = 'The party could not be loaded, so some player characters may be missing.';
const PLAYERS = [
  { id: 'p1', character_id: 'c1', name: 'Rina Ironside', hp: 40, max_hp: 54, ac: 19 },
  { id: 'p2', character_id: 'c2', name: 'Orren Oakenshade', hp: 31, max_hp: 38, ac: 16 },
];
const NPCS = [{ id: 'n1', name: 'Captain Vell', hp: 30, ac: 16 }];
const ENCOUNTERS = [
  { id: 'enc-a', name: 'Ambush', live_ready: true, live_default: true, planned_encounter_order: 1,
    combatants: [
      { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7 },
      { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7 },
      // A prepared snapshot of a player: stale HP that must never launch blind.
      { id: 'tok-1', character_id: 'c1', name: 'Rina Ironside', type: 'player', hp: 54, maxHp: 54 },
    ] },
  { id: 'enc-b', name: 'Bridge', live_ready: true, planned_encounter_order: 2, combatants: [{ id: 'o1', name: 'Ogre', type: 'enemy', hp: 59 }] },
  { id: 'enc-npc', name: 'Parley', live_ready: true, planned_encounter_order: 3, combatants: [] },
];

const fail = () => Promise.reject(Object.assign(new Error('offline'), { response: { status: 503 } }));
let server;
function mockApi(overrides = {}) {
  server = { party: () => Promise.resolve({ data: PLAYERS }), npcs: () => Promise.resolve({ data: NPCS }),
    liveState: () => Promise.resolve({ data: { companion_npc_ids: ['n1'] } }),
    scenarios: () => Promise.resolve({ data: ENCOUNTERS }), ...overrides };
  apiClient.get.mockImplementation(url => {
    const campaign = url.split('/')[2];
    if (url === `/campaigns/${campaign}`) return Promise.resolve({ data: { id: campaign, name: campaign } });
    if (url.endsWith('/combat-scenarios')) return server.scenarios(campaign);
    if (url.endsWith('/npcs')) return server.npcs(campaign);
    if (url.endsWith('/live-state')) return server.liveState(campaign);
    if (url.includes('/live-party') || url.includes('/players')) return server.party(campaign);
    return Promise.resolve({ data: [] });
  });
}

const open = (campaignId = CAMPAIGN) => render(<MemoryRouter><LiveEncounterLauncher campaignId={campaignId} /></MemoryRouter>);
const launcher = () => screen.findByTestId('live-encounter-launcher');
const counts = async () => within(await launcher()).getByTestId('live-encounter-roster-counts').textContent;
const expectCounts = (...parts) => waitFor(async () => { const text = await counts(); parts.forEach(p => expect(text).toContain(p)); });
async function clickRow(name, index = 0) { fireEvent.click(within(await launcher()).getAllByText(name)[index].closest('button')); }
async function start() { fireEvent.click(within(await launcher()).getByTestId('live-encounter-start')); }
const launched = () => mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1]?.[1]?.state?.scenario;
async function addQuick(name, quantity = '1') {
  const root = await launcher();
  fireEvent.change(within(root).getByPlaceholderText('Name'), { target: { value: name } });
  fireEvent.change(within(root).getByLabelText('Qty'), { target: { value: quantity } });
  fireEvent.keyDown(within(root).getByPlaceholderText('Name'), { key: 'Enter' });
}
const encode = v => window.btoa(JSON.stringify(v)).replace(/=+$/, '');

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); forgetDraftsInMemory();
  mockNavigate.mockClear(); jest.clearAllMocks();
  setAuthToken(`${encode({ alg: 'HS256' })}.${encode({ sub: 'synthetic-gm', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`);
  mockApi();
});
afterEach(() => { jest.restoreAllMocks(); clearAuthToken(); });

describe('B. the party could not be loaded', () => {
  test('the review says so in plain words, offers Retry, and counts no players', async () => {
    mockApi({ party: fail });
    open();
    const warning = await screen.findByTestId('live-encounter-party-unavailable');
    expect(warning).toHaveTextContent(MESSAGE);
    expect(within(warning).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    await expectCounts('Party: 0', 'Enemies: 2');
  });

  test('12. the GM declines: nothing launches', async () => {
    mockApi({ party: fail });
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    open();
    await screen.findByTestId('live-encounter-party-unavailable');
    await start();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(MESSAGE));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('13. the GM confirms: the verified roster launches with no player at all -- not even the prepared snapshot', async () => {
    mockApi({ party: fail });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    await expectCounts('Party: 0', 'Total: 2');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.map(c => c.id).sort()).toEqual(['g1', 'g2']);
  });

  test('a party kept from an earlier load is stale after a failed Retry and does not launch', async () => {
    mockApi({ npcs: fail });                         // shows the shared Retry
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    await expectCounts('Party: 2');
    mockApi({ party: fail, npcs: fail });            // the refresh loses the party
    await retryFromSharedWarning();
    await screen.findByTestId('live-encounter-party-unavailable');
    await expectCounts('Party: 0');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.some(c => c.type === 'player')).toBe(false);
  });

  test('3 + 21. Retry after a party failure brings the party back, keeping the GM\'s exclusions', async () => {
    mockApi({ npcs: fail });
    open();
    await expectCounts('Party: 2', 'Enemies: 2');
    await clickRow('Orren Oakenshade');              // exclude a player
    await clickRow('Goblin', 1);                     // disable an enemy
    await expectCounts('Party: 1', 'Enemies: 1');

    mockApi({ party: fail, npcs: fail });            // failure in between...
    await retryFromSharedWarning();
    await screen.findByTestId('live-encounter-party-unavailable');
    await expectCounts('Party: 0', 'Enemies: 1');

    mockApi();                                       // ...then success
    fireEvent.click(within(await screen.findByTestId('live-encounter-party-unavailable')).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByTestId('live-encounter-party-unavailable')).not.toBeInTheDocument());
    await expectCounts('Party: 1', 'Enemies: 1');    // Orren still out, goblin still off
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.map(c => c.id).sort()).toEqual(['g1', 'p1']);
  });
});

async function retryFromSharedWarning() {
  const warning = await screen.findByTestId('live-data-warning');
  fireEvent.click(within(warning).getByRole('button', { name: /retry/i }));
}

describe('A and C. empty party, optional failures, and who may fight', () => {
  test('9 + A. an NPC-only fight with a party that loaded empty', async () => {
    mockApi({ party: () => Promise.resolve({ data: [] }) });
    open();
    fireEvent.change(within(await launcher()).getByLabelText('Choose battle type'), { target: { value: 'enc-npc' } });
    fireEvent.click(within(await launcher()).getByText(/Add saved NPC/));
    await clickRow('Captain Vell');
    await expectCounts('Party: 0', 'NPCs: 1', 'Total: 1');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.map(c => c.id)).toEqual(['n1']);
    expect(screen.queryByTestId('live-encounter-party-unavailable')).not.toBeInTheDocument();
  });

  test('10. a monster-only fight with an empty party starts without any question', async () => {
    mockApi({ party: () => Promise.resolve({ data: [] }) });
    jest.spyOn(window, 'confirm');
    open();
    fireEvent.change(within(await launcher()).getByLabelText('Choose battle type'), { target: { value: 'enc-b' } });
    await expectCounts('Party: 0', 'Enemies: 1', 'Total: 1');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(launched().combatants.map(c => c.id)).toEqual(['o1']);
  });

  test('a prepared player missing from the loaded party is shown as a snapshot, counted, and can be left out', async () => {
    mockApi({ party: () => Promise.resolve({ data: [] }) });
    open();
    await expectCounts('Party: 1', 'Enemies: 2', 'Total: 3');
    const row = (await within(await launcher()).findByText(/Prepared snapshot · not in the current party/)).closest('button');
    expect(row).toHaveTextContent('Rina Ironside');
    fireEvent.click(row);
    await expectCounts('Party: 0', 'Total: 2');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.map(c => c.id).sort()).toEqual(['g1', 'g2']);
  });

  test('11. a temporary-creature-only fight', async () => {
    mockApi({ party: () => Promise.resolve({ data: [] }) });
    open();
    fireEvent.change(within(await launcher()).getByLabelText('Choose battle type'), { target: { value: '' } });
    await addQuick('Dire Wolf', '2');
    await expectCounts('Temporary: 2', 'Total: 2');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().combatants.filter(c => c.temporary)).toHaveLength(2);
  });

  test.each([
    ['5. companion lookup fails', { liveState: fail }, 'travelling companions'],
    ['6. both optional lookups fail', { liveState: fail, npcs: fail }, 'saved NPCs'],
  ])('%s: warned, still launches the verified roster', async (_name, overrides, warned) => {
    mockApi(overrides);
    open();
    await expectCounts('Party: 2', 'Enemies: 2');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining(warned));
    expect(launched().combatants.map(c => c.id).sort()).toEqual(['g1', 'g2', 'p1', 'p2']);
  });

  test('7. the encounter list failing is a retry screen, not an empty campaign, and nothing can launch', async () => {
    mockApi({ scenarios: fail });
    open();
    await screen.findByText(/Saved encounters could not be loaded/);
    expect(screen.queryByTestId('live-encounter-start')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('live-data-warning')).getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('8. with nobody selected there is nothing to start', async () => {
    mockApi({ party: () => Promise.resolve({ data: [] }) });
    open();
    await clickRow('Goblin', 0);
    await clickRow('Goblin', 1);
    await clickRow('Rina Ironside');                 // the prepared snapshot
    await expectCounts('Total: 0');
    await start();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Choose a player, NPC or creature/));
  });
});

describe('timing: loading, switching and late answers', () => {
  test('14. rapid A -> B -> A and Start launches A\'s own roster', async () => {
    open();
    await expectCounts('Enemies: 2');
    const select = within(await launcher()).getByLabelText('Choose battle type');
    fireEvent.change(select, { target: { value: 'enc-b' } });
    fireEvent.change(select, { target: { value: 'enc-a' } });
    fireEvent.change(select, { target: { value: 'enc-b' } });
    fireEvent.change(select, { target: { value: 'enc-a' } });
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(launched().id).toBe('enc-a');
    expect(launched().combatants.map(c => c.id).sort()).toEqual(['g1', 'g2', 'p1', 'p2']);
  });

  test('15 + 22. switching campaign while the first is still loading never shows or launches its roster', async () => {
    let releaseFirst;
    mockApi({
      party: campaign => (campaign === CAMPAIGN
        ? new Promise(resolve => { releaseFirst = () => resolve({ data: PLAYERS }); })
        : Promise.resolve({ data: [] })),
      scenarios: campaign => Promise.resolve({ data: campaign === CAMPAIGN ? ENCOUNTERS : [{ id: 'enc-x', name: 'Other', live_ready: true, combatants: [{ id: 'x1', name: 'Wraith', type: 'enemy', hp: 9 }] }] }),
    });
    const view = open(CAMPAIGN);
    await waitFor(() => expect(releaseFirst).toBeDefined());
    view.rerender(<MemoryRouter><LiveEncounterLauncher campaignId={OTHER} /></MemoryRouter>);
    await expectCounts('Enemies: 1', 'Party: 0');
    await act(async () => { releaseFirst(); await new Promise(r => setTimeout(r, 30)); });
    expect(await counts()).toContain('Party: 0');
    expect(within(await launcher()).queryByText('Rina Ironside')).not.toBeInTheDocument();
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate.mock.calls[0][0]).toBe(`/combat/${OTHER}`);
    expect(launched().combatants.map(c => c.id)).toEqual(['x1']);
  });

  test('16. a slow failed answer from a closed review cannot reach the reopened one', async () => {
    // While a Retry is in flight the review shows its loading state, so the
    // UI cannot fire overlapping retries; the real race is a late answer
    // arriving after the GM has switched tools and come back.
    let failSlowly;
    let call = 0;
    mockApi({
      npcs: fail,
      party: () => { call += 1; return call === 2
        ? new Promise((_, reject) => { failSlowly = () => reject(new Error('late failure')); })
        : Promise.resolve({ data: PLAYERS }); },
    });
    const first = open();
    await expectCounts('Party: 2');
    await retryFromSharedWarning();                  // request 2 hangs
    await waitFor(() => expect(failSlowly).toBeDefined());
    first.unmount();                                 // away to another tool...
    open();                                          // ...and back: request 3 succeeds
    await expectCounts('Party: 2');
    await act(async () => { failSlowly(); await new Promise(r => setTimeout(r, 30)); });
    expect(screen.queryByTestId('live-encounter-party-unavailable')).not.toBeInTheDocument();
    await expectCounts('Party: 2');
  });

  test('a double tap starts one fight', async () => {
    open();
    await expectCounts('Total: 4');
    const button = within(await launcher()).getByTestId('live-encounter-start');
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  test('20 + 19. the launched player carries canonical state and appears once despite the prepared token', async () => {
    mockApi({ party: () => Promise.resolve({ data: [{ ...PLAYERS[0], hp: 12, temporary_hit_points: 3, conditions: ['prone'], death_saves_failures: 2 }, PLAYERS[1]] }) });
    open();
    await expectCounts('Party: 2');
    await start();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    const rina = launched().combatants.filter(c => c.type === 'player' && c.name === 'Rina Ironside');
    expect(rina).toHaveLength(1);
    expect(rina[0]).toMatchObject({ id: 'p1', hp: 12, tempHp: 3, conditions: ['prone'] });
    expect(rina[0].deathSaves.failures).toBe(2);
  });
});

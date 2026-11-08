/**
 * Mounted test: refreshing the combat tab must not abandon the fight.
 *
 * Before this, CombatPageTable read its encounter from location.state alone.
 * A refresh, a browser-restored tab or a second window on the table laptop
 * lost that state, so the GM was navigated back to the campaign with "No
 * combat encounter found" while the whole fight stayed in localStorage.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CHECKPOINT_VERSION, combatCheckpointKey } from './combat/combatCheckpoint';
import { getAuthToken } from '@/lib/auth';
import CombatPageTable from './CombatPageTable';

jest.mock('@/lib/auth', () => ({ ...jest.requireActual('@/lib/auth'), getAuthToken: jest.fn() }));
jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(() => Promise.resolve({ data: {} })) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: jest.fn(() => ({})),
  publishCampaignDisplayState: jest.fn(() => Promise.resolve()),
  clearCampaignDisplayState: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/components/MapBuilder/MapCanvas', () => ({ zoom, tokens }) => <div data-testid="map-canvas" data-zoom={String(zoom)} data-tokens={String(tokens?.length || 0)} />);
jest.mock('@/components/NPCCombatRecruiter', () => () => <div />);
jest.mock('@/components/gm/QuickBestiaryCombatPicker', () => () => <div />);
jest.mock('@/components/gm/TargetedAttackPanel', () => () => <div />);

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');
const { publishCampaignDisplayState, createDisplayState } = require('@/lib/liveDisplayBus');

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
  // The global Jest config resets module-factory mocks on each test. Combat's
  // asynchronous player display publish expects an actual Promise response.
  createDisplayState.mockImplementation((mode, payload) => ({ mode, payload }));
  publishCampaignDisplayState.mockImplementation(() => Promise.resolve());
  apiClient.patch.mockClear();
  // resetMocks clears factory implementations, so every reset test needs a promise.
  apiClient.delete.mockResolvedValue({ data: {} });
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

test('corrupt checkpoint remains stored and its data is blocked', async () => {
  const raw = '{ this is not json';
  localStorage.setItem(combatCheckpointKey(CAMPAIGN), raw);
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  expect(screen.getByText('The saved fight could not be read.')).toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(raw);
});

test("another campaign's checkpoint is blocked and preserved", async () => {
  saveFight({ campaignId: 'camp-SOMEONE-ELSE' });
  const raw = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  expect(screen.getByText('The saved fight belongs to a different campaign.')).toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(raw);
});

test('a recovered fight restores the generic terrain choice without losing wounds', async () => {
  saveFight({ terrain_type: 'grass' });
  openColdTab();
  await screen.findByTestId('combat-table-page');
  expect(screen.getByTestId('generic-combat-map')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Generic battlefield terrain' })).toHaveValue('grass');
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.terrain_type).toBe('grass');
  expect(saved.combatants.find(combatant => combatant.id === 'c1').hp).toBe(22);
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
  await waitFor(() => expect(JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).ownerId).toBe(ACCOUNT));
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.round).toBe(4);
  // The authenticated GM proof must be stamped into the upgraded checkpoint.
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

test('a different account cannot pass legacy GM verification', async () => {
  saveFight({ ownerId: undefined, version: undefined });
  const raw = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
  apiClient.get.mockImplementation(url => {
    if (url === '/auth/me') return Promise.resolve({ data: { username: ACCOUNT } });
    if (url === `/campaigns/${CAMPAIGN}`) {
      return Promise.resolve({ data: { id: CAMPAIGN, dm_user_id: 'different-gm' } });
    }
    return Promise.resolve({ data: [] });
  });
  openColdTab();
  expect(await screen.findByTestId('combat-recovery-blocked')).toBeInTheDocument();
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN}`));
  expect(screen.queryByText('Dock ambush')).not.toBeInTheDocument();
  expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(raw);
});

test('offline End Combat refuses incomplete baseline without updating HP', async () => {
  saveFight({ initialPlayerStates: { 'char-1': {} } });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  const descriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
  try {
    openColdTab();
    expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.combat-round')).toHaveTextContent('4'));
    fireEvent.click(screen.getByTitle('End combat'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'This restored fight is missing its safe pre-combat baseline. Reconnect once before ending it offline.',
    ));
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).combatants[0].hp).toBe(22);
  } finally {
    confirm.mockRestore();
    if (descriptor) Object.defineProperty(window.navigator, 'onLine', descriptor);
    else delete window.navigator.onLine;
  }
});

describe('discarding a saved fight requires owning it', () => {
  const OTHER = 'intruder-gm';
  const OTHER_TOKEN = `header.${btoa(JSON.stringify({ sub: OTHER, exp: 9999999999 }))}.signature`;

  /** A checkpoint written before the owner stamp existed. */
  function legacySave() {
    localStorage.setItem(combatCheckpointKey(CAMPAIGN), JSON.stringify({
      scenarioId: 'OLD-FIGHT',
      scenarioName: "Last week's ambush",
      combatants: [{ id: 'g1', name: 'Goblin', type: 'enemy', hp: 3, maxHp: 7, initiative: 9 }],
      currentTurn: 0,
      round: 5,
      collectedLoot: [],
      mapTokens: [],
      initialPlayerStates: {},
    }));
  }

  function startDifferentEncounter() {
    return render(
      <MemoryRouter initialEntries={[{
        pathname: `/combat/${CAMPAIGN}`,
        state: {
          source: 'live-play',
          campaignName: 'Spilsby',
          scenario: {
            id: 'NEW-FIGHT',
            name: "Tonight's battle",
            combatants: [{ id: 'n1', name: 'Bandit', type: 'enemy', hp: 11, maxHp: 11, ac: 13, initiative: 7 }],
          },
        },
      }]}>
        <Routes>
          <Route path="/combat/:campaignId" element={<CombatPageTable />} />
          <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
          <Route path="/gm-screen/:campaignId" element={<h1>Live Play</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  function verifyOwnershipOnline(username = ACCOUNT) {
    apiClient.get.mockImplementation(url => {
      if (url === '/auth/me') return Promise.resolve({ data: { username } });
      if (url === `/campaigns/${CAMPAIGN}`) {
        return Promise.resolve({ data: { id: CAMPAIGN, dm_user_id: username } });
      }
      return Promise.resolve({ data: [] });
    });
  }

  test("another account cannot discard the owner's saved fight", async () => {
    saveFight();                                   // owned by ACCOUNT
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    getAuthToken.mockReturnValue(OTHER_TOKEN);     // a different person signs in

    startDifferentEncounter();

    const blocked = await screen.findByTestId('combat-recovery-blocked');
    expect(within(blocked).queryByTestId('combat-discard-saved')).not.toBeInTheDocument();
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
  });

  test("the other account cannot read the owner's roster either", async () => {
    saveFight();
    getAuthToken.mockReturnValue(OTHER_TOKEN);
    startDifferentEncounter();
    const blocked = await screen.findByTestId('combat-recovery-blocked');
    expect(blocked.textContent).not.toContain('Dock ambush');
    expect(blocked.textContent).not.toContain('Rina Ironside');
  });

  test('the owner can discard their own fight after confirming', async () => {
    saveFight();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    startDifferentEncounter();

    const blocked = await screen.findByTestId('combat-recovery-blocked');
    fireEvent.click(within(blocked).getByTestId('combat-discard-saved'));

    const table = await screen.findByTestId('combat-table-page');
    expect(table.textContent).toContain("Tonight's battle");
    // The old fight is gone; the new one then saves its own checkpoint, which
    // is the point of starting it.
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
      expect(stored.scenarioId).toBe('NEW-FIGHT');
    });
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).not.toContain('Dock ambush');
    confirmSpy.mockRestore();
  });

  test('cancelling the confirmation leaves the save byte for byte', async () => {
    saveFight();
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    startDifferentEncounter();

    const blocked = await screen.findByTestId('combat-recovery-blocked');
    fireEvent.click(within(blocked).getByTestId('combat-discard-saved'));

    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
    expect(screen.getByTestId('combat-recovery-blocked')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  test('an unverified offline legacy save is never offered a delete', async () => {
    legacySave();
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    apiClient.get.mockImplementation(() => Promise.reject(new Error('offline')));

    startDifferentEncounter();

    const blocked = await screen.findByTestId('combat-recovery-blocked');
    await waitFor(() => expect(blocked.textContent).toContain('cannot confirm'));
    expect(within(blocked).queryByTestId('combat-discard-saved')).not.toBeInTheDocument();
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
  });

  test('a legacy save verified online as this GM may then be discarded', async () => {
    legacySave();
    verifyOwnershipOnline();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    startDifferentEncounter();

    const discard = await screen.findByTestId('combat-discard-saved');
    fireEvent.click(discard);
    await screen.findByTestId('combat-table-page');
    await waitFor(() => {
      expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).not.toContain('OLD-FIGHT');
    });
    confirmSpy.mockRestore();
  });

  test('a legacy save fails verification for a different account and stays', async () => {
    legacySave();
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    verifyOwnershipOnline('someone-else');          // campaign belongs to another GM

    startDifferentEncounter();

    const blocked = await screen.findByTestId('combat-recovery-blocked');
    await waitFor(() => expect(within(blocked).queryByTestId('combat-discard-saved')).not.toBeInTheDocument());
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
  });

  test.each([
    ['corrupt', '{ not json'],
    ['a newer format', JSON.stringify({ version: CHECKPOINT_VERSION + 5, ownerId: ACCOUNT, campaignId: CAMPAIGN, combatants: [{ id: 'x' }] })],
    ['another campaign', JSON.stringify({ version: CHECKPOINT_VERSION, ownerId: ACCOUNT, campaignId: 'camp-OTHER', combatants: [{ id: 'x' }] })],
  ])('%s is preserved and offered no delete', async (_label, stored) => {
    localStorage.setItem(combatCheckpointKey(CAMPAIGN), stored);
    startDifferentEncounter();
    const blocked = await screen.findByTestId('combat-recovery-blocked');
    expect(within(blocked).queryByTestId('combat-discard-saved')).not.toBeInTheDocument();
    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(stored);
  });

  test('a checkpoint replaced by another tab between confirm and delete is not erased', async () => {
    saveFight();
    const replacement = JSON.stringify({
      version: CHECKPOINT_VERSION, ownerId: ACCOUNT, campaignId: CAMPAIGN,
      scenarioId: 'enc-9', scenarioName: 'A newer fight',
      combatants: [{ id: 'z1', name: 'Wolf', type: 'enemy', hp: 9, maxHp: 11 }],
      currentTurn: 0, round: 1, collectedLoot: [], mapTokens: [], initialPlayerStates: {},
    });
    // The other tab writes while this tab's confirmation dialog is open.
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => {
      localStorage.setItem(combatCheckpointKey(CAMPAIGN), replacement);
      return true;
    });

    startDifferentEncounter();
    const blocked = await screen.findByTestId('combat-recovery-blocked');
    fireEvent.click(within(blocked).getByTestId('combat-discard-saved'));

    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(replacement);
    confirmSpy.mockRestore();
  });

  test('a failed deletion does not report success or start a replacement', async () => {
    saveFight();
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage is full or blocked');
    });

    startDifferentEncounter();
    const blocked = await screen.findByTestId('combat-recovery-blocked');
    fireEvent.click(within(blocked).getByTestId('combat-discard-saved'));

    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
    expect(screen.getByTestId('combat-recovery-blocked')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-table-page')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('could not delete'));
    removeSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  test('a silent no-op deletion is caught rather than trusted', async () => {
    // Some privacy modes accept removeItem and keep the value.
    saveFight();
    const original = localStorage.getItem(combatCheckpointKey(CAMPAIGN));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    startDifferentEncounter();
    const blocked = await screen.findByTestId('combat-recovery-blocked');
    fireEvent.click(within(blocked).getByTestId('combat-discard-saved'));

    expect(localStorage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
    expect(screen.queryByTestId('combat-table-page')).not.toBeInTheDocument();
    removeSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  test('a plain refresh never offers to delete anything', async () => {
    saveFight();
    render(
      <MemoryRouter initialEntries={[`/combat/${CAMPAIGN}`]}>
        <Routes>
          <Route path="/combat/:campaignId" element={<CombatPageTable />} />
          <Route path="/campaign/:campaignId" element={<h1>Campaign prep</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('combat-table-page');
    expect(screen.queryByTestId('combat-discard-saved')).not.toBeInTheDocument();
  });
});


test('a recovered fight resets to the original roster, not its wounded checkpoint, and rerolls initiative', async () => {
  saveFight({
    startingCombatants: [
      { id: 'c1', name: 'Rina Ironside', type: 'player', character_id: 'char-1',
        hp: 54, maxHp: 54, ac: 19, initiative: 18, initiativeRoll: 16, conditions: [], deathSaves: { successes: 0, failures: 0 } },
      { id: 'c2', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7, ac: 15, initiative: 12, initiativeRoll: 12 },
    ],
    collectedLoot: [{ id: 'loot1', name: 'Old key', offlineOperationId: 'loot-op-1' }],
  });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    openColdTab();
    await screen.findByTestId('combat-table-page');
    expect(screen.getByTestId('combat-table-page')).toHaveTextContent('22/54');
    fireEvent.click(screen.getByRole('button', { name: 'Reset encounter' }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
      const player = saved.combatants.find(item => item.id === 'c1');
      expect(saved.round).toBe(1);
      expect(player.hp).toBe(54);
      expect(player.conditions).toEqual([]);
      expect(player.initiativeRoll).toBe(1);
      expect(saved.initialPlayerStates['char-1'].current_hit_points).toBe(54);
      expect(saved.collectedLoot).toEqual([]);
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
  } finally {
    confirm.mockRestore();
    random.mockRestore();
  }
});

test('an older recovered fight cannot reset a wounded roster as if it were fresh', async () => {
  saveFight();
  openColdTab();
  await screen.findByTestId('combat-table-page');
  expect(screen.getByRole('button', { name: /Reset unavailable: original encounter roster not saved/ })).toBeDisabled();
  const saved = JSON.parse(localStorage.getItem(combatCheckpointKey(CAMPAIGN)));
  expect(saved.combatants.find(item => item.id === 'c1').hp).toBe(22);
  expect(saved.round).toBe(4);
});


test('a prepared encounter opens a combined battlefield with its map and GM enemy stats', async () => {
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url.endsWith('/maps') ? [{
      id: 'map-forest', name: 'Forest Clearing', width: 20, height: 15, terrain: [], tokens: [],
    }] : [],
  }));
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/combat/${CAMPAIGN}`,
      state: {
        source: 'live-play', campaignName: 'Spilsby Wednesday',
        scenario: {
          id: 'enc-forest', name: 'Forest Ambush', map_id: 'map-forest',
          combatants: [
            { id: 'hero-1', name: 'Aria', type: 'player', character_id: 'hero-1', hp: 18, maxHp: 25, ac: 15, initiative: 16 },
            { id: 'enemy-1', name: 'Scarab Horror', type: 'enemy', hp: 46, maxHp: 46, ac: 17, initiative: 12,
              actions: [{ name: 'Claw', attack_bonus: 6, damage_dice: '2d8' }] },
          ],
        },
      },
    }]}>
      <Routes><Route path="/combat/:campaignId" element={<CombatPageTable />} /></Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByTestId('map-canvas')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Battle' })).toHaveAttribute('aria-pressed', 'true');
  const roster = document.querySelector('.combat-list');
  expect(roster).toHaveTextContent('Aria');
  expect(roster).toHaveTextContent('Scarab Horror');
  expect(roster).toHaveTextContent('46/46');
  expect(roster).toHaveTextContent('17');
  // The saved map arrives asynchronously; tokens are positioned in the next effect.
  await waitFor(() => expect(screen.getByTestId('map-canvas')).toHaveAttribute('data-tokens', '2'));
  expect(screen.getByRole('combobox', { name: '' })).toHaveValue('map-forest');

  const zoom = screen.getByTestId('map-canvas');
  expect(zoom).toHaveAttribute('data-zoom', '1');
  fireEvent.click(within(document.querySelector('.combat-map-toolbar')).getByRole('button', { name: '+' }));
  expect(zoom).toHaveAttribute('data-zoom', '1.2');

  fireEvent.click(screen.getByRole('button', { name: 'Tracker' }));
  expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument();
  expect(document.querySelector('.combat-list')).toHaveTextContent('Scarab Horror');

  fireEvent.click(screen.getByRole('button', { name: 'Map' }));
  expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
  expect(document.querySelector('.combat-list')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Battle' }));
  expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
  expect(document.querySelector('.combat-list')).toHaveTextContent('Scarab Horror');
});

test('hidden encounter creatures never reach the player display broadcast', async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/combat/${CAMPAIGN}`,
      state: {
        source: 'live-play',
        scenario: {
          id: 'enc-hidden', name: 'Hidden Threat', combatants: [
            { id: 'hero-1', name: 'Aria', type: 'player', character_id: 'hero-1', hp: 18, maxHp: 25 },
            { id: 'enemy-visible', name: 'Revealed Guard', type: 'enemy', hp: 12, maxHp: 12 },
            { id: 'enemy-hidden', name: 'Secret Beholder', type: 'enemy', hp: 99, maxHp: 99, hidden: true },
            { id: 'enemy-private', name: 'Secret Dragon', type: 'enemy', hp: 150, maxHp: 150, player_visible: false },
          ],
        },
      },
    }]}>
      <Routes><Route path="/combat/:campaignId" element={<CombatPageTable />} /></Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  await waitFor(() => expect(createDisplayState.mock.calls.some(([mode]) => mode === 'combat')).toBe(true));

  const combatPayload = createDisplayState.mock.calls.find(([mode]) => mode === 'combat')[1];
  expect(combatPayload.tokens.map(token => token.name)).toEqual(['Revealed Guard']);
  expect(JSON.stringify(combatPayload)).not.toContain('Secret Beholder');
  expect(JSON.stringify(combatPayload)).not.toContain('Secret Dragon');
});

test('without a linked map, encounter still starts with GM controls and an honest map chooser', async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/combat/${CAMPAIGN}`,
      state: {
        scenario: { id: 'enc-no-map', name: 'Street Fight', combatants: [
          { id: 'enemy-1', name: 'Bandit Captain', type: 'enemy', hp: 30, ac: 15 },
        ] },
      },
    }]}>
      <Routes><Route path="/combat/:campaignId" element={<CombatPageTable />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId('combat-table-page')).toBeInTheDocument();
  expect(screen.getByTestId('generic-combat-map')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Generic battlefield terrain' })).toHaveValue('stone');
  expect(document.querySelector('.combat-list')).toHaveTextContent('Bandit Captain');
  expect(screen.getByRole('button', { name: 'Battle' })).toHaveAttribute('aria-pressed', 'true');
});

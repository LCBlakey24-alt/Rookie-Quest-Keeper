/**
 * Mounted regressions for the Encounter Review draft (#764 bug sweep).
 *
 * Each block reproduces a defect found while reviewing the draft feature:
 *   A. drafts were not scoped to the signed-in account;
 *   B. a failed or unfinished load reconciled exclusions away and wrote the
 *      loss back to storage;
 *   C. a draft could be applied to, or launched with, the wrong encounter;
 *   E. the counts shown must be exactly the roster that launches;
 *   F. reset, storage failure and Start Combat consumption.
 *
 * The launcher is mounted directly. Unmounting and remounting it is exactly
 * what a Live Play tool switch does to it.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LiveEncounterLauncher from './LiveEncounterLauncher';
import { setAuthToken, clearAuthToken } from '@/lib/auth';
import { forgetDraftsInMemory } from './encounterReviewDraft';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');

const CAMPAIGN = 'camp-1';

function tokenFor(sub) {
  const encode = value => window.btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}

const PLAYERS = [
  { id: 'p1', character_id: 'c1', name: 'Rina Ironside', hp: 40, max_hp: 54, ac: 19, temporary_hit_points: 5, conditions: ['poisoned'], death_saves_failures: 1 },
  { id: 'p2', character_id: 'c2', name: 'Orren Oakenshade', hp: 31, max_hp: 38, ac: 16 },
];

const NPCS = [
  { id: 'n1', name: 'Captain Vell', role: 'Guard captain', hp: 30, ac: 16 },
  { id: 'n2', name: 'Sister Amaranth', role: 'Healer', hp: 18, ac: 12 },
];

const SCENARIOS = [
  {
    id: 'enc-a',
    name: 'Hollowmere Ambush',
    live_ready: true,
    live_default: true,
    planned_encounter_order: 1,
    combatants: [
      { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
      { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
    ],
  },
  {
    id: 'enc-b',
    name: 'Bridge Toll',
    live_ready: true,
    planned_encounter_order: 2,
    combatants: [
      { id: 'o1', name: 'Orc', type: 'enemy', hp: 15, maxHp: 15 },
      { id: 'o2', name: 'Ogre', type: 'enemy', hp: 59, maxHp: 59 },
    ],
  },
];

let failing = new Set();

/** Fresh object references every call, as a real refresh produces. */
function mockApi({ players = PLAYERS, scenarios = SCENARIOS, npcs = NPCS } = {}) {
  apiClient.get.mockImplementation(url => {
    const fail = key => failing.has(key) && Promise.reject(Object.assign(new Error(`${key} down`), { response: { status: 503 } }));
    if (url === `/campaigns/${CAMPAIGN}`) return fail('campaign') || Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby Wednesday' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) return fail('scenarios') || Promise.resolve({ data: JSON.parse(JSON.stringify(scenarios)) });
    if (url === `/campaigns/${CAMPAIGN}/npcs`) return fail('npcs') || Promise.resolve({ data: JSON.parse(JSON.stringify(npcs)) });
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return fail('liveState') || Promise.resolve({ data: { companion_npc_ids: [] } });
    if (url.includes('/live-party') || url.includes('/players')) {
      return fail('players') || Promise.resolve({ data: JSON.parse(JSON.stringify(players)) });
    }
    return Promise.resolve({ data: [] });
  });
}

let launched = null;
function CombatProbe() {
  const location = useLocation();
  launched = location.state;
  return <div data-testid="combat-page">combat</div>;
}

function mountReview(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/live']}>
      <Routes>
        <Route path="/live" element={<LiveEncounterLauncher campaignId={CAMPAIGN} {...props} />} />
        <Route path="/combat/:campaignId" element={<CombatProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function launcher() {
  return screen.findByTestId('live-encounter-launcher');
}

async function counts() {
  const root = await launcher();
  return within(root).getByTestId('live-encounter-roster-counts').textContent;
}

async function expectCounts(...parts) {
  await waitFor(async () => {
    const text = await counts();
    parts.forEach(part => expect(text).toContain(part));
  });
}

async function clickRow(name, index = 0) {
  const root = await launcher();
  const label = within(root).getAllByText(name)[index];
  fireEvent.click(label.closest('button'));
}

async function chooseEncounter(id) {
  const root = await launcher();
  fireEvent.change(within(root).getByLabelText('Choose battle type'), { target: { value: id } });
}

async function addQuick(name, quantity = '1') {
  const root = await launcher();
  fireEvent.change(within(root).getByPlaceholderText('Name'), { target: { value: name } });
  fireEvent.change(within(root).getByLabelText('Qty'), { target: { value: quantity } });
  fireEvent.keyDown(within(root).getByPlaceholderText('Name'), { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  forgetDraftsInMemory();
  failing = new Set();
  launched = null;
  jest.clearAllMocks();
  setAuthToken(tokenFor('account-a'));
  mockApi();
});

afterEach(() => {
  jest.restoreAllMocks();
  clearAuthToken();
});

describe('A. a draft belongs to the account that made it', () => {
  test('account B neither reads nor overwrites account A, and A gets theirs back', async () => {
    let view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    view.unmount();

    // Account B signs in on the same tab and opens the same encounter.
    setAuthToken(tokenFor('account-b'));
    view = mountReview();
    await expectCounts('Party: 2', 'Enemies: 2');
    // B makes their own change, which must not land on A's draft.
    await clickRow('Goblin', 0);
    await expectCounts('Enemies: 1', 'Party: 2');
    view.unmount();

    setAuthToken(tokenFor('account-a'));
    view = mountReview();
    await expectCounts('Party: 1', 'Enemies: 2');
    view.unmount();
  });

  test('a stored draft stamped for another account is refused even under a matching key', async () => {
    let view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    view.unmount();

    // Copy A's stored draft under B's key, as a crafted or stale entry would.
    const [key] = Object.keys(sessionStorage).filter(item => item.includes('enc-a'));
    const raw = sessionStorage.getItem(key);
    const bKey = key.replace(encodeURIComponent('account-a'), encodeURIComponent('account-b'));
    expect(bKey).not.toBe(key);
    sessionStorage.setItem(bKey, raw);

    setAuthToken(tokenFor('account-b'));
    view = mountReview();
    await expectCounts('Party: 2');
    view.unmount();
  });

  test('signed out, nothing is persisted under an anonymous scope', async () => {
    clearAuthToken();
    const view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    expect(Object.keys(sessionStorage).filter(key => key.startsWith('rqk.encounterReviewDraft'))).toEqual([]);
    view.unmount();
  });

  test('an account switch while the review is open does not carry the draft across', async () => {
    const view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');

    act(() => { setAuthToken(tokenFor('account-b')); });
    await expectCounts('Party: 2');
    view.unmount();

    setAuthToken(tokenFor('account-a'));
    const again = mountReview();
    await expectCounts('Party: 1');
    again.unmount();
  });
});

describe('B. an unfinished or failed load never removes a choice', () => {
  test('an excluded player stays excluded through a failed party load and a successful retry', async () => {
    let view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    view.unmount();

    // The GM comes back while the party service is down.
    failing = new Set(['players']);
    view = mountReview();
    const warning = await screen.findByTestId('live-data-warning');
    expect(warning).toBeInTheDocument();

    // It recovers, and the GM presses Retry on the warning itself.
    failing = new Set();
    fireEvent.click(within(warning).getByRole('button', { name: /retry/i }));
    await expectCounts('Party: 1');
    const root = await launcher();
    expect(within(root).getByText('Orren Oakenshade')).toBeInTheDocument();
    view.unmount();
  });

  test('a failed NPC load does not drop an NPC the GM added', async () => {
    let view = mountReview();
    await expectCounts('NPCs: 0');
    fireEvent.click(within(await launcher()).getByText(/Add saved NPC/));
    await clickRow('Captain Vell');
    await expectCounts('NPCs: 1');
    view.unmount();

    failing = new Set(['npcs']);
    view = mountReview();
    const warning = await screen.findByTestId('live-data-warning');
    failing = new Set();
    fireEvent.click(within(warning).getByRole('button', { name: /retry/i }));
    await expectCounts('NPCs: 1');
    view.unmount();
  });
});

describe('C. a draft is only ever applied to its own encounter', () => {
  test('A -> B -> A keeps a separate draft for each encounter', async () => {
    const view = mountReview();
    await expectCounts('Enemies: 2');
    await clickRow('Goblin', 0);
    await expectCounts('Enemies: 1');

    await chooseEncounter('enc-b');
    await expectCounts('Enemies: 2');
    await clickRow('Ogre');
    await addQuick('Dire Wolf', '2');
    await expectCounts('Enemies: 1', 'Temporary: 2');

    await chooseEncounter('enc-a');
    await expectCounts('Enemies: 1', 'Temporary: 0');

    await chooseEncounter('enc-b');
    await expectCounts('Enemies: 1', 'Temporary: 2');
    view.unmount();
  });

  test('Start Combat right after switching launches the new encounter with its own roster', async () => {
    const view = mountReview();
    await expectCounts('Enemies: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');

    await chooseEncounter('enc-b');
    fireEvent.click(within(await launcher()).getByTestId('live-encounter-start'));
    await screen.findByTestId('combat-page');

    expect(launched.scenario.id).toBe('enc-b');
    // enc-a's exclusion is not enc-b's.
    expect(launched.scenario.combatants.map(item => item.id).sort()).toEqual(['o1', 'o2', 'p1', 'p2']);
    view.unmount();
  });
});

describe('E. the review shows the roster that launches', () => {
  test('counts and launched combatants agree for a mixed roster', async () => {
    localStorage.setItem(`gm.liveEncounterNpcQueue.${CAMPAIGN}`, JSON.stringify(['n2']));
    const scenarios = [{
      ...SCENARIOS[0],
      combatants: [
        { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7 },
        { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7 },
        { id: 'g3', name: 'Goblin', type: 'enemy', hp: 7 },
        // The same player twice: prepared token and the party.
        { id: 'tok-1', character_id: 'c1', name: 'Rina Ironside', type: 'player', hp: 54, maxHp: 54 },
      ],
    }];
    mockApi({ scenarios });
    const view = mountReview();
    await expectCounts('Party: 2', 'Enemies: 3', 'NPCs: 1');

    await clickRow('Goblin', 2);           // disable one goblin
    await clickRow('Orren Oakenshade');    // exclude a player
    fireEvent.click(within(await launcher()).getByText(/Add saved NPC/));
    await clickRow('Captain Vell');        // add an NPC
    await addQuick('Wolf', '2');           // two temporary creatures
    await expectCounts('Party: 1', 'Enemies: 2', 'NPCs: 2', 'Temporary: 2', 'Total: 7');

    fireEvent.click(within(await launcher()).getByTestId('live-encounter-start'));
    await screen.findByTestId('combat-page');
    const roster = launched.scenario.combatants;
    expect(roster).toHaveLength(7);
    expect(roster.filter(item => item.type === 'player').map(item => item.id)).toEqual(['p1']);
    // The real character's state, not the prepared token's.
    const rina = roster.find(item => item.id === 'p1');
    expect(rina).toMatchObject({ hp: 40, maxHp: 54, tempHp: 5, conditions: ['poisoned'] });
    expect(rina.deathSaves.failures).toBe(1);
    expect(roster.filter(item => item.name === 'Goblin').map(item => item.id)).toEqual(['g1', 'g2']);
    expect(roster.filter(item => item.temporary)).toHaveLength(2);
    expect(roster.map(item => item.id)).toEqual(expect.arrayContaining(['n1', 'n2']));
    view.unmount();
  });
});

describe('F. reset, storage failure and Start Combat', () => {
  test('resetting encounter A leaves encounter B alone', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const view = mountReview();
    await expectCounts('Enemies: 2');
    await clickRow('Goblin', 0);
    await expectCounts('Enemies: 1');
    await chooseEncounter('enc-b');
    await clickRow('Ogre');
    await expectCounts('Enemies: 1');

    await chooseEncounter('enc-a');
    await expectCounts('Enemies: 1');
    fireEvent.click(within(await launcher()).getByTestId('live-encounter-reset-review'));
    await expectCounts('Enemies: 2');
    expect(window.confirm).toHaveBeenCalled();

    await chooseEncounter('enc-b');
    await expectCounts('Enemies: 1');
    view.unmount();
  });

  test('a full or blocked store warns, and the draft still survives a tool switch', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key) {
      if (String(key).startsWith('rqk.encounterReviewDraft')) throw new DOMException('full', 'QuotaExceededError');
    });
    let view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    expect(await screen.findByTestId('live-encounter-draft-warning')).toBeInTheDocument();
    view.unmount();

    view = mountReview();
    await expectCounts('Party: 1');
    view.unmount();
  });

  test('a write that silently does not stick is not reported as saved', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    const view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    expect(await screen.findByTestId('live-encounter-draft-warning')).toBeInTheDocument();
    view.unmount();
  });

  test('Start Combat consumes the draft so it cannot shape a later fight', async () => {
    let view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    fireEvent.click(within(await launcher()).getByTestId('live-encounter-start'));
    await screen.findByTestId('combat-page');
    expect(launched.scenario.combatants.map(item => item.id)).not.toContain('p2');
    view.unmount();

    view = mountReview();
    await expectCounts('Party: 2');
    view.unmount();
  });

  test('a cancelled reset changes nothing', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const view = mountReview();
    await expectCounts('Party: 2');
    await clickRow('Orren Oakenshade');
    await expectCounts('Party: 1');
    fireEvent.click(within(await launcher()).getByTestId('live-encounter-reset-review'));
    await expectCounts('Party: 1');
    expect(toast.info).not.toHaveBeenCalled();
    view.unmount();
  });
});

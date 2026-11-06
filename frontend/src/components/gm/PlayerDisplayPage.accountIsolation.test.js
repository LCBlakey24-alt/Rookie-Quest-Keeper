/**
 * Player Display never shows one account's campaign content to another.
 *
 * Mounted: the real PlayerDisplayPage, the real liveDisplayBus and the real
 * auth module. Only the HTTP client is mocked, plus in-memory stand-ins for
 * BroadcastChannel and WebSocket (jsdom has neither). Every account, campaign
 * and reveal here is synthetic.
 *
 * The defect: the cache key, BroadcastChannel, same-tab event and storage
 * event were all keyed by campaign id alone, sign-out left the cache behind,
 * the initial render read it before any access check, and a refused
 * display-state request was swallowed -- so account B opened account A's
 * reveal, kept it on screen through every 403, and was told it was "Synced".
 */
import React from 'react';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlayerDisplayPage from './PlayerDisplayPage';
import { setAuthToken, clearAuthToken } from '@/lib/auth';
import { createDisplayState, publishDisplayState } from '@/lib/liveDisplayBus';
import { ownedStorageKey } from '@/lib/liveDisplayScope';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('@/data/campaignCharacterBridge', () => ({ normalizeCampaignCharacter: value => value }));
jest.mock('@/components/gm/GroupCheckDisplay', () => () => null);

const apiClient = require('@/lib/apiClient').default;

const CAMPAIGN = 'synthetic-campaign';
const OTHER_CAMPAIGN = 'synthetic-campaign-two';
const A_SECRET = 'SYNTHETIC REVEAL ONLY ACCOUNT A MAY SEE';
const B_REVEAL = 'SYNTHETIC REVEAL FOR ACCOUNT B';

function tokenFor(sub) {
  const encode = value => window.btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}

function remoteReveal(title, { minutesAgo = 0, sequence = 10 } = {}) {
  return {
    sync_id: `sync-${title.length}-${sequence}`,
    mode: 'title',
    payload: { title, subtitle: 'synthetic' },
    updated_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    sequence,
  };
}

function httpError(status) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

/** Who the mocked server thinks is calling: whoever holds the token now. */
function caller() {
  const token = localStorage.getItem('dm_token') || '';
  try { return JSON.parse(window.atob(token.split('.')[1])).sub; } catch { return ''; }
}

let displayStateFor; // (account, campaignId) => Promise
function mockServer() {
  apiClient.get.mockImplementation(url => {
    if (url.endsWith('/display-state')) {
      const campaignId = url.split('/')[2];
      return displayStateFor(caller(), campaignId);
    }
    if (url.endsWith('/players')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: {} });
  });
  apiClient.post.mockResolvedValue({ data: { acknowledged: true } });
}

function showDisplay(campaignId = CAMPAIGN) {
  return render(
    <MemoryRouter initialEntries={[`/player-display/${campaignId}`]}>
      <Routes>
        <Route path="/player-display/:campaignId" element={<PlayerDisplayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const shows = text => document.body.textContent.includes(text);
const footer = () => document.querySelector('.rqk-player-display__footer')?.textContent || '';

// In-memory BroadcastChannel shared across "tabs" in this test process.
class FakeBroadcastChannel {
  static channels = new Map();
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!FakeBroadcastChannel.channels.has(name)) FakeBroadcastChannel.channels.set(name, new Set());
    FakeBroadcastChannel.channels.get(name).add(this);
  }
  postMessage(data) {
    [...(FakeBroadcastChannel.channels.get(this.name) || [])]
      .filter(peer => peer !== this)
      .forEach(peer => peer.onmessage && peer.onmessage({ data }));
  }
  close() { FakeBroadcastChannel.channels.get(this.name)?.delete(this); }
  static post(name, data) { [...(FakeBroadcastChannel.channels.get(name) || [])].forEach(peer => peer.onmessage && peer.onmessage({ data })); }
  static names() { return [...FakeBroadcastChannel.channels.keys()].filter(n => FakeBroadcastChannel.channels.get(n).size); }
}

class FakeWebSocket {
  static instances = [];
  constructor(url) { this.url = url; this.closed = false; FakeWebSocket.instances.push(this); }
  send() {}
  close() { this.closed = true; }
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
  FakeBroadcastChannel.channels.clear();
  FakeWebSocket.instances = [];
  window.BroadcastChannel = FakeBroadcastChannel;
  window.WebSocket = FakeWebSocket;
  displayStateFor = (account) => (account === 'synthetic-gm-a'
    ? Promise.resolve({ data: remoteReveal(A_SECRET) })
    : Promise.reject(httpError(403)));
  mockServer();
});

afterEach(() => {
  cleanup();
  clearAuthToken();
  delete window.BroadcastChannel;
  delete window.WebSocket;
});

async function aHasSeenTheReveal() {
  setAuthToken(tokenFor('synthetic-gm-a'));
  const view = showDisplay();
  await waitFor(() => expect(shows(A_SECRET)).toBe(true));
  return view;
}

describe('one account never sees another account\'s display', () => {
  test('1-2. B, signed in after A, never sees A\'s reveal -- not even on the first render', async () => {
    const a = await aHasSeenTheReveal();
    a.unmount();
    act(() => { clearAuthToken(); });
    act(() => { setAuthToken(tokenFor('synthetic-player-b')); });

    showDisplay();
    expect(shows(A_SECRET)).toBe(false); // synchronous: before any request settles
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN}/display-state`));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
    expect(footer()).not.toMatch(/Synced/);
  });

  test('3. A -> B -> A: nothing leaks, and A gets their own display back', async () => {
    const a = await aHasSeenTheReveal();
    a.unmount();
    act(() => { setAuthToken(tokenFor('synthetic-player-b')); });
    const b = showDisplay();
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
    b.unmount();

    act(() => { setAuthToken(tokenFor('synthetic-gm-a')); });
    showDisplay();
    await waitFor(() => expect(shows(A_SECRET)).toBe(true));
  });

  test('4. signing out clears the visible display and A\'s cached copy', async () => {
    await aHasSeenTheReveal();
    act(() => { clearAuthToken(); });
    await waitFor(() => expect(shows(A_SECRET)).toBe(false));
    expect(screen.getByRole('alert')).toHaveTextContent(/sign in/i);
    expect(Object.keys(localStorage).filter(k => k.startsWith('rqk.liveDisplay'))).toEqual([]);
  });

  test('5. A\'s request that answers after B signed in cannot reach B\'s screen or cache', async () => {
    let answerA;
    displayStateFor = (account) => (account === 'synthetic-gm-a'
      ? new Promise(resolve => { answerA = () => resolve({ data: remoteReveal(A_SECRET) }); })
      : Promise.reject(httpError(403)));
    setAuthToken(tokenFor('synthetic-gm-a'));
    showDisplay();
    await waitFor(() => expect(answerA).toBeDefined());

    act(() => { setAuthToken(tokenFor('synthetic-player-b')); });
    await act(async () => { answerA(); await new Promise(r => setTimeout(r, 50)); });

    expect(shows(A_SECRET)).toBe(false);
    expect(Object.values({ ...localStorage }).some(v => String(v).includes(A_SECRET))).toBe(false);
  });
});

describe('a refused request ends the display rather than hiding behind the cache', () => {
  test.each([[401, /sign in/i], [403, /access|not available/i]])('6-7. HTTP %s clears the cached reveal and says why', async (status, message) => {
    const a = await aHasSeenTheReveal();
    a.unmount();
    displayStateFor = () => Promise.reject(httpError(status));
    showDisplay();
    await waitFor(() => expect(shows(A_SECRET)).toBe(false));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(footer()).not.toMatch(/Synced/);
    expect(Object.values({ ...localStorage }).some(v => String(v).includes(A_SECRET))).toBe(false);
  });

  test('8. a network failure keeps A\'s own last-known reveal but does not call it synced', async () => {
    const a = await aHasSeenTheReveal();
    a.unmount();
    displayStateFor = () => Promise.reject(new Error('Network Error')); // no response: offline
    showDisplay();
    await waitFor(() => expect(footer()).toMatch(/not synced|offline|last known/i));
    expect(shows(A_SECRET)).toBe(true); // same account: offline resilience kept
    expect(footer()).not.toMatch(/Synced \d/);
  });
});

describe('legacy and foreign records are refused', () => {
  test('9. an old unowned cache record is never shown', async () => {
    localStorage.setItem(`rqk.liveDisplay.${CAMPAIGN}`, JSON.stringify(remoteReveal(A_SECRET)));
    setAuthToken(tokenFor('synthetic-player-b'));
    showDisplay();
    expect(shows(A_SECRET)).toBe(false);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
  });

  test('9b. an old unowned record is not adopted by the account that happens to be signed in', async () => {
    localStorage.setItem(`rqk.liveDisplay.${CAMPAIGN}`, JSON.stringify(remoteReveal(A_SECRET)));
    displayStateFor = () => Promise.reject(new Error('Network Error'));
    setAuthToken(tokenFor('synthetic-gm-a'));
    showDisplay();
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
  });
});

describe('every same-browser transport is account-scoped', () => {
  async function bIsWatching() {
    displayStateFor = (account) => (account === 'synthetic-player-b'
      ? Promise.resolve({ data: remoteReveal(B_REVEAL, { minutesAgo: 30, sequence: 1 }) })
      : Promise.reject(httpError(403)));
    setAuthToken(tokenFor('synthetic-player-b'));
    showDisplay();
    await waitFor(() => expect(shows(B_REVEAL)).toBe(true));
  }

  test('10. a BroadcastChannel message from another account (or an old tab) is ignored', async () => {
    await bIsWatching();
    act(() => {
      // An old-code tab on the campaign-only channel name.
      FakeBroadcastChannel.post(`rqk-live-display-${CAMPAIGN}`, remoteReveal(A_SECRET, { sequence: 99 }));
    });
    expect(shows(A_SECRET)).toBe(false);
    act(() => {
      // Anything on any open channel that is stamped for account A.
      FakeBroadcastChannel.names().forEach(name => FakeBroadcastChannel.post(name, {
        owner: 'synthetic-gm-a', campaign_id: CAMPAIGN, state: remoteReveal(A_SECRET, { sequence: 99 }),
      }));
    });
    // Checked at once: a flash of A's reveal is a leak even if a later poll hides it.
    expect(shows(A_SECRET)).toBe(false);
    await act(async () => { await new Promise(r => setTimeout(r, 600)); });
    expect(shows(A_SECRET)).toBe(false);
    expect(shows(B_REVEAL)).toBe(true);
  });

  test('11. a cross-tab storage event carrying another account\'s record is ignored', async () => {
    await bIsWatching();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: `rqk.liveDisplay.${CAMPAIGN}`, newValue: JSON.stringify(remoteReveal(A_SECRET, { sequence: 99 })) }));
    });
    expect(shows(A_SECRET)).toBe(false);
    act(() => {
      Object.keys(localStorage).filter(k => k.startsWith('rqk.liveDisplay')).forEach(key => {
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify({ owner: 'synthetic-gm-a', campaign_id: CAMPAIGN, state: remoteReveal(A_SECRET, { sequence: 99 }) }) }));
      });
    });
    // Checked at once: a flash of A's reveal is a leak even if a later poll hides it.
    expect(shows(A_SECRET)).toBe(false);
    await act(async () => { await new Promise(r => setTimeout(r, 600)); });
    expect(shows(A_SECRET)).toBe(false);
  });

  test('12. a same-tab custom event from the old campaign-only name is ignored', async () => {
    await bIsWatching();
    act(() => {
      window.dispatchEvent(new CustomEvent(`rqk-live-display-local-${CAMPAIGN}`, { detail: remoteReveal(A_SECRET, { sequence: 99 }) }));
    });
    // Checked at once: a flash of A's reveal is a leak even if a later poll hides it.
    expect(shows(A_SECRET)).toBe(false);
    await act(async () => { await new Promise(r => setTimeout(r, 600)); });
    expect(shows(A_SECRET)).toBe(false);
  });

  test('13. a socket opened for A is closed on switch and its late messages are ignored', async () => {
    await aHasSeenTheReveal();
    const socketForA = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    expect(socketForA).toBeDefined();
    act(() => { socketForA.onopen && socketForA.onopen(); });

    act(() => { setAuthToken(tokenFor('synthetic-player-b')); });
    await waitFor(() => expect(shows(A_SECRET)).toBe(false));
    act(() => {
      socketForA.onmessage && socketForA.onmessage({ data: JSON.stringify({ type: 'player_display_update', data: remoteReveal(`${A_SECRET} LATE`, { sequence: 500 }) }) });
    });
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
    expect(socketForA.closed).toBe(true);
  });
});

describe('the right account still gets a working display', () => {
  test('14. an authorised account receives remote updates and is told it is synced', async () => {
    await aHasSeenTheReveal();
    await waitFor(() => expect(footer()).toMatch(/Synced/));
  });

  test('15. same-account publishing from another tab still updates the display', async () => {
    await aHasSeenTheReveal();
    act(() => { publishDisplayState(CAMPAIGN, createDisplayState('title', { title: 'SYNTHETIC SAME ACCOUNT UPDATE' })); });
    await waitFor(() => expect(shows('SYNTHETIC SAME ACCOUNT UPDATE')).toBe(true));
  });

  test('18. switching campaign never shows the previous campaign\'s cached state', async () => {
    const a = await aHasSeenTheReveal();
    a.unmount();
    displayStateFor = () => new Promise(() => {}); // the other campaign never answers
    showDisplay(OTHER_CAMPAIGN);
    expect(shows(A_SECRET)).toBe(false);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(shows(A_SECRET)).toBe(false);
  });
});

describe('sign-out cleanup is precise', () => {
  test('17b. switching straight from B to A ends B\'s session, so B\'s cache goes too', async () => {
    setAuthToken(tokenFor('synthetic-player-b'));
    publishDisplayState(CAMPAIGN, createDisplayState('title', { title: B_REVEAL }));
    expect(Object.keys(localStorage).filter(k => k.startsWith('rqk.liveDisplay'))).toHaveLength(1);
    act(() => { setAuthToken(tokenFor('synthetic-gm-a')); });
    expect(Object.keys(localStorage).filter(k => k.startsWith('rqk.liveDisplay'))).toEqual([]);
  });

  test('17. only the signed-out account\'s display cache is removed', async () => {
    localStorage.setItem('gm.activeCombat.synthetic-campaign', '{"ownerId":"synthetic-gm-a"}');
    localStorage.setItem('gm.lastEncounter.synthetic-campaign', 'enc-1');
    localStorage.setItem('rqk.offlineCampaignPack.synthetic', 'pack');
    sessionStorage.setItem('rqk.encounterReviewDraft.v2.synthetic-gm-a.synthetic-campaign.enc-1', '{}');
    // Another account's display record on this browser whose session was not
    // ended here (a direct B -> A switch would end it, and purge it, by design).
    const bKey = ownedStorageKey('synthetic-player-b', CAMPAIGN);
    localStorage.setItem(bKey, JSON.stringify({ owner: 'synthetic-player-b', campaign_id: CAMPAIGN, state: remoteReveal(B_REVEAL) }));
    const bKeys = [bKey];

    const a = await aHasSeenTheReveal();
    a.unmount();
    act(() => { clearAuthToken(); });

    expect(localStorage.getItem('gm.activeCombat.synthetic-campaign')).not.toBeNull();
    expect(localStorage.getItem('gm.lastEncounter.synthetic-campaign')).toBe('enc-1');
    expect(localStorage.getItem('rqk.offlineCampaignPack.synthetic')).toBe('pack');
    expect(sessionStorage.length).toBe(1);
    expect(Object.keys(localStorage).filter(k => k.startsWith('rqk.liveDisplay'))).toEqual(bKeys);
    expect(Object.values({ ...localStorage }).some(v => String(v).includes(A_SECRET))).toBe(false);
  });
});

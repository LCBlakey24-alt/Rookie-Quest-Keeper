import {
  createDisplayState,
  loadDisplayState,
  publishCampaignDisplayState,
  publishDisplayState,
  subscribeDisplayState,
  subscribeRemoteDisplayState,
} from './liveDisplayBus';
import { clearAuthToken, setAuthToken } from './auth';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const apiClient = require('./apiClient').default;

// Display state is scoped to the signed-in account; publish as a synthetic one.
const encode = value => window.btoa(JSON.stringify(value)).replace(/=+$/, '');
const TOKEN = `${encode({ alg: 'HS256' })}.${encode({ sub: 'synthetic-gm', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const tokenFor = sub => `${encode({ alg: 'HS256' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

describe('liveDisplayBus', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    setAuthToken(TOKEN);
  });

  afterEach(() => {
    jest.useRealTimers();
    clearAuthToken();
  });

  test('publishes to local subscribers immediately for same-browser player display refresh', () => {
    const received = [];
    const unsubscribe = subscribeDisplayState('campaign-1', state => received.push(state));
    const state = createDisplayState('title', { title: 'Scene changed' });

    publishDisplayState('campaign-1', state);
    unsubscribe();

    expect(received[received.length - 1]).toMatchObject({ mode: 'title', payload: { title: 'Scene changed' } });
  });

  test('a pending account A publish response is never restamped for account B', async () => {
    const secret = createDisplayState('title', { title: 'ACCOUNT A PUBLISH RESPONSE' });
    const remote = { ...secret, sequence: secret.sequence + 10 };
    let answer;
    apiClient.put.mockReturnValue(new Promise(resolve => { answer = resolve; }));

    setAuthToken(tokenFor('account-a'));
    const pending = publishCampaignDisplayState('campaign-1', secret);
    setAuthToken(tokenFor('account-b'));
    const receivedByB = [];
    const unsubscribe = subscribeDisplayState('campaign-1', state => receivedByB.push(state));

    answer({ data: remote });
    await pending;
    unsubscribe();

    expect(receivedByB).toEqual([]);
    expect(Object.values({ ...localStorage }).some(value => String(value).includes('ACCOUNT A PUBLISH RESPONSE'))).toBe(false);
  });

  test('a delayed successful response with a later server timestamp never rewinds newer local combat', async () => {
    const earlier = createDisplayState('battle-start', { title: 'Original warning' });
    let resolveWrite;
    apiClient.put.mockImplementationOnce(() => new Promise(resolve => { resolveWrite = resolve; }));
    const oldWrite = publishCampaignDisplayState('campaign-1', earlier);
    for (let i = 0; i < 10 && !resolveWrite; i += 1) await Promise.resolve();

    const latest = createDisplayState('combat', { title: 'Actual battle' });
    publishDisplayState('campaign-1', latest);
    const lateAck = {
      ...earlier,
      updated_at: new Date(Date.parse(latest.updated_at) + 60000).toISOString(),
    };
    resolveWrite({ data: lateAck });

    const resolved = await oldWrite;

    expect(resolved.sync_id).toBe(latest.sync_id);
    expect(loadDisplayState('campaign-1')).toMatchObject({
      sync_id: latest.sync_id,
      mode: 'combat',
    });
  });

  test('a server 409 replaces the rejected optimistic reveal with its authoritative newer combat state', async () => {
    const stale = createDisplayState('battle-start', { title: 'Outdated warning' });
    const authoritative = createDisplayState('combat', { title: 'Battle in progress' });
    const conflict = Object.assign(new Error('stale revision'), { response: { status: 409 } });
    apiClient.put.mockRejectedValueOnce(conflict);
    apiClient.get.mockResolvedValueOnce({ data: authoritative, headers: {} });

    const resolved = await publishCampaignDisplayState('campaign-1', stale);

    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/campaign-1/display-state');
    expect(resolved.sync_id).toBe(authoritative.sync_id);
    expect(loadDisplayState('campaign-1')).toMatchObject({
      sync_id: authoritative.sync_id,
      mode: 'combat',
      payload: { title: 'Battle in progress' },
    });
  });

  test('an old 409 cannot erase another newer GM reveal that is still pending locally', async () => {
    const rejected = createDisplayState('battle-start', { title: 'Old warning' });
    let rejectWrite;
    apiClient.put.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    const oldWrite = publishCampaignDisplayState('campaign-1', rejected);
    for (let i = 0; i < 10 && !rejectWrite; i += 1) await Promise.resolve();

    const serverState = createDisplayState('combat', { title: 'Server battle' });
    const latestLocal = createDisplayState('title', { title: 'Newest GM action still pending' });
    publishDisplayState('campaign-1', latestLocal);
    apiClient.get.mockResolvedValueOnce({ data: serverState, headers: {} });
    rejectWrite(Object.assign(new Error('stale revision'), { response: { status: 409 } }));

    const resolved = await oldWrite;

    expect(resolved.sync_id).toBe(latestLocal.sync_id);
    expect(loadDisplayState('campaign-1')).toMatchObject({
      sync_id: latestLocal.sync_id,
      payload: { title: 'Newest GM action still pending' },
    });
  });

  test('an offline fallback cannot undo a 403 or restore its cached reveal', async () => {
    jest.useFakeTimers();
    const forbidden = createDisplayState('title', { title: 'FORBIDDEN OFFLINE FALLBACK' });
    const denied = Object.assign(new Error('HTTP 403'), { response: { status: 403 } });
    apiClient.get
      .mockRejectedValueOnce(denied)
      .mockResolvedValue({
        data: forbidden,
        headers: { 'x-rqk-offline-cache': '1' },
        rqkOffline: true,
      });
    const states = [];
    const statuses = [];

    const unsubscribe = subscribeRemoteDisplayState('campaign-1', state => states.push(state), {
      account: 'synthetic-gm',
      intervalMs: 2500,
      onStatus: status => statuses.push(status),
    });
    for (let index = 0; index < 12 && !statuses.length; index += 1) await Promise.resolve();
    expect(statuses.at(-1)).toBe('denied');

    // Let the first read's finally block release its in-flight guard, then
    // model a browser wake while the server is unreachable. apiClient returns
    // its IndexedDB fallback as a resolved response in that situation.
    await Promise.resolve();
    window.dispatchEvent(new Event('focus'));
    for (let index = 0; index < 12 && apiClient.get.mock.calls.length < 2; index += 1) await Promise.resolve();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 12; index += 1) await Promise.resolve();
    unsubscribe();

    expect(statuses.at(-1)).toBe('denied');
    expect(states.some(state => state?.payload?.title === 'FORBIDDEN OFFLINE FALLBACK')).toBe(false);
    expect(Object.values({ ...localStorage }).some(value => String(value).includes('FORBIDDEN OFFLINE FALLBACK'))).toBe(false);
  });

  test('a refused display retries HTTP authorization after its socket opens', async () => {
    const originalWebSocket = window.WebSocket;
    let socket;
    let unsubscribe;
    class TestWebSocket {
      constructor() { socket = this; }
      send() {}
      close() {}
    }
    window.WebSocket = TestWebSocket;
    const denied = Object.assign(new Error('HTTP 403'), { response: { status: 403 } });
    const granted = createDisplayState('title', { title: 'ACCESS NOW GRANTED' });
    apiClient.get.mockRejectedValueOnce(denied).mockResolvedValue({ data: granted, headers: {} });
    const states = [];
    const statuses = [];

    try {
      unsubscribe = subscribeRemoteDisplayState('campaign-1', state => states.push(state), {
        account: 'synthetic-gm',
        intervalMs: 2500,
        onStatus: status => statuses.push(status),
      });
      for (let index = 0; index < 12 && statuses.at(-1) !== 'denied'; index += 1) await Promise.resolve();
      expect(statuses.at(-1)).toBe('denied');

      socket.onopen();
      // The socket is healthy once the server has verified the first-message
      // credentials, not merely when the TCP connection opens.
      socket.onmessage({ data: JSON.stringify({ type: 'auth_ok' }) });
      for (let index = 0; index < 12 && apiClient.get.mock.calls.length < 2; index += 1) await Promise.resolve();
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      for (let index = 0; index < 12 && statuses.at(-1) !== 'synced'; index += 1) await Promise.resolve();

      expect(statuses.at(-1)).toBe('synced');
      expect(states.at(-1)).toMatchObject({ mode: 'title', payload: { title: 'ACCESS NOW GRANTED' } });
    } finally {
      unsubscribe?.();
      window.WebSocket = originalWebSocket;
    }
  });
});

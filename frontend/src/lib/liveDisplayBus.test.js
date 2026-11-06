import {
  createDisplayState,
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

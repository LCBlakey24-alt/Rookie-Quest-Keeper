/**
 * The live socket client: right host, no token in the URL, auth first.
 *
 * Production sockets were built from the site's own origin, which Vercel
 * cannot upgrade (it served the SPA's HTML), and carried the session token in
 * the query string, which server access logs record. These tests pin the
 * replacement protocol on the client side. Synthetic accounts only.
 */
import { liveSocketBase } from './api';
import { subscribeRemoteDisplayState } from './liveDisplayBus';
import { clearAuthToken, setAuthToken } from './auth';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
const apiClient = require('./apiClient').default;

const encode = value => window.btoa(JSON.stringify(value)).replace(/=+$/, '');
const tokenFor = sub => `${encode({ alg: 'HS256' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
// A fresh campaign per test: an HTTP read started by an earlier test may
// still land and cache its (same-account) state, which must not make this
// test's updates look older than it.
let campaignCounter = 0;
let CAMPAIGN = 'synthetic-campaign';

class FakeWebSocket {
  static instances = [];
  constructor(url) { this.url = url; this.sent = []; this.closed = false; FakeWebSocket.instances.push(this); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.closed = true; }
  open() { this.onopen && this.onopen(); }
  receive(message) { this.onmessage && this.onmessage({ data: JSON.stringify(message) }); }
  end(code) { this.onclose && this.onclose({ code }); }
}
const latest = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function reveal(title, sequence = 10) {
  return { sync_id: `s-${sequence}`, mode: 'title', payload: { title }, updated_at: new Date(Date.now() + sequence).toISOString(), sequence };
}

beforeEach(() => {
  campaignCounter += 1;
  CAMPAIGN = `synthetic-campaign-${campaignCounter}`;
  localStorage.clear();
  FakeWebSocket.instances = [];
  window.WebSocket = FakeWebSocket;
  apiClient.get.mockReset();
  apiClient.get.mockResolvedValue({ data: reveal('from polling', 1) });
  apiClient.post.mockResolvedValue({ data: {} });
  setAuthToken(tokenFor('synthetic-gm'));
});

afterEach(() => {
  clearAuthToken();
  delete window.WebSocket;
  jest.useRealTimers();
});

describe('the socket URL', () => {
  test('carries no credentials at all', async () => {
    const stop = subscribeRemoteDisplayState(CAMPAIGN, () => {});
    await flush();
    const url = latest().url;
    expect(url).toMatch(new RegExp(`/ws/campaign/${CAMPAIGN}$`));
    expect(url).not.toMatch(/token|\?/);
    stop();
  });
});

describe('authentication is the first message', () => {
  test('on open, the only thing sent is the auth message for this account', async () => {
    const stop = subscribeRemoteDisplayState(CAMPAIGN, () => {});
    await flush();
    latest().open();
    expect(latest().sent).toEqual([{ type: 'auth', token: localStorage.getItem('dm_token') }]);
    stop();
  });

  test('nothing from the socket is applied before auth_ok', async () => {
    apiClient.get.mockReturnValue(new Promise(() => {})); // keep polling out of the way
    const seen = [];
    const stop = subscribeRemoteDisplayState(CAMPAIGN, state => seen.push(state.payload?.title));
    await flush();
    latest().open();
    latest().receive({ type: 'player_display_update', data: reveal('BEFORE AUTH', 50) });
    expect(seen).not.toContain('BEFORE AUTH');
    latest().receive({ type: 'auth_ok' });
    latest().receive({ type: 'player_display_update', data: reveal('AFTER AUTH', 60) });
    expect(seen).toContain('AFTER AUTH');
    stop();
  });

  test('a socket opened for another account never authenticates', async () => {
    const stop = subscribeRemoteDisplayState(CAMPAIGN, () => {});
    await flush();
    const socket = latest();
    setAuthToken(tokenFor('synthetic-player-b'));
    socket.open();
    expect(socket.sent).toEqual([]);
    expect(socket.closed).toBe(true);
    stop();
  });
});

describe('reconnecting', () => {
  test.each([4001, 4003])('a socket refused with %s is never retried', async code => {
    jest.useFakeTimers();
    const stop = subscribeRemoteDisplayState(CAMPAIGN, () => {});
    await Promise.resolve();
    const before = FakeWebSocket.instances.length;
    latest().end(code);
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(FakeWebSocket.instances.length).toBe(before);
    stop();
  });

  test('after a refusal, HTTP polling still carries the display', async () => {
    const seen = [];
    const stop = subscribeRemoteDisplayState(CAMPAIGN, state => seen.push(state.payload?.title));
    for (let i = 0; i < 20 && apiClient.get.mock.calls.length < 1; i += 1) await flush();
    const callsBefore = apiClient.get.mock.calls.length;
    apiClient.get.mockResolvedValue({ data: reveal('VIA POLLING', 80) });
    latest().end(4001);
    for (let i = 0; i < 20 && apiClient.get.mock.calls.length <= callsBefore; i += 1) await flush();
    for (let i = 0; i < 20 && !seen.includes('VIA POLLING'); i += 1) await flush();
    expect(apiClient.get.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(seen).toContain('VIA POLLING');
    stop();
  });

  test('a dropped socket backs off to a 60 second ceiling', async () => {
    jest.useFakeTimers();
    const stop = subscribeRemoteDisplayState(CAMPAIGN, () => {});
    await Promise.resolve();
    const gaps = [];
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const count = FakeWebSocket.instances.length;
      latest().end(1006);
      let waited = 0;
      while (FakeWebSocket.instances.length === count && waited < 120000) { jest.advanceTimersByTime(500); waited += 500; }
      gaps.push(waited);
    }
    expect(gaps[0]).toBeLessThanOrEqual(2000);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(60000);
    expect(gaps[gaps.length - 1]).toBeGreaterThanOrEqual(45000);
    stop();
  });

  test('after auth_ok the socket is the live transport and the next update arrives once', async () => {
    const seen = [];
    const stop = subscribeRemoteDisplayState(CAMPAIGN, state => seen.push(state.payload?.title));
    await flush();
    latest().open();
    latest().receive({ type: 'auth_ok' });
    latest().receive({ type: 'player_display_update', data: reveal('LIVE', 70) });
    latest().receive({ type: 'player_display_update', data: reveal('LIVE', 70) }); // duplicate delivery
    expect(seen.filter(title => title === 'LIVE')).toHaveLength(1);
    stop();
  });
});

describe('which host the socket goes to', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const at = hostname => ({ location: { hostname } });

  test('production site -> the API host over wss', () => {
    process.env.NODE_ENV = 'production';
    expect(liveSocketBase(at('rookiequestkeeper.com'))).toBe('wss://rookie-quest-keeper-api.onrender.com');
    expect(liveSocketBase(at('www.rookiequestkeeper.com'))).toBe('wss://rookie-quest-keeper-api.onrender.com');
  });

  test('any other production host (previews) gets no socket and polls', () => {
    process.env.NODE_ENV = 'production';
    expect(liveSocketBase(at('rookie-quest-keeper-git-main-example.vercel.app'))).toBe('');
  });

  test('production never opens an unencrypted socket, even if configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_LIVE_SOCKET_URL = 'http://insecure.example';
    expect(liveSocketBase(at('rookiequestkeeper.com'))).toBe('');
    process.env.REACT_APP_LIVE_SOCKET_URL = 'https://api.example';
    expect(liveSocketBase(at('rookiequestkeeper.com'))).toBe('wss://api.example');
  });
});

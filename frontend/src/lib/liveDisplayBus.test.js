import { createDisplayState, publishDisplayState, subscribeDisplayState } from './liveDisplayBus';
import { clearAuthToken, setAuthToken } from './auth';

// Display state is scoped to the signed-in account; publish as a synthetic one.
const encode = value => window.btoa(JSON.stringify(value)).replace(/=+$/, '');
const TOKEN = `${encode({ alg: 'HS256' })}.${encode({ sub: 'synthetic-gm', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

describe('liveDisplayBus', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken(TOKEN);
  });

  afterEach(() => clearAuthToken());

  test('publishes to local subscribers immediately for same-browser player display refresh', () => {
    const received = [];
    const unsubscribe = subscribeDisplayState('campaign-1', state => received.push(state));
    const state = createDisplayState('title', { title: 'Scene changed' });

    publishDisplayState('campaign-1', state);
    unsubscribe();

    expect(received[received.length - 1]).toMatchObject({ mode: 'title', payload: { title: 'Scene changed' } });
  });
});

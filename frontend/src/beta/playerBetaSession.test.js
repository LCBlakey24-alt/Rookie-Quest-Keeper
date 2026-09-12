import {
  BETA_CREDENTIALS_KEY,
  createBetaCredentials,
  ensurePlayerBetaSession,
  isPlayerBeta,
  readBetaCredentials,
} from './playerBetaSession';

function storage(values = {}) {
  const state = { ...values };
  return {
    getItem: jest.fn((key) => state[key] ?? null),
    setItem: jest.fn((key, value) => { state[key] = value; }),
    state,
  };
}

test('recognises only the dedicated Player Beta branch alias', () => {
  expect(isPlayerBeta('rookie-quest-keeper-git-player-be-7fd992-lewis-blakeys-projects.vercel.app')).toBe(true);
  expect(isPlayerBeta('rookiequestkeeper.com')).toBe(false);
  expect(isPlayerBeta('rookie-quest-keeper-git-main-lewis-blakeys-projects.vercel.app')).toBe(false);
});

test('creates and persists anonymous beta credentials for the browser', () => {
  const store = storage();
  const created = createBetaCredentials(store);
  expect(created.username).toMatch(/^Beta_[A-Za-z0-9]+$/);
  expect(created.username.length).toBeLessThanOrEqual(24);
  expect(created.password.length).toBeGreaterThanOrEqual(8);
  expect(JSON.parse(store.state[BETA_CREDENTIALS_KEY])).toEqual(created);
  expect(readBetaCredentials(store)).toEqual(created);
});

test('keeps a valid existing beta token without creating another account', async () => {
  const client = {
    get: jest.fn().mockResolvedValue({ data: { username: 'Beta_existing' } }),
    post: jest.fn(),
  };
  await expect(ensurePlayerBetaSession(client, { existingToken: 'existing-token', storage: storage() }))
    .resolves.toEqual({ token: 'existing-token', username: 'Beta_existing' });
  expect(client.post).not.toHaveBeenCalled();
});

test('logs an existing beta browser back in when its token has expired', async () => {
  const credentials = { username: 'Beta_returning', password: 'RqkBeta-returning!' };
  const store = storage({ [BETA_CREDENTIALS_KEY]: JSON.stringify(credentials) });
  const client = {
    get: jest.fn().mockRejectedValue({ response: { status: 401 } }),
    post: jest.fn().mockResolvedValue({ data: { token: 'renewed', username: credentials.username } }),
  };

  await expect(ensurePlayerBetaSession(client, { existingToken: 'expired', storage: store }))
    .resolves.toEqual({ token: 'renewed', username: credentials.username });
  expect(client.post).toHaveBeenCalledWith('/auth/login', credentials);
});

test('registers a fresh beta account without asking the tester to sign in', async () => {
  const store = storage();
  const client = {
    get: jest.fn(),
    post: jest.fn().mockImplementation(async (url, body) => {
      if (url !== '/auth/register') throw new Error('unexpected request');
      return { data: { token: 'new-token', username: body.username } };
    }),
  };

  const result = await ensurePlayerBetaSession(client, { storage: store });
  expect(result.token).toBe('new-token');
  expect(result.username).toMatch(/^Beta_/);
  expect(client.post).toHaveBeenCalledTimes(1);
});

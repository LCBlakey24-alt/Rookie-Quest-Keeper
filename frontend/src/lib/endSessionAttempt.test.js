import { clearSessionCloseAttempt, getSessionCloseAttempt, markSessionCloseArchived } from './endSessionAttempt';

beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(1000000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('reuses the same account-and-campaign token across simulated reloads and timeouts', () => {
  const first = getSessionCloseAttempt('campaign-a', 'gm-a', 5);
  expect(first).toMatch(/^end-/);
  expect(getSessionCloseAttempt('campaign-a', 'gm-a', 5)).toBe(first);
  expect(getSessionCloseAttempt('campaign-b', 'gm-a', 5)).not.toBe(first);
  expect(getSessionCloseAttempt('campaign-a', 'gm-b', 5)).not.toBe(first);
});

test('archived attempts are reused for failed display delivery but not a later new session', () => {
  const first = getSessionCloseAttempt('campaign-a', 'gm-a', 4);
  markSessionCloseArchived('campaign-a', 'gm-a', first);
  expect(getSessionCloseAttempt('campaign-a', 'gm-a', 0)).toBe(first);
  const second = getSessionCloseAttempt('campaign-a', 'gm-a', 3);
  expect(second).not.toBe(first);
  clearSessionCloseAttempt('campaign-a', 'gm-a', first);
  expect(getSessionCloseAttempt('campaign-a', 'gm-a', 0)).toBe(second);
  clearSessionCloseAttempt('campaign-a', 'gm-a', second);
  expect(getSessionCloseAttempt('campaign-a', 'gm-a', 0)).not.toBe(second);
});

test('expires old tokens so a previous table session cannot be replayed days later', () => {
  const old = getSessionCloseAttempt('campaign-a', 'gm-a');
  Date.now.mockReturnValue(1000000 + 9 * 60 * 60 * 1000);
  expect(getSessionCloseAttempt('campaign-a', 'gm-a')).not.toBe(old);
});


test('blocked sessionStorage still reuses a close id for retries in the same browser tab', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
  const remove = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage blocked'); });
  try {
    const first = getSessionCloseAttempt('blocked-campaign-a', 'gm-a', 3);
    expect(getSessionCloseAttempt('blocked-campaign-a', 'gm-a', 3)).toBe(first);
    markSessionCloseArchived('blocked-campaign-a', 'gm-a', first);
    expect(getSessionCloseAttempt('blocked-campaign-a', 'gm-a', 0)).toBe(first);
    expect(getSessionCloseAttempt('blocked-campaign-b', 'gm-a', 3)).not.toBe(first);
    expect(getSessionCloseAttempt('blocked-campaign-a', 'gm-b', 3)).not.toBe(first);
    clearSessionCloseAttempt('blocked-campaign-a', 'gm-a', first);
    expect(getSessionCloseAttempt('blocked-campaign-a', 'gm-a', 0)).not.toBe(first);
  } finally {
    get.mockRestore();
    set.mockRestore();
    remove.mockRestore();
  }
});

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

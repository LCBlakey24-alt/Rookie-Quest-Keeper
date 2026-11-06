/**
 * One player action, one roll: the client side of roll de-duplication.
 *
 * The server records a roll once per (campaign, account, client_event_id).
 * These tests pin what the client must do for that to hold: give each roll
 * one id, send that same id on every retry, retry only when retrying can
 * help, and never append the same roll to local history twice.
 */
import {
  buildEndSessionStats,
  flushPendingRemoteRolls,
  normaliseRollEvent,
  recordRemoteRoll,
  recordSessionRoll,
} from './sessionRollStats';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('./liveDisplayBus', () => ({ loadDisplayState: jest.fn(() => null) }));
jest.mock('@/offline/offlineApiCache', () => ({ getOfflineCacheScope: jest.fn(() => 'user:player-a') }));
jest.mock('@/offline/offlineRollSyncQueue', () => ({
  listPendingRolls: jest.fn(() => []),
  queuePendingRoll: jest.fn(({ scope, campaignId, event }) => ({
    key: `${scope}:${campaignId}:${event.client_event_id}`,
    scope,
    campaignId,
    event,
  })),
  removePendingRoll: jest.fn(),
}));
const { loadDisplayState } = require('./liveDisplayBus');
const apiClient = require('./apiClient').default;
const { getOfflineCacheScope } = require('@/offline/offlineApiCache');
const {
  listPendingRolls,
  queuePendingRoll,
  removePendingRoll,
} = require('@/offline/offlineRollSyncQueue');

const CAMPAIGN = 'synthetic-campaign';
const roll = (extra = {}) => ({
  actor_type: 'player',
  character_id: 'char-a',
  label: 'Stealth',
  total: 17,
  modifier: 3,
  rolls: [{ sides: 20, result: 14 }],
  ...extra,
});

// Let each retry's wait elapse and its promise chain settle.
async function settle(rounds = 10) {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
  }
}

beforeEach(() => {
  localStorage.clear();
  apiClient.post.mockReset();
  loadDisplayState.mockReset();
  loadDisplayState.mockReturnValue(null);
  getOfflineCacheScope.mockReset();
  getOfflineCacheScope.mockReturnValue('user:player-a');
  listPendingRolls.mockReset();
  listPendingRolls.mockReturnValue([]);
  queuePendingRoll.mockReset();
  queuePendingRoll.mockImplementation(({ scope, campaignId, event }) => ({
    key: `${scope}:${campaignId}:${event.client_event_id}`,
    scope,
    campaignId,
    event,
  }));
  removePendingRoll.mockReset();
  jest.useRealTimers();
});

test('every roll gets its own client event id, sent as both id and client_event_id', () => {
  const first = normaliseRollEvent(roll());
  const second = normaliseRollEvent(roll());
  expect(first.client_event_id).toBe(first.id);
  expect(first.id).toMatch(/^roll-[A-Za-z0-9._:-]{6,}$/);
  expect(second.id).not.toBe(first.id);
});

test('an event that already has an id keeps it', () => {
  expect(normaliseRollEvent(roll({ id: 'roll-existing-1' })).client_event_id).toBe('roll-existing-1');
});

test('a dropped connection is retried with the identical event', async () => {
  jest.useFakeTimers();
  apiClient.post
    .mockRejectedValueOnce(new Error('Network Error'))
    .mockRejectedValueOnce({ response: { status: 503 } })
    .mockResolvedValueOnce({ data: { id: 'roll-server', duplicate: false } });
  const pending = recordRemoteRoll(CAMPAIGN, roll());
  await settle();
  await expect(pending).resolves.toEqual({ id: 'roll-server', duplicate: false });
  expect(apiClient.post).toHaveBeenCalledTimes(3);
  const sent = apiClient.post.mock.calls.map(([, body]) => body.client_event_id);
  expect(new Set(sent).size).toBe(1);
  expect(queuePendingRoll).toHaveBeenCalledTimes(1);
  expect(removePendingRoll).toHaveBeenCalledWith(expect.stringContaining(sent[0]));
});

test.each([403, 413, 422])('a %s answer is final and not retried', async (status) => {
  apiClient.post.mockRejectedValue({ response: { status } });
  await recordRemoteRoll(CAMPAIGN, roll());
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(removePendingRoll).toHaveBeenCalledTimes(1);
});

test.each([401, 408, 429])('a temporary %s answer leaves the durable roll queued', async (status) => {
  apiClient.post.mockRejectedValue({ response: { status } });
  await expect(recordRemoteRoll(CAMPAIGN, roll())).resolves.toMatchObject({ queued: true });
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(removePendingRoll).not.toHaveBeenCalled();
});

test('a roll is queued before its first request and remains queued after bounded retries', async () => {
  jest.useFakeTimers();
  apiClient.post.mockRejectedValue(new Error('Network Error'));
  const pending = recordRemoteRoll(CAMPAIGN, roll());
  expect(queuePendingRoll).toHaveBeenCalledTimes(1);
  expect(queuePendingRoll.mock.invocationCallOrder[0]).toBeLessThan(apiClient.post.mock.invocationCallOrder[0]);
  await settle();
  await expect(pending).resolves.toMatchObject({ queued: true });
  expect(apiClient.post).toHaveBeenCalledTimes(3);
  expect(removePendingRoll).not.toHaveBeenCalled();
});

test('a queued roll is replayed after reconnect and removed after idempotent acceptance', async () => {
  const event = normaliseRollEvent(roll({ id: 'roll-interrupted-1' }));
  listPendingRolls.mockReturnValue([{
    key: 'user:player-a:synthetic-campaign:roll-interrupted-1',
    scope: 'user:player-a',
    campaignId: CAMPAIGN,
    event,
  }]);
  apiClient.post.mockResolvedValue({ data: { id: 'server-roll', duplicate: true } });

  await expect(flushPendingRemoteRolls()).resolves.toEqual({ delivered: 1, remaining: 0 });

  expect(apiClient.post).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN}/roll-events`, event);
  expect(removePendingRoll).toHaveBeenCalledWith('user:player-a:synthetic-campaign:roll-interrupted-1');
});

test('a queued roll is never replayed through a different signed-in account', async () => {
  const event = normaliseRollEvent(roll({ id: 'roll-player-a-1' }));
  listPendingRolls.mockReturnValue([{
    key: 'user:player-a:synthetic-campaign:roll-player-a-1',
    scope: 'user:player-a',
    campaignId: CAMPAIGN,
    event,
  }]);
  getOfflineCacheScope.mockReturnValue('user:player-b');

  await expect(flushPendingRemoteRolls()).resolves.toEqual({ delivered: 0, remaining: 0 });

  expect(apiClient.post).not.toHaveBeenCalled();
  expect(removePendingRoll).not.toHaveBeenCalled();
});

test('only a kept d20 joins an active GM group check; damage does not', async () => {
  loadDisplayState.mockReturnValue({
    mode: 'group-check', payload: { group_check_id: 'check-12345678', title: 'Dexterity save' },
  });
  apiClient.post.mockResolvedValue({ data: { accepted: true } });
  await recordRemoteRoll(CAMPAIGN, roll({ rolls: [{ sides: 8, result: 5 }], total: 8 }));
  await recordRemoteRoll(CAMPAIGN, roll());
  const damage = apiClient.post.mock.calls[0][1];
  const d20 = apiClient.post.mock.calls[1][1];
  expect(damage.group_check_id).toBe('');
  expect(d20.group_check_id).toBe('check-12345678');
});

test('recording the same roll twice adds it to local history once', () => {
  const event = normaliseRollEvent(roll());
  recordSessionRoll(CAMPAIGN, event);
  recordSessionRoll(CAMPAIGN, event);
  expect(buildEndSessionStats(CAMPAIGN).session.totalRolls).toBe(1);
  recordSessionRoll(CAMPAIGN, roll());
  expect(buildEndSessionStats(CAMPAIGN).session.totalRolls).toBe(2);
});

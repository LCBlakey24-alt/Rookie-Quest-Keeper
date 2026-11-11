import {
  listPendingRolls,
  queuePendingRoll,
  removePendingRoll,
} from './offlineRollSyncQueue';

jest.mock('@/offline/offlineApiCache', () => ({ getOfflineCacheScope: jest.fn(() => 'user:player-a') }));
const { getOfflineCacheScope } = require('@/offline/offlineApiCache');

const event = (id, total = 17) => ({
  id,
  client_event_id: id,
  actor_type: 'player',
  character_id: 'char-a',
  total,
  rolls: [{ sides: 20, result: total }],
});

beforeEach(() => {
  localStorage.clear();
  getOfflineCacheScope.mockReset();
  getOfflineCacheScope.mockReturnValue('user:player-a');
});

test('pending rolls are isolated to the signed-in account', () => {
  queuePendingRoll({ campaignId: 'camp-a', event: event('roll-a-1') });
  getOfflineCacheScope.mockReturnValue('user:player-b');
  queuePendingRoll({ campaignId: 'camp-a', event: event('roll-b-1') });

  expect(listPendingRolls().map(record => record.event.client_event_id)).toEqual(['roll-b-1']);
  expect(listPendingRolls('user:player-a').map(record => record.event.client_event_id)).toEqual(['roll-a-1']);
});

test('queueing the same client event id updates one durable record rather than duplicating it', () => {
  const first = queuePendingRoll({ campaignId: 'camp-a', event: event('roll-same-1', 12) });
  const second = queuePendingRoll({ campaignId: 'camp-a', event: event('roll-same-1', 12) });

  expect(second.key).toBe(first.key);
  expect(listPendingRolls()).toHaveLength(1);
});

test('removing a delivered record leaves unrelated pending rolls intact', () => {
  const delivered = queuePendingRoll({ campaignId: 'camp-a', event: event('roll-a-1') });
  queuePendingRoll({ campaignId: 'camp-a', event: event('roll-a-2') });

  removePendingRoll(delivered.key);

  expect(listPendingRolls().map(record => record.event.client_event_id)).toEqual(['roll-a-2']);
});

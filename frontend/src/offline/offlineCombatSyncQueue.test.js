import { combatStateSnapshot, combatStatesMatch, queueOfflineCombatClose, queueOfflineCombatEnd, removeOfflineCombatSync } from './offlineCombatSyncQueue';
import { getOfflineCacheScope } from './offlineApiCache';

jest.mock('./offlineApiCache', () => ({ getOfflineCacheScope: jest.fn() }));

describe('offline combat state snapshots', () => {
  test('normalises combatant and API field aliases to the same state', () => {
    const combatant = {
      hp: 18,
      tempHp: 4,
      conditions: ['prone', 'poisoned'],
      deathSaves: { successes: 1, failures: 2 },
      concentrating_on: 'Bless',
    };
    const apiCharacter = {
      current_hit_points: 18,
      temporary_hit_points: 4,
      conditions: ['poisoned', 'prone'],
      death_saves_successes: 1,
      death_saves_failures: 2,
      concentration: 'Bless',
    };

    expect(combatStatesMatch(combatant, apiCharacter)).toBe(true);
  });

  test('deduplicates and sorts conditions before conflict comparison', () => {
    expect(combatStateSnapshot({ conditions: ['stunned', 'prone', 'stunned'] }).conditions)
      .toEqual(['prone', 'stunned']);
  });

  test('clamps invalid negative hp and death save values', () => {
    expect(combatStateSnapshot({
      hp: -9,
      tempHp: -2,
      deathSaves: { successes: 99, failures: -4 },
    })).toMatchObject({
      current_hit_points: 0,
      temporary_hit_points: 0,
      death_saves_successes: 3,
      death_saves_failures: 0,
    });
  });

  test.each([
    ['hp', { hp: 20 }, { hp: 19 }],
    ['temporary hp', { hp: 20, tempHp: 5 }, { hp: 20, tempHp: 4 }],
    ['conditions', { conditions: ['prone'] }, { conditions: ['poisoned'] }],
    ['death saves', { deathSaves: { successes: 1, failures: 0 } }, { deathSaves: { successes: 0, failures: 0 } }],
    ['concentration', { concentrating_on: 'Bless' }, { concentrating_on: 'Hex' }],
  ])('detects a real %s conflict', (_label, left, right) => {
    expect(combatStatesMatch(left, right)).toBe(false);
  });
});

describe('offline combat queue persistence', () => {
  let originalIndexedDB;
  let put;
  let close;
  let remove;

  beforeEach(() => {
    originalIndexedDB = window.indexedDB;
    getOfflineCacheScope.mockReset();
    getOfflineCacheScope.mockReturnValue('user:gm');
    put = jest.fn();
    close = jest.fn();
    remove = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: originalIndexedDB });
  });

  function installIndexedDb({ abortWrites = false, failReads = false, storedRecord = undefined } = {}) {
    const db = {
      close,
      transaction: (_store, mode) => {
        const transaction = {
          objectStore: () => ({
            get: () => {
              const request = { result: storedRecord };
              Promise.resolve().then(() => {
                if (failReads) request.onerror();
                else request.onsuccess();
              });
              return request;
            },
            put,
            delete: remove,
          }),
        };
        if (mode === 'readwrite') {
          setTimeout(() => {
            if (abortWrites) transaction.onabort();
            else transaction.oncomplete();
          }, 0);
        }
        return transaction;
      },
    };
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: () => {
          const request = { result: db };
          Promise.resolve().then(() => request.onsuccess());
          return request;
        },
      },
    });
  }

  test('does not report a queued close when the write is aborted', async () => {
    installIndexedDb({ abortWrites: true });
    const onQueued = jest.fn();
    window.addEventListener('rqk:offline-sync-queued', onQueued);
    expect(await queueOfflineCombatClose({ campaignId: 'campaign' })).toBeNull();
    expect(put).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalled();
    expect(onQueued).not.toHaveBeenCalled();
    window.removeEventListener('rqk:offline-sync-queued', onQueued);
  });

  test('does not write a combat end if the signed-in account changes while reading', async () => {
    installIndexedDb();
    getOfflineCacheScope.mockReturnValueOnce('user:gm').mockReturnValue('user:player');
    expect(await queueOfflineCombatEnd({ campaignId: 'campaign' })).toBeNull();
    expect(put).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  test('does not overwrite queued data when the existing record cannot be read', async () => {
    installIndexedDb({ failReads: true });
    expect(await queueOfflineCombatClose({ campaignId: 'campaign' })).toBeNull();
    expect(put).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  test('keeps a newer offline edit when an earlier sync completes', async () => {
    const sent = { key: 'user:gm::combat:campaign:character', state: { hp: 4 } };
    installIndexedDb({ storedRecord: { ...sent, state: { hp: 2 } } });
    await removeOfflineCombatSync(sent.key, sent);
    expect(remove).not.toHaveBeenCalled();
  });

  test('removes the exact offline edit that was synced', async () => {
    const sent = { key: 'user:gm::combat:campaign:character', state: { hp: 4 } };
    installIndexedDb({ storedRecord: sent });
    await removeOfflineCombatSync(sent.key, sent);
    expect(remove).toHaveBeenCalledWith(sent.key);
  });
});

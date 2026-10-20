'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { requireVerifiedUpdateBackup, prepareVerifiedInstalledUpdate } = require('./updateSafety');

const validBackup = {
  id: 'snapshot-1792500000000-deadbeef',
  reason: 'before-update',
  sha256: { 'workspace.json': 'a'.repeat(64) },
};

test('installed updater requires a saved workspace before proceeding', () => {
  let calls = 0;
  const create = () => { calls += 1; return validBackup; };
  for (const invalid of [null, '', '   ', undefined]) {
    assert.throws(() => requireVerifiedUpdateBackup(create, invalid), /saved campaign workspace/);
  }
  assert.equal(calls, 0);
});

test('installed updater accepts only a verified before-update snapshot', () => {
  const cases = [
    null,
    {},
    { ...validBackup, reason: 'manual' },
    { ...validBackup, id: 'outside-folder' },
    { ...validBackup, sha256: {} },
    { ...validBackup, sha256: { 'workspace.json': 'broken' } },
  ];
  for (const result of cases) {
    assert.throws(() => requireVerifiedUpdateBackup(() => result, '{}'), /verify the campaign backup/);
  }
});

test('valid backup returns its metadata without changing workspace content', () => {
  const raw = JSON.stringify({ version: 1, campaigns: [{ id: 'eldritch-heralds' }] });
  let call;
  const backup = requireVerifiedUpdateBackup((payload, reason) => {
    call = { payload, reason };
    return validBackup;
  }, raw);
  assert.deepEqual(call, { payload: raw, reason: 'before-update' });
  assert.equal(backup, validBackup);
});

test('single install action downloads first, then verifies backup, in that order', async () => {
  let state = 'available';
  const calls = [];
  const backup = await prepareVerifiedInstalledUpdate({
    state,
    getState: () => state,
    downloadUpdate: async () => { calls.push('download'); state = 'downloaded'; },
    createSafetyBackup: (_workspace, reason) => { calls.push('backup:' + reason); return validBackup; },
    workspaceRaw: '{"version":1}',
  });
  assert.deepEqual(calls, ['download', 'backup:before-update']);
  assert.equal(backup, validBackup);
});

test('already-downloaded update backs up without downloading again', async () => {
  const calls = [];
  await prepareVerifiedInstalledUpdate({
    state: 'downloaded',
    getState: () => 'downloaded',
    downloadUpdate: async () => { calls.push('unexpected download'); },
    createSafetyBackup: () => { calls.push('backup'); return validBackup; },
    workspaceRaw: '{}',
  });
  assert.deepEqual(calls, ['backup']);
});

test('unconfirmed, interrupted, or failed download never triggers a backup or install', async () => {
  let backups = 0;
  const create = () => { backups += 1; return validBackup; };
  for (const endState of ['downloading', 'available', 'error']) {
    await assert.rejects(
      prepareVerifiedInstalledUpdate({
        state: 'available', getState: () => endState,
        downloadUpdate: async () => {},
        createSafetyBackup: create, workspaceRaw: '{}',
      }), /not been verified as complete/,
    );
  }
  await assert.rejects(
    prepareVerifiedInstalledUpdate({
      state: 'available', getState: () => 'error',
      downloadUpdate: async () => { throw new Error('network interrupted'); },
      createSafetyBackup: create, workspaceRaw: '{}',
    }), /network interrupted/,
  );
  await assert.rejects(
    prepareVerifiedInstalledUpdate({
      state: 'checking', getState: () => 'downloaded',
      downloadUpdate: async () => {},
      createSafetyBackup: create, workspaceRaw: '{}',
    }), /Check for a published update/,
  );
  assert.equal(backups, 0);
});

test('a missing or unverified campaign snapshot blocks installation after download', async () => {
  let called = 0;
  await assert.rejects(
    prepareVerifiedInstalledUpdate({
      state: 'downloaded', getState: () => 'downloaded',
      createSafetyBackup: () => { called += 1; return { id: 'invalid' }; },
      workspaceRaw: '{}',
    }), /Could not verify the campaign backup/,
  );
  assert.equal(called, 1);
});

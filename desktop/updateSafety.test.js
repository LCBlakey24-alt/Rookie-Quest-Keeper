'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { requireVerifiedUpdateBackup, prepareVerifiedInstalledUpdate, readUpdateWorkspace,
  recordInstalledUpdateAttempt, readInstalledUpdateAttempt } = require('./updateSafety');
const { validateBrowserStorage } = require('./browserStorage');
const { createBackup } = require('./backup');

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

test('backup reads current saved data after download rather than the earlier click snapshot', async () => {
  let state = 'available';
  let currentRaw = '{"notes":["before download"]}';
  let backedUp;
  const calls = [];
  await prepareVerifiedInstalledUpdate({
    state, getState: () => state, workspaceRaw: currentRaw,
    downloadUpdate: async () => {
      calls.push('download');
      currentRaw = '{"notes":["edited during download"]}';
      state = 'downloaded';
    },
    getCurrentWorkspaceRaw: async () => { calls.push('read current workspace'); return currentRaw; },
    createSafetyBackup: raw => { calls.push('backup'); backedUp = raw; return validBackup; },
  });
  assert.deepEqual(calls, ['download', 'read current workspace', 'backup']);
  assert.equal(backedUp, '{"notes":["edited during download"]}');
});

test('an unreadable current workspace or readiness change blocks backup and installation', async () => {
  let backups = 0;
  const base = {
    state: 'downloaded', getState: () => 'downloaded', workspaceRaw: '{}',
    createSafetyBackup: () => { backups += 1; return validBackup; },
  };
  await assert.rejects(prepareVerifiedInstalledUpdate({ ...base,
    getCurrentWorkspaceRaw: async () => { throw new Error('renderer unavailable'); },
  }), /renderer unavailable/);
  await assert.rejects(prepareVerifiedInstalledUpdate({ ...base,
    getCurrentWorkspaceRaw: async () => null,
  }), /saved campaign workspace/);
  let state = 'downloaded';
  await assert.rejects(prepareVerifiedInstalledUpdate({ ...base,
    getState: () => state,
    getCurrentWorkspaceRaw: async () => { state = 'error'; return '{}'; },
  }), /no longer ready/);
  assert.equal(backups, 0);
});

test('durable recovery receipt distinguishes completed and incomplete installs without restoring data', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-update-recovery-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(readInstalledUpdateAttempt(directory, '0.5.0'), null);
  const workspace = path.join(directory, 'workspace-fixture.json');
  fs.writeFileSync(workspace, 'unchanged campaign data');
  const receipt = recordInstalledUpdateAttempt(directory, {
    fromVersion: '0.5.0', toVersion: '0.5.1', backup: validBackup,
  });
  assert.equal(receipt.backup_id, validBackup.id);
  assert.equal(readInstalledUpdateAttempt(directory, '0.5.0').state, 'incomplete');
  assert.equal(readInstalledUpdateAttempt(directory, '0.5.1').state, 'installed');
  assert.equal(readInstalledUpdateAttempt(directory, '0.6.0').state, 'previous');
  assert.equal(fs.readFileSync(workspace, 'utf8'), 'unchanged campaign data');
  assert.equal(fs.readdirSync(directory).filter(name => name.endsWith('.pending')).length, 0);
});

test('invalid recovery metadata cannot authorise an install and corrupt receipts are ignored', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-update-recovery-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const value of [
    { fromVersion: '0.5.0', toVersion: '0.5.0', backup: validBackup },
    { fromVersion: '0.5.0', toVersion: null, backup: validBackup },
    { fromVersion: '0.5.0', toVersion: '0.5.1', backup: { ...validBackup, id: '../outside' } },
  ]) assert.throws(() => recordInstalledUpdateAttempt(directory, value), /recovery details/);
  fs.writeFileSync(path.join(directory, 'installed-update-recovery.json'), '{broken JSON');
  assert.equal(readInstalledUpdateAttempt(directory, '0.5.0'), null);
});

test('other saved Keeper data, including an empty map, must have a matching verified backup', () => {
  for (const supplemental of [{}, { 'rook-theme': 'dark', 'gm.activeCombat.campaign': '{"hp":7}' }]) {
    const digest = crypto.createHash('sha256').update(JSON.stringify(validateBrowserStorage(supplemental))).digest('hex');
    const complete = { ...validBackup, browser_storage_version: 1,
      sha256: { ...validBackup.sha256, 'browser-storage.json': digest } };
    let call;
    assert.equal(requireVerifiedUpdateBackup((...args) => { call = args; return complete; }, '{}', supplemental), complete);
    assert.deepEqual(call, ['{}', 'before-update', validateBrowserStorage(supplemental)]);
    for (const incomplete of [
      validBackup,
      { ...complete, browser_storage_version: undefined },
      { ...complete, browser_storage_version: 2 },
      { ...complete, sha256: { ...complete.sha256, 'browser-storage.json': 'bad' } },
      { ...complete, sha256: { ...complete.sha256, 'browser-storage.json': 'c'.repeat(64) } },
    ]) assert.throws(() => requireVerifiedUpdateBackup(() => incomplete, '{}', supplemental), /other saved Keeper information/);
  }
});

test('real update snapshot preserves exact supported browser-storage strings beside the workspace', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-update-extras-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const workspace = JSON.stringify({ version: 1, campaigns: [{ id: 'campaign' }],
    characters: [], collections: {}, notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [] });
  const supplemental = { 'rook-theme': 'dark', 'gm.activeCombat.campaign': '{ "hp": 7, "round": 3 }' };
  const backup = requireVerifiedUpdateBackup((raw, reason, extras) => createBackup(directory, raw, reason, extras), workspace, supplemental);
  const folder = path.join(directory, 'workspace-backups', backup.id);
  assert.equal(fs.readFileSync(path.join(folder, 'workspace.json'), 'utf8'), workspace);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'browser-storage.json'), 'utf8')), supplemental);
});

test('incomplete or rejected current snapshots cannot silently fall back to older workspace-only capture', async () => {
  let legacyReads = 0;
  const base = { workspaceRaw: 'stale click workspace',
    getCurrentWorkspaceRaw: () => { legacyReads += 1; return 'legacy workspace'; } };
  for (const snapshot of [null, {}, { workspace: '{}' }, { workspace: '{}', browserStorage: null },
    { workspace: '{}', browserStorage: { auth_token: 'never allowed' } }]) {
    await assert.rejects(readUpdateWorkspace({ ...base, getCurrentWorkspaceSnapshot: async () => snapshot }));
  }
  await assert.rejects(readUpdateWorkspace({ ...base,
    getCurrentWorkspaceSnapshot: async () => { throw new Error('Capture failed'); },
  }), /Capture failed/);
  assert.equal(legacyReads, 0);
  assert.deepEqual(await readUpdateWorkspace({ ...base,
    getCurrentWorkspaceSnapshot: async () => ({ workspace: 'latest workspace', browserStorage: {} }),
  }), { workspace: 'latest workspace', browserStorage: {} });
});

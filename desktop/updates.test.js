'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { EventEmitter } = require('events');
const { readInstalledUpdateAttempt } = require('./updateSafety');

const backup = {
  id: 'snapshot-1792500000000-deadbeef', reason: 'before-update',
  sha256: { 'workspace.json': 'a'.repeat(64) },
};

function updaterFixture(t, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-installed-updater-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const updater = new EventEmitter();
  const calls = [];
  updater.downloadUpdate = async () => {
    calls.push('download');
    updater.emit('update-downloaded', { version: '0.5.1' });
  };
  updater.quitAndInstall = (...args) => calls.push(['install', ...args]);
  const handlers = new Map();
  const scheduled = [];
  const filename = path.join(__dirname, 'updates.js');
  const localRequire = createRequire(filename);
  const context = {
    module: { exports: {} },
    require: name => name === 'electron-updater' ? { autoUpdater: updater } : localRequire(name),
    global: {}, process,
    setImmediate: fn => scheduled.push(fn),
    setTimeout: () => ({}),
    setInterval: () => ({ unref() {} }),
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const registered = context.module.exports.registerDesktopUpdater({
    app: { getPath: () => directory, getVersion: () => '0.5.0', isPackaged: true },
    ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) },
    BrowserWindow: { getAllWindows: () => [] }, dialog: {},
    createSafetyBackup: raw => { calls.push(['backup', raw]); return backup; },
    getCurrentWorkspaceRaw: async () => { calls.push('read latest workspace'); return 'current workspace'; },
    ...overrides,
  });
  updater.emit('update-available', { version: '0.5.1', releaseNotes: 'A published update' });
  return { updater, calls, directory, handlers, scheduled, getStatus: registered.getStatus,
    install: raw => handlers.get('rqk:install-update')({ sender: 'primary window' }, raw) };
}

test('installed update downloads, reads latest data, saves backup and recovery receipt before scheduling restart', async t => {
  const fixture = updaterFixture(t);
  const result = await fixture.install('stale workspace from install click');
  assert.equal(result.started, true);
  assert.deepEqual(fixture.calls, ['download', 'read latest workspace', ['backup', 'current workspace']]);
  const receipt = readInstalledUpdateAttempt(fixture.directory, '0.5.0');
  assert.equal(receipt.state, 'incomplete');
  assert.equal(receipt.backup_id, backup.id);
  assert.equal(fixture.scheduled.length, 1);
  fixture.scheduled[0]();
  assert.deepEqual(fixture.calls.at(-1), ['install', true, true]);
});

test('partial download cannot create a backup or schedule installation', async t => {
  const fixture = updaterFixture(t);
  fixture.updater.downloadUpdate = async () => { fixture.updater.emit('download-progress', { percent: 54 }); };
  await assert.rejects(fixture.install('workspace'), /not been verified as complete/);
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.scheduled.length, 0);
  assert.equal(readInstalledUpdateAttempt(fixture.directory, '0.5.0'), null);
});

test('download error keeps operation locked until it finishes and permits an explicit retry', async t => {
  const fixture = updaterFixture(t);
  let failDownload;
  fixture.updater.downloadUpdate = () => new Promise((_resolve, reject) => { failDownload = reject; });
  const installing = fixture.install('workspace');
  fixture.updater.emit('error', new Error('network disconnected'));
  await assert.rejects(fixture.install('workspace'), /already preparing/);
  failDownload(new Error('network disconnected'));
  await assert.rejects(installing, /network disconnected/);
  assert.equal(fixture.scheduled.length, 0);
  assert.deepEqual(fixture.calls, []);
  fixture.updater.emit('update-available', { version: '0.5.1' });
  fixture.updater.downloadUpdate = async () => fixture.updater.emit('update-downloaded', { version: '0.5.1' });
  assert.equal((await fixture.install('workspace')).started, true);
  assert.equal(fixture.scheduled.length, 1);
});

test('failure to read current data keeps downloaded installer ready and never falls back to stale input', async t => {
  const fixture = updaterFixture(t, {
    getCurrentWorkspaceRaw: async () => { throw new Error('cannot read saved workspace'); },
  });
  await assert.rejects(fixture.install('stale workspace'), /cannot read saved workspace/);
  assert.deepEqual(fixture.calls, ['download']);
  assert.equal(fixture.getStatus().state, 'downloaded');
  assert.equal(fixture.scheduled.length, 0);
});

test('unwritable recovery receipt prevents installation and preserves verified backup for retry', async t => {
  const fixture = updaterFixture(t);
  fs.mkdirSync(path.join(fixture.directory, 'installed-update-recovery.json'));
  await assert.rejects(fixture.install('workspace'));
  assert.equal(fixture.getStatus().state, 'downloaded');
  assert.equal(fixture.scheduled.length, 0);
  assert.equal(fixture.calls.some(value => Array.isArray(value) && value[0] === 'backup'), true);
});

test('failed installer launch leaves recovery details available after the app remains open', async t => {
  const fixture = updaterFixture(t);
  fixture.updater.quitAndInstall = () => { throw new Error('installer launch failed'); };
  await fixture.install('workspace');
  fixture.scheduled[0]();
  assert.equal(fixture.getStatus().state, 'error');
  assert.equal(fixture.getStatus().recovery_backup_id, backup.id);
  assert.equal(readInstalledUpdateAttempt(fixture.directory, '0.5.0').state, 'incomplete');
});

test('late updater failure after backup cancels the queued installer restart', async t => {
  const fixture = updaterFixture(t);
  await fixture.install('workspace');
  fixture.updater.emit('error', new Error('late installer verification failure'));
  fixture.scheduled[0]();
  assert.equal(fixture.getStatus().state, 'error');
  assert.equal(fixture.calls.some(value => Array.isArray(value) && value[0] === 'install'), false);
});

test('another update check cannot interrupt the prepared installer restart', async t => {
  const fixture = updaterFixture(t);
  let checks = 0;
  fixture.updater.checkForUpdates = async () => { checks += 1; };
  await fixture.install('workspace');
  await fixture.handlers.get('rqk:check-updates')();
  assert.equal(checks, 0);
  assert.equal(fixture.getStatus().state, 'installing');
  fixture.scheduled[0]();
  assert.deepEqual(fixture.calls.at(-1), ['install', true, true]);
});

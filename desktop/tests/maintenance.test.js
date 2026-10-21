'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createBackup, listBackups } = require('../backup');
const { beginWorkspaceRestore, readPendingWorkspaceRestore } = require('../restoreJournal');
const { EMPTY_WORKSPACE } = require('../workspaceSnapshot');
const { registerDesktopMaintenance, recoverPendingRestore, RECOVERY_URL } = require('../maintenance');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'keeper-maintenance-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const data = new Map([['rqk.desktopWorkspace.v1', EMPTY_WORKSPACE], ['rook-theme', 'original'], ['auth_token', 'private sentinel']]);
  let writable = true;
  const localStorage = { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (!writable) throw new Error('Storage unavailable'); data.set(key, value); },
    removeItem: key => { if (!writable) throw new Error('Storage unavailable'); data.delete(key); } };
  const contents = { isDestroyed: () => false, getURL: () => 'rqk://desktop/home',
    executeJavaScript: async expression => JSON.parse(JSON.stringify(vm.runInNewContext(expression, { localStorage }))),
    session: { flushStorageData() {} }, setWindowOpenHandler() {} };
  const window = { webContents: contents, isDestroyed: () => false };
  const handlers = new Map();
  const app = { getPath: () => directory };
  registerDesktopMaintenance({ app, ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    dialog: {}, getPrimaryWindow: () => window, portable: false });
  const event = { sender: contents };
  return { directory, data, app, window, contents, setWritable: value => { writable = value; },
    call: (name, ...args) => handlers.get(`rqk:${name}`)(event, ...args) };
}

test('native backups and restores preserve supplemental values and never include authentication', async t => {
  const f = fixture(t);
  const saved = await f.call('create-backup', 'stale click-time value', 'manual');
  const folder = path.join(f.directory, 'workspace-backups', saved.id);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'browser-storage.json'), 'utf8')), { 'rook-theme': 'original' });
  f.data.set('rook-theme', 'changed');
  f.data.set('smart-sessions-new', '[1]');
  const result = await f.call('restore-backup', saved.id, 'stale');
  assert.equal(result.workspace_saved, true);
  assert.equal(f.data.get('rook-theme'), 'original');
  assert.equal(f.data.has('smart-sessions-new'), false);
  assert.equal(f.data.get('auth_token'), 'private sentinel');
  assert.equal(readPendingWorkspaceRestore(f.directory), null);
  assert.equal(listBackups(f.directory).find(item => item.id === result.safety_backup.id).browser_storage_version, 1);
});

test('failed native commit retains the recovery journal until a subsequent startup restores the safety snapshot', async t => {
  const f = fixture(t);
  const saved = createBackup(f.directory, EMPTY_WORKSPACE, 'manual', { 'rook-theme': 'incoming' });
  f.setWritable(false);
  await assert.rejects(f.call('restore-backup', saved.id, EMPTY_WORKSPACE), /Close and reopen Keeper/);
  assert.ok(readPendingWorkspaceRestore(f.directory));
  f.setWritable(true);
  class RecoveryWindow {
    constructor() { this.webContents = f.contents; }
    isDestroyed() { return false; }
    destroy() {}
    async loadURL(url) { assert.equal(url, RECOVERY_URL); }
  }
  assert.equal(await recoverPendingRestore({ app: f.app, BrowserWindow: RecoveryWindow }), true);
  assert.equal(f.data.get('rook-theme'), 'original');
  assert.equal(f.data.get('rqk.desktopWorkspace.v1'), EMPTY_WORKSPACE);
  assert.equal(f.data.get('auth_token'), 'private sentinel');
  assert.equal(readPendingWorkspaceRestore(f.directory), null);
});

test('startup recovery replaces partially written browser/media state before opening the app', async t => {
  const f = fixture(t);
  const media = path.join(f.directory, 'campaign-packs', 'pack', 'map.png');
  fs.mkdirSync(path.dirname(media), { recursive: true });
  fs.writeFileSync(media, 'original map');
  const safety = createBackup(f.directory, EMPTY_WORKSPACE, 'before-restore', { 'rook-theme': 'original' });
  beginWorkspaceRestore(f.directory, safety.id);
  fs.writeFileSync(media, 'partial imported map');
  f.data.set('rqk.desktopWorkspace.v1', 'partial browser write');
  f.data.set('rook-theme', 'partial theme');
  f.data.set('soundboard-custom-partial', '["partial"]');
  class RecoveryWindow {
    constructor() { this.webContents = f.contents; }
    isDestroyed() { return false; }
    destroy() {}
    async loadURL(url) { assert.equal(url, RECOVERY_URL); }
  }
  await recoverPendingRestore({ app: f.app, BrowserWindow: RecoveryWindow });
  assert.equal(fs.readFileSync(media, 'utf8'), 'original map');
  assert.equal(f.data.get('rqk.desktopWorkspace.v1'), EMPTY_WORKSPACE);
  assert.equal(f.data.get('rook-theme'), 'original');
  assert.equal(f.data.has('soundboard-custom-partial'), false);
  assert.equal(f.data.get('auth_token'), 'private sentinel');
});

test('a pending restore blocks backup/import/update mutations without overwriting its recovery record', async t => {
  const f = fixture(t);
  const safety = createBackup(f.directory, EMPTY_WORKSPACE, 'before-restore', {});
  const receipt = beginWorkspaceRestore(f.directory, safety.id);
  await assert.rejects(f.call('create-backup', EMPTY_WORKSPACE), /Finish recovery/);
  assert.equal(readPendingWorkspaceRestore(f.directory).id, receipt.id);
});

test('an autosave during media preparation is kept while only old media is restored', async t => {
  const f = fixture(t);
  const media = path.join(f.directory, 'campaign-packs', 'pack', 'map.png');
  fs.mkdirSync(path.dirname(media), { recursive: true });
  fs.writeFileSync(media, 'backup map');
  const saved = createBackup(f.directory, EMPTY_WORKSPACE, 'manual', { 'rook-theme': 'imported' });
  fs.writeFileSync(media, 'current map');
  const evaluate = f.contents.executeJavaScript;
  let changed = false;
  f.contents.executeJavaScript = async expression => {
    if (!changed && expression.includes('function replaceTask')) {
      changed = true;
      f.data.set('rook-theme', 'newer autosaved value');
    }
    return evaluate(expression);
  };
  await assert.rejects(f.call('restore-backup', saved.id, EMPTY_WORKSPACE), /Newer saved values were kept/);
  assert.equal(f.data.get('rook-theme'), 'newer autosaved value');
  assert.equal(fs.readFileSync(media, 'utf8'), 'current map');
  assert.equal(readPendingWorkspaceRestore(f.directory), null);
});

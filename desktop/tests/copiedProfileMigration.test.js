'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createCopiedProfileBackup, inspectOrdinaryTree, copyOrdinaryTree, browserReadExpression } = require('../copiedProfileMigration');
const { previewPortableBackup, restorePortableBackup } = require('../backup');

const raw = JSON.stringify({
  version: 1, campaigns: [{ id: 'copied-campaign', name: 'Synthetic copied campaign' }],
  characters: [{ id: 'copied-character', current_hp: 7, resources: { arrows: 3 } }],
  collections: {}, notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [],
});
const entries = {
  'rqk.desktopWorkspace.v1': raw,
  'gm.activeCombat.copied-campaign': '{"round":3,"combatants":[{"id":"copy-combatant","hp":7}]}',
  'soundboard-custom-copied-campaign': '[{"id":"copy-song","src":"data:audio/mp3;base64,c29uZw=="}]',
  'rook-theme': 'guild-ledger',
  'dm_token': 'SYNTHETIC-AUTH-VALUE-NEVER-READ',
  'unknown.private.key': 'SYNTHETIC-UNKNOWN-VALUE-NEVER-READ',
};

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-copied-profile-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'Earlier Keeper COPY', 'RookieQuestKeeperData');
  const localStorage = path.join(source, 'session-data', 'Local Storage');
  fs.mkdirSync(path.join(localStorage, 'leveldb'), { recursive: true });
  fs.writeFileSync(path.join(localStorage, 'leveldb', '000001.ldb'), 'synthetic closed browser database bytes');
  fs.writeFileSync(path.join(localStorage, 'leveldb', 'LOCK'), '');
  const media = path.join(source, 'campaign-packs', 'test-pack');
  fs.mkdirSync(media, { recursive: true });
  fs.writeFileSync(path.join(media, 'map.png'), 'synthetic imported map bytes');
  fs.writeFileSync(path.join(source, 'do-not-touch.txt'), 'unrelated original data');
  const destination = path.join(root, 'exports');
  const current = path.join(root, 'installed-data');
  const temp = path.join(root, 'temp');
  for (const directory of [destination, current, temp]) fs.mkdirSync(directory);
  const app = { getPath: name => name === 'userData' ? current : name === 'temp' ? temp : null };
  return { root, source, localStorage, media, destination, current, temp, app };
}

function fakeElectron(f, options = {}) {
  const reads = [];
  const calls = {};
  const keys = Object.keys(entries);
  const storage = {
    length: keys.length,
    key: index => keys[index],
    getItem: key => {
      reads.push(key);
      if (key === 'dm_token' || key === 'unknown.private.key') throw new Error('An unknown value must never be read.');
      return entries[key] ?? null;
    },
  };
  let fromPath;
  const isolated = {
    setPermissionRequestHandler: callback => { calls.permissionRequest = callback; },
    setPermissionCheckHandler: callback => { calls.permissionCheck = callback; },
    setDevicePermissionHandler: callback => { calls.devicePermission = callback; },
    on: (name, callback) => { calls[name] = callback; },
    webRequest: { onBeforeRequest: callback => { calls.request = callback; } },
    protocol: { handle: (scheme, callback) => { calls.protocol = { scheme, callback }; }, unhandle: () => { calls.unhandled = true; } },
    clearStorageData: async () => { calls.cleared = true; },
    closeAllConnections: async () => { calls.closedConnections = true; },
  };
  const session = { fromPath: directory => {
    fromPath = directory;
    assert.equal(path.relative(f.temp, directory).startsWith('..'), false, 'Chromium must open only the isolated temporary copy.');
    assert.notEqual(directory, path.join(f.source, 'session-data'));
    fs.writeFileSync(path.join(directory, 'Local Storage', 'leveldb', 'LOG'), 'Chromium writes here, never in source');
    return isolated;
  } };
  class BrowserWindow {
    constructor(configuration) {
      calls.window = configuration;
      this.destroyed = false;
      this.webContents = {
        setWindowOpenHandler: callback => { calls.windowOpen = callback; },
        on: (name, callback) => { calls[name] = callback; },
        executeJavaScript: async expression => {
          if (options.onRead) options.onRead();
          // Electron serializes renderer results across the process boundary.
          return JSON.parse(JSON.stringify(vm.runInNewContext(expression, { localStorage: storage })));
        },
      };
    }
    async loadURL(url) { calls.loaded = url; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; calls.destroyed = true; }
  }
  return { BrowserWindow, session, calls, reads, getSessionPath: () => fromPath };
}

test('copies closed profile/media, exports supported exact records, never reads unknown values or edits source', async t => {
  const f = fixture(t);
  const before = inspectOrdinaryTree(f.source);
  const electron = fakeElectron(f);
  const result = await createCopiedProfileBackup({
    sourceDataRoot: f.source, destinationDir: f.destination, app: f.app, ...electron,
  });
  assert.deepEqual(inspectOrdinaryTree(f.source), before);
  assert.equal(result.preview.browser_storage_available, true);
  assert.equal(result.preview.browser_storage_key_count, 3);
  assert.equal(result.omitted_key_count, 2);
  assert.deepEqual(result.omitted_keys, ['dm_token', 'unknown.private.key']);
  assert.equal(electron.reads.includes('dm_token'), false);
  assert.equal(electron.reads.includes('unknown.private.key'), false);
  const restored = restorePortableBackup(path.join(f.root, 'restored'), result.export_path, null);
  assert.equal(restored.workspace, raw);
  assert.deepEqual(restored.browser_storage, {
    'gm.activeCombat.copied-campaign': entries['gm.activeCombat.copied-campaign'],
    'rook-theme': 'guild-ledger',
    'soundboard-custom-copied-campaign': entries['soundboard-custom-copied-campaign'],
  });
  assert.equal(fs.readFileSync(path.join(f.root, 'restored', 'campaign-packs', 'test-pack', 'map.png'), 'utf8'), 'synthetic imported map bytes');
  assert.deepEqual(fs.readdirSync(f.temp), []);
  assert.equal(result.temporary_cleanup_pending, false);
  assert.equal(electron.calls.window.show, false);
  assert.equal(electron.calls.window.webPreferences.nodeIntegration, false);
  assert.equal(electron.calls.window.webPreferences.sandbox, true);
  assert.equal(electron.calls.window.webPreferences.preload, undefined);
  assert.deepEqual(electron.calls.windowOpen(), { action: 'deny' });
  assert.equal(electron.calls.permissionCheck(), false);
  let allowed;
  electron.calls.permissionRequest(null, null, value => { allowed = value; });
  assert.equal(allowed, false);
  let cancelled;
  electron.calls.request({ url: 'https://example.test/' }, value => { cancelled = value.cancel; });
  assert.equal(cancelled, true);
  electron.calls.request({ url: electron.calls.loaded }, value => { cancelled = value.cancel; });
  assert.equal(cancelled, false);
  const response = electron.calls.protocol.callback({ url: electron.calls.loaded });
  assert.match(response.headers.get('Content-Security-Policy'), /script-src 'none'/);
  assert.equal(electron.calls.cleared, true);
  assert.equal(electron.calls.destroyed, true);
  assert.equal(previewPortableBackup(result.export_path).checksummed, true);
});

test('an externally changed selected copy is refused without exporting or editing it', async t => {
  const f = fixture(t);
  const changed = path.join(f.localStorage, 'leveldb', '000001.ldb');
  const electron = fakeElectron(f, { onRead: () => fs.writeFileSync(changed, 'external change during inspection') });
  await assert.rejects(createCopiedProfileBackup({ sourceDataRoot: f.source, destinationDir: f.destination, app: f.app, ...electron }), /selected copy changed/i);
  assert.equal(fs.readFileSync(changed, 'utf8'), 'external change during inspection');
  assert.deepEqual(fs.readdirSync(f.destination), []);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('refuses media directory junctions before Chromium opens the temporary copy', async t => {
  const f = fixture(t);
  const linked = path.join(f.source, 'campaign-packs', 'unsafe-pack');
  fs.symlinkSync(f.destination, linked, 'junction');
  const electron = fakeElectron(f);
  await assert.rejects(createCopiedProfileBackup({ sourceDataRoot: f.source, destinationDir: f.destination, app: f.app, ...electron }), /link or junction/);
  assert.equal(electron.getSessionPath(), undefined);
  assert.deepEqual(fs.readdirSync(f.destination), []);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('refuses a destination inside the selected copy and the running application data', async t => {
  const f = fixture(t);
  const electron = fakeElectron(f);
  await assert.rejects(createCopiedProfileBackup({ sourceDataRoot: f.source, destinationDir: f.source, app: f.app, ...electron }), /separate earlier-Keeper copy/);
  await assert.rejects(createCopiedProfileBackup({ sourceDataRoot: f.source, destinationDir: f.current, app: f.app, ...electron }), /separate earlier-Keeper copy/);
  assert.equal(electron.getSessionPath(), undefined);
});

test('copy checks file size/bytes and preserves empty directories', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.media, 'empty'));
  const destination = path.join(f.root, 'safe-copy');
  const digests = copyOrdinaryTree(f.media, destination);
  assert.deepEqual(inspectOrdinaryTree(destination), digests);
  assert.equal(fs.statSync(path.join(destination, 'empty')).isDirectory(), true);
  assert.throws(() => inspectOrdinaryTree(f.media, 1), /inspection limit/);
});

test('browser extraction selects allowed names before fetching values and keeps strings exact', () => {
  const keys = Object.keys(entries);
  const reads = [];
  const result = vm.runInNewContext(browserReadExpression(), { localStorage: {
    length: keys.length, key: index => keys[index], getItem: key => { reads.push(key); return entries[key]; },
  } });
  assert.equal(result.workspace, raw);
  assert.equal(result.browser_storage['gm.activeCombat.copied-campaign'], entries['gm.activeCombat.copied-campaign']);
  assert.equal(reads.some(key => key === 'dm_token' || key === 'unknown.private.key'), false);
});

'use strict';

// Runs in a fresh real Electron process. Only synthetic profiles are created;
// the extraction mode opens Chromium on an isolated copy, never the source.
const { app, BrowserWindow, session, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createCopiedProfileBackup } = require('../copiedProfileMigration');
const { restorePortableBackup } = require('../backup');

const mode = process.argv[2];
const root = path.resolve(process.argv[3] || '');
if (!['seed', 'extract'].includes(mode) || !process.argv[3]) throw new Error('A synthetic smoke mode and temporary root are required.');
const source = path.join(root, 'Earlier Keeper COPY', 'RookieQuestKeeperData');
const current = path.join(root, mode + '-application-data');
const temporary = path.join(root, 'isolated-temporary');
for (const directory of [source, current, temporary]) fs.mkdirSync(directory, { recursive: true });
app.setPath('userData', current);
app.setPath('temp', temporary);
protocol.registerSchemesAsPrivileged([{ scheme: 'rqk', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const workspace = JSON.stringify({
  version: 1,
  campaigns: [{ id: 'copied-smoke-campaign', name: 'Synthetic copied-profile campaign' }],
  characters: [{ id: 'copied-smoke-character', campaign_id: 'copied-smoke-campaign', current_hp: 7, resources: { arrows: 3 } }],
  collections: { 'copied-smoke-campaign': { npcs: [{ id: 'copied-smoke-npc', current_hp: 11 }] } },
  notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [],
});
const extras = {
  'gm.activeCombat.copied-smoke-campaign': '{"round":3,"combatants":[{"id":"copied-smoke-npc","hp":11}]}',
  'soundboard-custom-copied-smoke-campaign': '[{"id":"copied-smoke-song","src":"data:audio/mp3;base64,c29uZw=="}]',
  'rqk.gm.assets.copied-smoke-campaign': '[{"id":"copied-smoke-asset","url":"rqk-attachment://smoke/map.png"}]',
  'rook-theme': 'guild-ledger',
};
const key = 'rqk.desktopWorkspace.v1';
const timer = setTimeout(() => { console.error('Copied-profile Electron smoke timed out.'); app.exit(1); }, 45000);
let failed = false;
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  if (mode === 'seed') {
    const sessionRoot = path.join(source, 'session-data');
    fs.mkdirSync(sessionRoot, { recursive: true });
    const seedSession = session.fromPath(sessionRoot, { cache: false });
    seedSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: details.url !== 'rqk://desktop/seed' }));
    seedSession.protocol.handle('rqk', () => new Response('<!doctype html><html><body></body></html>', { headers: {
      'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'none'; script-src 'none'; connect-src 'none'",
    } }));
    const window = new BrowserWindow({ show: false, webPreferences: { session: seedSession, sandbox: true, nodeIntegration: false, contextIsolation: true } });
    await window.loadURL('rqk://desktop/seed');
    const values = { [key]: workspace, ...extras, dm_token: 'SYNTHETIC-ACCOUNT-TOKEN-EXCLUDED', 'unknown.custom.key': 'SYNTHETIC-UNKNOWN-VALUE-EXCLUDED' };
    await window.webContents.executeJavaScript(`Object.entries(${JSON.stringify(values)}).forEach(([key, value]) => localStorage.setItem(key, value))`);
    seedSession.flushStorageData(); // Request flush; clean process exit closes LevelDB.
    const media = path.join(source, 'campaign-packs', 'smoke');
    fs.mkdirSync(media, { recursive: true });
    fs.writeFileSync(path.join(media, 'map.png'), 'synthetic copied profile map');
    fs.writeFileSync(path.join(source, 'original-sentinel.txt'), 'must never change');
    window.destroy();
  } else {
    const destination = path.join(root, 'exports');
    fs.mkdirSync(destination);
    const result = await createCopiedProfileBackup({ sourceDataRoot: source, destinationDir: destination, app, BrowserWindow, session });
    assert.equal(result.preview.browser_storage_available, true);
    assert.equal(result.preview.browser_storage_key_count, Object.keys(extras).length);
    assert.equal(result.omitted_key_count, 2);
    assert.deepEqual(result.omitted_keys, ['dm_token', 'unknown.custom.key']);
    const restored = restorePortableBackup(path.join(root, 'restored-data'), result.export_path, null);
    assert.equal(restored.workspace, workspace);
    assert.deepEqual(restored.browser_storage, extras);
    assert.equal(fs.readFileSync(path.join(root, 'restored-data', 'campaign-packs', 'smoke', 'map.png'), 'utf8'), 'synthetic copied profile map');
    fs.writeFileSync(path.join(root, 'extract-result.json'), JSON.stringify({
      browser_storage_key_count: result.preview.browser_storage_key_count,
      omitted_key_count: result.omitted_key_count,
      workspace_and_extra_values_exact: true,
      media_exact: true,
      temporary_cleanup_pending: result.temporary_cleanup_pending,
    }));
  }
}).catch(error => {
  failed = true;
  console.error(String(error.stack || error));
}).finally(() => {
  clearTimeout(timer);
  if (failed) app.exit(1);
  else app.quit();
});

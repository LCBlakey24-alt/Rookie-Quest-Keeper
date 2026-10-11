'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBackup, listBackups, restoreBackup, checkWorkspace } = require('../backup');

function workspace(name) {
  return JSON.stringify({
    version: 1, campaigns: [{ id: 'eldritch-heralds', name }],
    characters: [], collections: {}, notes: [], recaps: [],
    receipts: {}, objects: {}, homebrew: [],
  });
}

function withAppData(task) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-backup-test-'));
  try { task(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('snapshot keeps imported attachments alongside workspace and can restore both', () => withAppData(root => {
  const source = path.join(root, 'campaign-packs', 'tia-karta');
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'map.jpg'), 'original private map');
  const original = workspace('Original Eldritch Heralds');
  const created = createBackup(root, original, 'manual');
  assert.equal(created.campaign_count, 1);
  assert.equal(listBackups(root)[0].id, created.id);

  fs.writeFileSync(path.join(source, 'map.jpg'), 'new map');
  const changed = workspace('Updated Campaign');
  const result = restoreBackup(root, created.id, changed);
  assert.equal(result.workspace, original);
  assert.equal(fs.readFileSync(path.join(source, 'map.jpg'), 'utf8'), 'original private map');
  assert.equal(result.safety_backup.reason, 'before-restore');
  assert.equal(listBackups(root).length, 2);
  const safety = restoreBackup(root, result.safety_backup.id, null);
  assert.equal(safety.workspace, changed);
}));

test('invalid saved workspaces never replace existing backups or state', () => withAppData(root => {
  assert.throws(() => checkWorkspace('not json'), /valid JSON/);
  assert.throws(() => createBackup(root, '{"version":1}', 'before-update'), /recognised Keeper workspace/);
  assert.deepEqual(listBackups(root), []);
  assert.throws(() => restoreBackup(root, '../secrets', workspace('Keep')), /Invalid backup selection/);
}));

test('corrupt backup blocks restore BEFORE the current workspace is changed', () => withAppData(root => {
  const created = createBackup(root, workspace('Good'), 'manual');
  fs.writeFileSync(path.join(root, 'workspace-backups', created.id, 'workspace.json'), 'broken json');
  assert.throws(() => restoreBackup(root, created.id, workspace('Current')), /not valid JSON/);
  assert.equal(listBackups(root).length, 1);
}));

test('backup identifiers are distinct and a failed backup does not delete older ones', () => withAppData(root => {
  const a = createBackup(root, workspace('One'), 'before-update');
  const b = createBackup(root, workspace('Two'), 'before-update');
  assert.notEqual(a.id, b.id);
  assert.equal(listBackups(root).length, 2);
  assert.throws(() => createBackup(root, '', 'before-update'), /No saved workspace/);
  assert.equal(listBackups(root).length, 2);
}));

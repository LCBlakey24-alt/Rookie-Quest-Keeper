'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { commitRestoredWorkspace } = require('../workspaceRestore');
const { createBackup, listBackups, restoreBackup, exportPortableBackup, restorePortableBackup } = require('../backup');

function workspace(name, hp) {
  return JSON.stringify({
    version: 1, campaigns: [{ id: 'campaign-keep-id', name }],
    characters: [{ id: 'character-keep-id', campaign_id: 'campaign-keep-id', current_hp: hp }],
    collections: {}, notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [],
  });
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-workspace-commit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const userData = path.join(directory, 'new-installed-data');
  const image = path.join(userData, 'campaign-packs', 'campaign-keep-id', 'map.png');
  fs.mkdirSync(path.dirname(image), { recursive: true });
  return { directory, userData, image };
}

test('successful restore waits for saved workspace and marks it committed', async t => {
  const { userData, image } = fixture(t);
  const imported = workspace('Imported campaign', 11);
  fs.writeFileSync(image, 'imported map bytes');
  const saved = createBackup(userData, imported, 'manual');
  const current = workspace('Current campaign', 7);
  fs.writeFileSync(image, 'current map bytes');
  const result = restoreBackup(userData, saved.id, current);
  let persisted = current;
  let recovered = false;
  const committed = await commitRestoredWorkspace({
    result,
    commitWorkspace: async raw => { await Promise.resolve(); persisted = raw; },
    restoreSafetyBackup: () => { recovered = true; },
  });
  assert.equal(committed.workspace_saved, true);
  assert.equal(persisted, imported);
  assert.equal(fs.readFileSync(image, 'utf8'), 'imported map bytes');
  assert.equal(recovered, false);
  assert.equal(listBackups(userData).some(item => item.id === result.safety_backup.id), true);
});

test('quota failure after backup restore restores previous map bytes and retains the safety snapshot', async t => {
  const { userData, image } = fixture(t);
  const imported = workspace('Imported campaign', 11);
  fs.writeFileSync(image, 'imported map bytes');
  const saved = createBackup(userData, imported, 'manual');
  const current = workspace('Current campaign', 7);
  fs.writeFileSync(image, 'current map bytes');
  const result = restoreBackup(userData, saved.id, current);
  assert.equal(fs.readFileSync(image, 'utf8'), 'imported map bytes');
  let persisted = current;
  let rollbackId;
  await assert.rejects(commitRestoredWorkspace({
    result,
    commitWorkspace: async () => { throw new DOMException('Storage quota exhausted', 'QuotaExceededError'); },
    restoreSafetyBackup: id => {
      rollbackId = id;
      return restoreBackup(userData, id, null);
    },
  }), /previous campaign media was restored/);
  assert.equal(rollbackId, result.safety_backup.id);
  assert.equal(persisted, current);
  assert.equal(fs.readFileSync(image, 'utf8'), 'current map bytes');
  assert.equal(listBackups(userData).length, 2);
  const retained = path.join(userData, 'workspace-backups', result.safety_backup.id);
  assert.equal(fs.readFileSync(path.join(retained, 'workspace.json'), 'utf8'), current);
  assert.equal(fs.readFileSync(path.join(retained, 'campaign-packs', 'campaign-keep-id', 'map.png'), 'utf8'), 'current map bytes');
});

test('failed portable migration commit recovers current media without altering the exported source', async t => {
  const { directory, userData, image } = fixture(t);
  const source = path.join(directory, 'old-disposable-installation');
  const sourceImage = path.join(source, 'campaign-packs', 'campaign-keep-id', 'map.png');
  fs.mkdirSync(path.dirname(sourceImage), { recursive: true });
  fs.writeFileSync(sourceImage, 'exported source map');
  const exportDirectory = path.join(directory, 'exports');
  fs.mkdirSync(exportDirectory);
  const imported = workspace('Earlier Keeper campaign', 11);
  const exported = exportPortableBackup(source, imported, exportDirectory);
  const exportedWorkspace = path.join(exported.export_path, 'workspace.json');
  const beforeSource = fs.readFileSync(exportedWorkspace, 'utf8');
  const current = workspace('New installation campaign', 7);
  fs.writeFileSync(image, 'new installation map');
  const result = restorePortableBackup(userData, exported.export_path, current);
  await assert.rejects(commitRestoredWorkspace({
    result,
    commitWorkspace: () => { throw new Error('Cannot save workspace'); },
    restoreSafetyBackup: id => restoreBackup(userData, id, null),
  }), /previous campaign media was restored/);
  assert.equal(fs.readFileSync(image, 'utf8'), 'new installation map');
  assert.equal(fs.readFileSync(sourceImage, 'utf8'), 'exported source map');
  assert.equal(fs.readFileSync(exportedWorkspace, 'utf8'), beforeSource);
  assert.equal(listBackups(userData).length, 1);
});

test('failed workspace commit without a safety snapshot reports that recovery needs review', async () => {
  let recovered = false;
  await assert.rejects(commitRestoredWorkspace({
    result: { workspace: workspace('Imported', 11), safety_backup: null },
    commitWorkspace: () => { throw new Error('Storage unavailable'); },
    restoreSafetyBackup: () => { recovered = true; },
  }), /No safety backup was available/);
  assert.equal(recovered, false);
});

test('failed automatic media rollback reports the retained recovery backup and never reports success', async t => {
  const { userData, image } = fixture(t);
  const current = workspace('Current', 7);
  fs.writeFileSync(image, 'current map');
  const safety = createBackup(userData, current, 'before-restore');
  await assert.rejects(commitRestoredWorkspace({
    result: { workspace: workspace('Imported', 11), safety_backup: safety },
    commitWorkspace: () => { throw new Error('Storage unavailable'); },
    restoreSafetyBackup: async () => { throw new Error('Windows has locked the map'); },
  }), error => {
    assert.match(error.message, /automatic media recovery could not finish/);
    assert.equal(error.recovery_backup_id, safety.id);
    return true;
  });
  assert.equal(listBackups(userData).some(item => item.id === safety.id), true);
});

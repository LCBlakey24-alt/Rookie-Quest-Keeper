'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { createBackup, listBackups, restoreBackup, checkWorkspace, exportPortableBackup, previewPortableBackup, restorePortableBackup, recoverInterruptedMediaRestore } = require('../backup');

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

test('portable backup can move to another laptop without losing imported maps', () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-userdata-'));
  const usbFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-portable-'));
  const newLaptop = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-new-laptop-'));
  try {
    const image = path.join(userData, 'campaign-packs', 'tia-karta', 'map.jpg');
    fs.mkdirSync(path.dirname(image), { recursive: true });
    fs.writeFileSync(image, 'original private map');
    const created = exportPortableBackup(userData, workspace('Tia Karta'), usbFolder);
    assert.equal(fs.existsSync(path.join(created.export_path, 'manifest.json')), true);
    assert.equal(fs.readFileSync(path.join(created.export_path, 'campaign-packs', 'tia-karta', 'map.jpg'), 'utf8'), 'original private map');
    const restored = restorePortableBackup(newLaptop, created.export_path, workspace('Current laptop'));
    assert.equal(JSON.parse(restored.workspace).campaigns[0].name, 'Tia Karta');
    assert.equal(fs.readFileSync(path.join(newLaptop, 'campaign-packs', 'tia-karta', 'map.jpg'), 'utf8'), 'original private map');
    assert.equal(restored.safety_backup.reason, 'before-restore');
  } finally {
    for (const folder of [userData, usbFolder, newLaptop]) fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('portable recovery rejects corrupt copies and media links before changing active data', () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-userdata-'));
  const usbFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-portable-'));
  try {
    const created = exportPortableBackup(userData, workspace('Original'), usbFolder);
    const saved = path.join(created.export_path, 'workspace.json');
    fs.writeFileSync(saved, '{bad json');
    assert.throws(() => restorePortableBackup(userData, created.export_path, workspace('Keep me')), /valid JSON/);
    assert.equal(listBackups(userData).length, 1);
    fs.writeFileSync(saved, workspace('Valid'));
    if (process.platform !== 'win32') {
      // Standard Windows CI accounts usually lack symbolic-link privileges.
      const media = path.join(created.export_path, 'campaign-packs');
      fs.mkdirSync(media);
      fs.symlinkSync(path.join(userData, 'workspace-backups'), path.join(media, 'unsafe'));
      assert.throws(() => restorePortableBackup(userData, created.export_path, workspace('Keep me')), /unsafe media link/);
    }
    assert.equal(listBackups(userData).length, 1);
    assert.throws(() => exportPortableBackup(userData, workspace('Keep me'), userData), /outside Keeper application data/);
  } finally {
    for (const folder of [userData, usbFolder]) fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('0.4.x to installed 0.5.x migration previews a verified backup and leaves original folder unchanged', () => {
  const oldData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-old-portable-'));
  const exports = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-old-export-'));
  const installedData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-new-installed-'));
  try {
    const raw = JSON.stringify({
      version: 1,
      campaigns: [{ id: 'campaign-one', name: 'Synthetic first campaign' }, { id: 'campaign-two', name: 'Synthetic second campaign' }],
      characters: [{ id: 'test-character', campaign_id: 'campaign-one', name: 'Test adventurer' }],
      collections: { 'campaign-one': { npcs: [{ id: 'test-npc', name: 'Test NPC' }], maps: [{ id: 'test-map', title: 'Synthetic map' }] } },
      notes: [{ id: 'note-one', campaign_id: 'campaign-one', content: 'Test note' }],
      recaps: [], receipts: {}, objects: {}, homebrew: [],
    });
    const media = path.join(oldData, 'campaign-packs', 'test-pack');
    fs.mkdirSync(media, { recursive: true });
    fs.writeFileSync(path.join(media, 'map.png'), 'synthetic map bytes');
    fs.writeFileSync(path.join(media, 'song.mp3'), 'synthetic mp3 bytes');
    const saved = exportPortableBackup(oldData, raw, exports);
    const before = fs.readFileSync(path.join(saved.export_path, 'workspace.json'));
    const preview = previewPortableBackup(saved.export_path);
    assert.equal(preview.checksummed, true);
    assert.equal(preview.backup_id, saved.id);
    assert.equal(preview.campaign_count, 2);
    assert.equal(preview.character_count, 1);
    assert.equal(preview.note_count, 1);
    assert.equal(preview.media_file_count, 2);
    assert.equal(fs.readdirSync(installedData).length, 0, 'preview must not create target files');
    const restored = restorePortableBackup(installedData, saved.export_path, workspace('Empty installed Keeper'));
    assert.equal(restored.workspace, raw);
    assert.equal(restored.safety_backup.reason, 'before-restore');
    assert.equal(fs.readFileSync(path.join(installedData, 'campaign-packs', 'test-pack', 'song.mp3'), 'utf8'), 'synthetic mp3 bytes');
    assert.deepEqual(fs.readFileSync(path.join(saved.export_path, 'workspace.json')), before);
    assert.equal(fs.readFileSync(path.join(oldData, 'campaign-packs', 'test-pack', 'map.png'), 'utf8'), 'synthetic map bytes');
  } finally {
    for (const folder of [oldData, exports, installedData]) fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('migration preview rejects changed backup media and never writes installed Keeper files', () => {
  const oldData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-old-portable-'));
  const exports = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-old-export-'));
  const installedData = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-new-installed-'));
  try {
    const media = path.join(oldData, 'campaign-packs', 'private-test');
    fs.mkdirSync(media, { recursive: true });
    fs.writeFileSync(path.join(media, 'map.png'), 'original bytes');
    const saved = exportPortableBackup(oldData, workspace('Synthetic campaign'), exports);
    fs.writeFileSync(path.join(saved.export_path, 'campaign-packs', 'private-test', 'map.png'), 'tampered bytes');
    assert.throws(() => previewPortableBackup(saved.export_path), /checksum verification failed/);
    assert.equal(fs.readdirSync(installedData).length, 0);
  } finally {
    for (const folder of [oldData, exports, installedData]) fs.rmSync(folder, { recursive: true, force: true });
  }
});


test('checksums are independent of manifest key order and preview binds all media bytes', () => withAppData(root => {
  const originalData = path.join(root, 'old');
  const destination = path.join(root, 'exports');
  const media = path.join(originalData, 'campaign-packs', 'map.png');
  fs.mkdirSync(path.dirname(media), { recursive: true });
  fs.mkdirSync(destination);
  fs.writeFileSync(media, 'original map');
  const saved = exportPortableBackup(originalData, workspace('Original'), destination);
  const first = previewPortableBackup(saved.export_path);
  const manifestFile = path.join(saved.export_path, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.sha256 = Object.fromEntries(Object.entries(manifest.sha256).reverse());
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.equal(previewPortableBackup(saved.export_path).backup_sha256, first.backup_sha256);
  fs.writeFileSync(path.join(saved.export_path, 'campaign-packs', 'map.png'), 'replacement map');
  manifest.sha256['campaign-packs/map.png'] = crypto.createHash('sha256').update('replacement map').digest('hex');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  const second = previewPortableBackup(saved.export_path);
  assert.equal(second.workspace_sha256, first.workspace_sha256);
  assert.notEqual(second.backup_sha256, first.backup_sha256, 'approval must bind media as well as workspace');
  const installed = path.join(root, 'installed');
  assert.throws(() => restorePortableBackup(installed, saved.export_path, workspace('Current'), first.backup_sha256), /changed since inspection/);
  assert.equal(fs.existsSync(installed), false, 'final approval mismatch must fail before creating a target or safety backup');
}));

test('failed media staging leaves active media and the exported source unchanged', () => withAppData(root => {
  const oldData = path.join(root, 'old');
  const targetData = path.join(root, 'new');
  const exports = path.join(root, 'exports');
  for (const folder of [oldData, targetData]) {
    fs.mkdirSync(path.join(folder, 'campaign-packs'), { recursive: true });
  }
  fs.mkdirSync(exports);
  fs.writeFileSync(path.join(oldData, 'campaign-packs', 'map.png'), 'old exported map');
  fs.writeFileSync(path.join(targetData, 'campaign-packs', 'map.png'), 'current working map');
  fs.writeFileSync(path.join(targetData, 'campaign-packs', 'extra.mp3'), 'keep current music');
  const saved = exportPortableBackup(oldData, workspace('Old'), exports);
  const copy = fs.cpSync;
  fs.cpSync = (source, destination, options) => {
    if (source === path.join(saved.export_path, 'campaign-packs')) {
      fs.writeFileSync(path.join(destination, 'map.png'), 'incomplete imported map');
      throw new Error('Synthetic disk-full interruption');
    }
    return copy(source, destination, options);
  };
  try {
    assert.throws(() => restorePortableBackup(targetData, saved.export_path, workspace('Current')), /disk-full interruption/);
  } finally { fs.cpSync = copy; }
  fs.cpSync = (source, destination, options) => {
    const result = copy(source, destination, options);
    if (source === path.join(saved.export_path, 'campaign-packs')) {
      fs.writeFileSync(path.join(destination, 'map.png'), 'silently damaged copied map');
    }
    return result;
  };
  try {
    assert.throws(() => restorePortableBackup(targetData, saved.export_path, workspace('Current')), /Restored media verification failed/);
  } finally { fs.cpSync = copy; }
  assert.equal(fs.readFileSync(path.join(targetData, 'campaign-packs', 'map.png'), 'utf8'), 'current working map');
  assert.equal(fs.readFileSync(path.join(targetData, 'campaign-packs', 'extra.mp3'), 'utf8'), 'keep current music');
  assert.equal(fs.readFileSync(path.join(saved.export_path, 'campaign-packs', 'map.png'), 'utf8'), 'old exported map');
  assert.equal(listBackups(targetData)[0].reason, 'before-restore');
  assert.equal(fs.readdirSync(targetData).some(name => name.endsWith('.pending')), false);
}));

test('media activation failure rolls back the current media directory', () => withAppData(root => {
  const media = path.join(root, 'campaign-packs');
  fs.mkdirSync(media);
  fs.writeFileSync(path.join(media, 'map.png'), 'old snapshot');
  const saved = createBackup(root, workspace('Old'));
  fs.writeFileSync(path.join(media, 'map.png'), 'current map');
  const rename = fs.renameSync;
  fs.renameSync = (source, destination) => {
    if (path.basename(source).startsWith('.campaign-media-restore-') && destination === media) {
      throw new Error('Synthetic Windows file lock');
    }
    return rename(source, destination);
  };
  try {
    assert.throws(() => restoreBackup(root, saved.id, workspace('Current')), /Windows file lock/);
  } finally { fs.renameSync = rename; }
  assert.equal(fs.readFileSync(path.join(media, 'map.png'), 'utf8'), 'current map');
  assert.equal(fs.readdirSync(root).some(name => name.startsWith('.campaign-media-before-restore-')), false);
}));

test('startup recovers old media when interrupted between directory renames', () => withAppData(root => {
  const retained = path.join(root, '.campaign-media-before-restore-1700000000000-1234abcd');
  fs.mkdirSync(retained);
  fs.writeFileSync(path.join(retained, 'map.png'), 'retained working map');
  assert.equal(recoverInterruptedMediaRestore(root), true);
  assert.equal(fs.readFileSync(path.join(root, 'campaign-packs', 'map.png'), 'utf8'), 'retained working map');
  assert.equal(recoverInterruptedMediaRestore(root), false);
  // An active tree always wins; never overwrite it by guessing crash timing.
  fs.mkdirSync(retained);
  fs.writeFileSync(path.join(retained, 'map.png'), 'other recovery candidate');
  assert.equal(recoverInterruptedMediaRestore(root), false);
  assert.equal(fs.readFileSync(path.join(root, 'campaign-packs', 'map.png'), 'utf8'), 'retained working map');
  assert.equal(fs.existsSync(retained), true);
}));

test('complete workspace migration retains IDs, resources and all supported record fields exactly', () => withAppData(root => {
  const source = path.join(root, 'portable');
  const destination = path.join(root, 'installed');
  const exports = path.join(root, 'exports');
  fs.mkdirSync(exports);
  const complete = JSON.stringify({
    version: 1,
    campaigns: [{ id: 'campaign-42', name: 'Synthetic campaign', current_quest_id: 'quest-7', settings: { rules: 'custom' } }],
    characters: [{ id: 'character-42', campaign_id: 'campaign-42', current_hp: 7, max_hp: 31, temp_hp: 2,
      resources: { spell_slots: { 1: { current: 0, max: 3 } }, custom: { current: 1, max: 2 } },
      inventory: [{ id: 'item-1', quantity: 0 }], notes: 'Do not reset resources' }],
    collections: { 'campaign-42': {
      npcs: [{ id: 'npc-1', notes: 'GM-only note', current_hp: 3 }],
      'custom-creatures': [{ id: 'creature-1', verified: false }],
      encounters: [{ id: 'encounter-1', combatants: [{ id: 'npc-1', hp: 3 }] }],
      quests: [{ id: 'quest-7', status: 'active', completed_steps: [0, 2] }],
      'world-maps': [{ id: 'map-1', image_url: 'rqk-attachment://test/map.png' }],
      'calendar-events': [{ id: 'event-1', day: 12 }],
    } },
    notes: [{ id: 'note-1', campaign_id: 'campaign-42', content: 'Exact saved text' }],
    recaps: [{ id: 'recap-1', content: 'Last session' }],
    receipts: { imported: { installed: true } },
    objects: { 'campaign-42/calendar': { year: 103, month: 2, day: 12 }, 'campaign-42/combat': { round: 4 } },
    homebrew: [{ id: 'homebrew-1', description: 'Exact homebrew rules' }],
    future_supported_field: { preserved_without_rewriting: true },
  });
  const media = path.join(source, 'campaign-packs', 'test');
  fs.mkdirSync(media, { recursive: true });
  fs.writeFileSync(path.join(media, 'map.png'), Buffer.from([0, 1, 127, 255]));
  const saved = exportPortableBackup(source, complete, exports);
  const restored = restorePortableBackup(destination, saved.export_path, workspace('Current'));
  assert.equal(restored.workspace, complete, 'workspace must pass through without schema rewriting or new IDs');
  assert.deepEqual(fs.readFileSync(path.join(destination, 'campaign-packs', 'test', 'map.png')), Buffer.from([0, 1, 127, 255]));
}));

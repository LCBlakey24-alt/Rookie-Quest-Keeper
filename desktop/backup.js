'use strict';

// Snapshot BOTH the renderer workspace and locally imported PDF/map attachments.
// Kept in Electron userData, never in the public source repository.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BACKUPS_DIR = 'workspace-backups';
const ATTACHMENTS_DIR = 'campaign-packs';
const MAX_WORKSPACE_BYTES = 40 * 1024 * 1024;
const BACKUP_ID = /^snapshot-[0-9]{13}-[a-f0-9]{8}$/;
const VALID_REASONS = new Set(['manual', 'before-update', 'before-restore', 'before-import']);

function checkWorkspace(raw) {
  if (typeof raw !== 'string' || !raw.length) throw new Error('No saved workspace data to back up.');
  if (Buffer.byteLength(raw, 'utf8') > MAX_WORKSPACE_BYTES) throw new Error('Saved workspace exceeds the 40 MB backup limit.');
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error('Saved campaign data is not valid JSON. It has not been changed.'); }
  if (!data || data.version !== 1 || !Array.isArray(data.campaigns)
    || !Array.isArray(data.characters) || !Array.isArray(data.notes)
    || !Array.isArray(data.recaps) || !Array.isArray(data.homebrew)
    || !data.collections || Array.isArray(data.collections) || typeof data.collections !== 'object'
    || !data.objects || Array.isArray(data.objects) || typeof data.objects !== 'object'
    || !data.receipts || Array.isArray(data.receipts) || typeof data.receipts !== 'object') {
    throw new Error('Saved campaign data is not a recognised Keeper workspace. No changes were made.');
  }
  return data;
}

function backupRoot(userData) {
  return path.join(userData, BACKUPS_DIR);
}

function treeDigests(folder) {
  const result = {};
  function visit(current, prefix = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Cannot back up linked campaign media safely.');
      const file = path.join(current, entry.name);
      const name = prefix + entry.name;
      if (entry.isDirectory()) visit(file, name + '/');
      else if (entry.isFile()) result[name] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      else throw new Error('Unsupported backup file.');
    }
  }
  visit(folder);
  return result;
}

function verifyBackupDigests(folder, manifest) {
  if (!manifest.sha256) return; // Existing version-1 backups remain readable.
  const actual = treeDigests(folder);
  delete actual['manifest.json'];
  if (JSON.stringify(actual) !== JSON.stringify(manifest.sha256)) throw new Error('Backup checksum verification failed. Current campaign was not changed.');
}

function createBackup(userData, raw, reason = 'manual') {
  const data = checkWorkspace(raw);
  const id = `snapshot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const root = backupRoot(userData);
  const finalDir = path.join(root, id);
  const pendingDir = path.join(root, `.${id}.pending`);
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(pendingDir, { recursive: false });
  const label = VALID_REASONS.has(reason) ? reason : 'manual';
  const info = {
    id, created_at: new Date().toISOString(), reason: label,
    app_data_version: 1, campaign_count: data.campaigns.length,
  };
  try {
    fs.writeFileSync(path.join(pendingDir, 'workspace.json'), raw, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    const attachments = path.join(userData, ATTACHMENTS_DIR);
    if (fs.existsSync(attachments)) {
      fs.cpSync(attachments, path.join(pendingDir, ATTACHMENTS_DIR), { recursive: true, errorOnExist: true });
      const before = treeDigests(attachments);
      const copied = treeDigests(path.join(pendingDir, ATTACHMENTS_DIR));
      if (JSON.stringify(before) !== JSON.stringify(copied)) throw new Error('Campaign media backup verification failed.');
    }
    if (fs.readFileSync(path.join(pendingDir, 'workspace.json'), 'utf8') !== raw) throw new Error('Workspace backup verification failed.');
    info.sha256 = treeDigests(pendingDir);
    fs.writeFileSync(path.join(pendingDir, 'manifest.json'), JSON.stringify(info, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fs.renameSync(pendingDir, finalDir);
  } catch (error) {
    fs.rmSync(pendingDir, { recursive: true, force: true });
    throw error;
  }
  return info;
}

function listBackups(userData) {
  const root = backupRoot(userData);
  if (!fs.existsSync(root)) return [];
  const backups = [];
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    if (!item.isDirectory() || !BACKUP_ID.test(item.name)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, item.name, 'manifest.json'), 'utf8'));
      if (manifest.id === item.name && fs.statSync(path.join(root, item.name, 'workspace.json')).isFile()) backups.push(manifest);
    } catch { /* Do not offer incomplete or damaged snapshots. */ }
  }
  return backups.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function restoreBackup(userData, id, currentRaw) {
  if (typeof id !== 'string' || !BACKUP_ID.test(id)) throw new Error('Invalid backup selection.');
  const folder = path.join(backupRoot(userData), id);
  const manifest = listBackups(userData).find(item => item.id === id);
  if (!manifest) throw new Error('That backup could not be found.');
  const raw = fs.readFileSync(path.join(folder, 'workspace.json'), 'utf8');
  checkWorkspace(raw); // Never replace existing data with an invalid snapshot.
  verifyBackupDigests(folder, manifest);

  // Before ANY restore, take a snapshot of the workspace currently on this laptop.
  const safetyCopy = currentRaw ? createBackup(userData, currentRaw, 'before-restore') : null;
  const savedAttachments = path.join(folder, ATTACHMENTS_DIR);
  if (fs.existsSync(savedAttachments)) {
    fs.mkdirSync(path.join(userData, ATTACHMENTS_DIR), { recursive: true });
    fs.cpSync(savedAttachments, path.join(userData, ATTACHMENTS_DIR), { recursive: true, force: true });
  }
  // The renderer saves this returned JSON only after all filesystem work succeeds.
  return { workspace: raw, backup: manifest, safety_backup: safetyCopy };
}


/**
 * A portable backup is a normal Keeper snapshot directory that can be copied
 * onto a USB stick. No GitHub/cloud connection or proprietary archive reader
 * is required to recover the campaign.
 */
function exportPortableBackup(userData, raw, destinationDir) {
  const destination = path.resolve(destinationDir);
  if (!fs.statSync(destination).isDirectory()) throw new Error('Choose a folder for your portable backup.');
  const relative = path.relative(path.resolve(userData), destination);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Choose a folder outside Keeper application data.');
  }

  const backup = createBackup(userData, raw, 'manual');
  const sourceDir = path.join(backupRoot(userData), backup.id);
  const targetDir = path.join(destination, `Rookie-Quest-Keeper-Backup-${backup.id}`);
  fs.cpSync(sourceDir, targetDir, { recursive: true, errorOnExist: true, force: false });
  return { ...backup, export_path: targetDir };
}

function validatePortableBackup(directory) {
  const folder = path.resolve(directory);
  if (!fs.statSync(folder).isDirectory()) throw new Error('Choose a Keeper backup folder.');
  const manifestPath = path.join(folder, 'manifest.json');
  const workspacePath = path.join(folder, 'workspace.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!BACKUP_ID.test(String(manifest.id || '')) || manifest.app_data_version !== 1) {
    throw new Error('This is not a supported Keeper backup.');
  }
  const raw = fs.readFileSync(workspacePath, 'utf8');
  checkWorkspace(raw);
  // Imported media will be served locally by the rqk-attachment: protocol.
  // Reject symlink payloads in portable backup media folders.
  function checkMediaTree(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Portable backup contains an unsafe media link.');
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) checkMediaTree(full);
      else if (!entry.isFile()) throw new Error('Portable backup has an unsupported media item.');
    }
  }
  const attachments = path.join(folder, ATTACHMENTS_DIR);
  if (fs.existsSync(attachments)) {
    if (!fs.lstatSync(attachments).isDirectory()) throw new Error('Invalid backup media folder.');
    checkMediaTree(attachments);
  }
  verifyBackupDigests(folder, manifest);
  return { folder, raw, manifest, attachments };
}

/**
 * Read-only migration preview for the one-time transition from the existing
 * portable Windows Keeper to the installed 0.5.x edition. Do not silently
 * search a user's OneDrive or copy data until they choose a backup and approve.
 * validatePortableBackup verifies workspace format and saved media digests.
 */
function previewPortableBackup(directory) {
  const saved = validatePortableBackup(directory);
  const workspace = checkWorkspace(saved.raw);
  let mediaFileCount = 0;
  if (fs.existsSync(saved.attachments)) {
    function countFiles(folder) {
      for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        if (item.isSymbolicLink()) throw new Error('Backup contains an unsafe media link.');
        if (item.isDirectory()) countFiles(path.join(folder, item.name));
        else if (item.isFile()) mediaFileCount += 1;
        else throw new Error('Backup contains unsupported media.');
      }
    }
    countFiles(saved.attachments);
  }
  return {
    backup_id: saved.manifest.id,
    created_at: saved.manifest.created_at || null,
    campaign_count: workspace.campaigns.length,
    character_count: workspace.characters.length,
    note_count: workspace.notes.length,
    media_file_count: mediaFileCount,
    workspace_sha256: crypto.createHash('sha256').update(saved.raw).digest('hex'),
    // Older backups can be read, but migration should require fresh
    // hash-protected exports rather than trusting unauthenticated media.
    checksummed: Boolean(saved.manifest.sha256),
  };
}

function restorePortableBackup(userData, directory, currentRaw) {
  // Validate fully before touching current campaign state.
  const portable = validatePortableBackup(directory);
  const beforeRestore = currentRaw ? createBackup(userData, currentRaw, 'before-restore') : null;
  if (fs.existsSync(portable.attachments)) {
    fs.mkdirSync(path.join(userData, ATTACHMENTS_DIR), { recursive: true });
    fs.cpSync(portable.attachments, path.join(userData, ATTACHMENTS_DIR), { recursive: true, force: true });
  }
  // The caller commits this JSON to its local workspace only once copying ends.
  return { workspace: portable.raw, backup: portable.manifest, safety_backup: beforeRestore };
}

module.exports = { createBackup, listBackups, restoreBackup, checkWorkspace, exportPortableBackup, previewPortableBackup, restorePortableBackup };

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
const MEDIA_RECOVERY_PREFIX = '.campaign-media-before-restore-';

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

function readWorkspaceFile(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile()) throw new Error('Backup workspace must be an ordinary file, not a link.');
  if (info.size > MAX_WORKSPACE_BYTES) throw new Error('Saved workspace exceeds the 40 MB backup limit.');
  const raw = fs.readFileSync(file, 'utf8');
  checkWorkspace(raw);
  return raw;
}

function backupRoot(userData) {
  return path.join(userData, BACKUPS_DIR);
}

function hashFile(file) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = fs.openSync(file, 'r');
  try {
    let count;
    while ((count = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count));
  } finally { fs.closeSync(descriptor); }
  return hash.digest('hex');
}

function treeDigests(folder) {
  if (!fs.lstatSync(folder).isDirectory()) throw new Error('Invalid backup media folder or unsafe media link.');
  const result = Object.create(null);
  function visit(current, prefix = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Backup contains an unsafe media link.');
      const file = path.join(current, entry.name);
      const name = prefix + entry.name;
      if (entry.isDirectory()) visit(file, name + '/');
      else if (entry.isFile()) result[name] = hashFile(file);
      else throw new Error('Unsupported backup file.');
    }
  }
  visit(folder);
  return result;
}

function canonicalDigests(digests) {
  return JSON.stringify(Object.keys(digests).sort().map(name => [name, digests[name]]));
}

function verifyBackupDigests(folder, manifest) {
  const actual = treeDigests(folder);
  delete actual['manifest.json'];
  if (manifest.sha256 != null) {
    if (!manifest.sha256 || typeof manifest.sha256 !== 'object' || Array.isArray(manifest.sha256)
        || canonicalDigests(actual) !== canonicalDigests(manifest.sha256)) {
      throw new Error('Backup checksum verification failed. Current campaign was not changed.');
    }
  }
  return actual; // Existing unchecked version-1 backups remain readable for recovery.
}

// Stage all media on the same filesystem before changing the active tree. A
// failed download/copy, disk-full error or changed source never partially
// overwrites active media. Existing files not in the restored backup are kept.
function restoreMedia(userData, savedAttachments, savedDigests) {
  if (!fs.existsSync(savedAttachments)) return;
  const active = path.join(userData, ATTACHMENTS_DIR);
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const staging = path.join(userData, `.campaign-media-restore-${suffix}.pending`);
  const previous = path.join(userData, `${MEDIA_RECOVERY_PREFIX}${suffix}`);
  const before = fs.existsSync(active) ? treeDigests(active) : null;
  const expected = Object.assign(Object.create(null), before || {});
  for (const [name, hash] of Object.entries(savedDigests)) {
    if (name.startsWith(ATTACHMENTS_DIR + '/')) expected[name.slice(ATTACHMENTS_DIR.length + 1)] = hash;
  }
  fs.mkdirSync(userData, { recursive: true });
  try {
    if (before) fs.cpSync(active, staging, { recursive: true, errorOnExist: true, force: false });
    else fs.mkdirSync(staging);
    fs.cpSync(savedAttachments, staging, { recursive: true, force: true });
    if (canonicalDigests(treeDigests(staging)) !== canonicalDigests(expected)) {
      throw new Error('Restored media verification failed. Current campaign was not changed.');
    }
    if (before && canonicalDigests(treeDigests(active)) !== canonicalDigests(before)) {
      throw new Error('Current campaign media changed during restore. Try again when other Keeper windows are closed.');
    }
    if (before) fs.renameSync(active, previous);
    try { fs.renameSync(staging, active); }
    catch (error) {
      if (before) {
        try { fs.renameSync(previous, active); }
        catch { throw new Error(`Media restore could not finish. Your previous files remain safe in ${previous}. Restart Keeper to recover them.`); }
      }
      throw error;
    }
    // The verified before-restore snapshot is the normal recovery method.
    // A locked retained folder is harmless and must not turn success into an
    // error after the active tree has already changed.
    if (before) {
      try { fs.rmSync(previous, { recursive: true, force: true }); } catch { /* Retain recovery files. */ }
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function recoverInterruptedMediaRestore(userData) {
  const active = path.join(userData, ATTACHMENTS_DIR);
  if (fs.existsSync(active) || !fs.existsSync(userData)) return false;
  const retained = fs.readdirSync(userData, { withFileTypes: true })
    .filter(item => item.isDirectory() && /^\.campaign-media-before-restore-[0-9]{13}-[a-f0-9]{8}$/.test(item.name));
  if (!retained.length) return false;
  if (retained.length !== 1) throw new Error('Multiple retained media folders need review before restoring campaign files. No files were changed.');
  const previous = path.join(userData, retained[0].name);
  treeDigests(previous); // Never follow unexpected links during recovery.
  fs.renameSync(previous, active);
  return true;
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
      if (canonicalDigests(before) !== canonicalDigests(copied)) throw new Error('Campaign media backup verification failed.');
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
  const raw = readWorkspaceFile(path.join(folder, 'workspace.json'));
  const digests = verifyBackupDigests(folder, manifest);
  verifyWorkspaceRead(raw, digests);

  // Before ANY restore, take a snapshot of the workspace currently on this laptop.
  const safetyCopy = currentRaw ? createBackup(userData, currentRaw, 'before-restore') : null;
  const savedAttachments = path.join(folder, ATTACHMENTS_DIR);
  restoreMedia(userData, savedAttachments, digests);
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
  if (!fs.lstatSync(manifestPath).isFile() || !fs.lstatSync(workspacePath).isFile()) {
    throw new Error('Backup manifest and workspace must be ordinary files, not links.');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!BACKUP_ID.test(String(manifest.id || '')) || manifest.app_data_version !== 1) {
    throw new Error('This is not a supported Keeper backup.');
  }
  const raw = readWorkspaceFile(workspacePath);
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
  const digests = verifyBackupDigests(folder, manifest);
  verifyWorkspaceRead(raw, digests);
  return { folder, raw, manifest, attachments, digests };
}

function verifyWorkspaceRead(raw, digests) {
  if (crypto.createHash('sha256').update(raw).digest('hex') !== digests['workspace.json']) {
    throw new Error('The backup changed while being read. Choose and inspect it again.');
  }
}

function backupFingerprint(saved) {
  return crypto.createHash('sha256').update(JSON.stringify([
    saved.manifest.id, saved.manifest.created_at || null, canonicalDigests(saved.digests),
  ])).digest('hex');
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
    backup_sha256: backupFingerprint(saved),
    // Older backups can be read, but migration should require fresh
    // hash-protected exports rather than trusting unauthenticated media.
    checksummed: Boolean(saved.manifest.sha256),
  };
}

function restorePortableBackup(userData, directory, currentRaw, expectedBackupSha = null) {
  // Validate fully before touching current campaign state.
  const portable = validatePortableBackup(directory);
  if (expectedBackupSha !== null && backupFingerprint(portable) !== expectedBackupSha) {
    throw new Error('The selected backup changed since inspection. Choose and review it again.');
  }
  const beforeRestore = currentRaw ? createBackup(userData, currentRaw, 'before-restore') : null;
  restoreMedia(userData, portable.attachments, portable.digests);
  // The caller commits this JSON to its local workspace only once copying ends.
  return { workspace: portable.raw, backup: portable.manifest, safety_backup: beforeRestore };
}

module.exports = { createBackup, listBackups, restoreBackup, checkWorkspace, exportPortableBackup, previewPortableBackup, restorePortableBackup, recoverInterruptedMediaRestore };

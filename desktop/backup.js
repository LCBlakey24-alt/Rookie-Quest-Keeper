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
    }
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

module.exports = { createBackup, listBackups, restoreBackup, checkWorkspace };

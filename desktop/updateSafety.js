'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// A published Windows installer must never restart over a workspace that was
// not successfully snapshotted. Backup integrity is checked in backup.js.
const SHA256 = /^[a-f0-9]{64}$/;
const BACKUP_ID = /^snapshot-[0-9]{13}-[a-f0-9]{8}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const INSTALL_RECEIPT = 'installed-update-recovery.json';

function requireVerifiedUpdateBackup(createSafetyBackup, workspaceRaw) {
  if (typeof workspaceRaw !== 'string' || !workspaceRaw.trim()) {
    throw new Error('A saved campaign workspace is required before updating. Nothing was installed.');
  }
  if (typeof createSafetyBackup !== 'function') {
    throw new Error('Campaign backup service is unavailable. Update cancelled.');
  }

  const backup = createSafetyBackup(workspaceRaw, 'before-update');
  if (!backup || backup.reason !== 'before-update'
      || !BACKUP_ID.test(String(backup.id || ''))
      || !SHA256.test(String(backup.sha256?.['workspace.json'] || ''))) {
    throw new Error('Could not verify the campaign backup. Update cancelled; your program was not changed.');
  }
  return backup;
}

// One explicit Install Update action authorises a download (if needed), then
// a verified local campaign/media snapshot, then the install. A successful
// Promise from electron-updater alone is not enough: the downloaded event must
// have confirmed readiness before any backup-triggered restart is scheduled.
async function prepareVerifiedInstalledUpdate({ state, downloadUpdate, getState, createSafetyBackup, workspaceRaw, getCurrentWorkspaceRaw }) {
  if (!['available', 'downloaded'].includes(state)) {
    throw new Error('Check for a published update before installing. Nothing was changed.');
  }
  if (typeof getState !== 'function') {
    throw new Error('Update download status is unavailable. Nothing was installed.');
  }
  if (state === 'available') {
    if (typeof downloadUpdate !== 'function') {
      throw new Error('Update download service is unavailable. Nothing was installed.');
    }
    await downloadUpdate();
  }
  if (getState() !== 'downloaded') {
    throw new Error('Update download has not been verified as complete. Nothing was installed.');
  }
  // A download may take minutes. Read the saved workspace at the end so edits
  // made while it was downloading are included in the recovery snapshot.
  const currentRaw = typeof getCurrentWorkspaceRaw === 'function'
    ? await getCurrentWorkspaceRaw()
    : workspaceRaw;
  if (getState() !== 'downloaded') {
    throw new Error('Update is no longer ready to install. Nothing was installed.');
  }
  return requireVerifiedUpdateBackup(createSafetyBackup, currentRaw);
}

// Keep the recovery reference across an installer crash, failed restart or
// Windows shutdown. This never restores or modifies campaign data itself.
function recordInstalledUpdateAttempt(userData, { fromVersion, toVersion, backup }) {
  if (!VERSION.test(String(fromVersion || '')) || !VERSION.test(String(toVersion || ''))
      || fromVersion === toVersion || !BACKUP_ID.test(String(backup?.id || ''))
      || backup?.reason !== 'before-update' || !SHA256.test(String(backup?.sha256?.['workspace.json'] || ''))) {
    throw new Error('Could not save the update recovery details. Nothing was installed.');
  }
  const receipt = {
    version: 1, from_version: fromVersion, to_version: toVersion,
    backup_id: backup.id, workspace_sha256: backup.sha256['workspace.json'],
    created_at: new Date().toISOString(),
  };
  fs.mkdirSync(userData, { recursive: true });
  const destination = path.join(userData, INSTALL_RECEIPT);
  const pending = `${destination}.${process.pid}-${crypto.randomBytes(6).toString('hex')}.pending`;
  try {
    fs.writeFileSync(pending, JSON.stringify(receipt), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    fs.renameSync(pending, destination);
  } finally {
    fs.rmSync(pending, { force: true });
  }
  return receipt;
}

function readInstalledUpdateAttempt(userData, installedVersion) {
  try {
    const file = path.join(userData, INSTALL_RECEIPT);
    if (fs.statSync(file).size > 8192) return null;
    const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.version !== 1 || !VERSION.test(String(receipt.from_version || ''))
        || !VERSION.test(String(receipt.to_version || '')) || receipt.from_version === receipt.to_version
        || !BACKUP_ID.test(String(receipt.backup_id || ''))
        || !SHA256.test(String(receipt.workspace_sha256 || ''))
        || !Number.isFinite(Date.parse(receipt.created_at))) return null;
    const state = installedVersion === receipt.to_version ? 'installed'
      : installedVersion === receipt.from_version ? 'incomplete' : 'previous';
    return { ...receipt, state };
  } catch { return null; }
}

module.exports = { requireVerifiedUpdateBackup, prepareVerifiedInstalledUpdate,
  recordInstalledUpdateAttempt, readInstalledUpdateAttempt };

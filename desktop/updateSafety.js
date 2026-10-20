'use strict';

// A published Windows installer must never restart over a workspace that was
// not successfully snapshotted. Backup integrity is checked in backup.js.
const SHA256 = /^[a-f0-9]{64}$/;

function requireVerifiedUpdateBackup(createSafetyBackup, workspaceRaw) {
  if (typeof workspaceRaw !== 'string' || !workspaceRaw.trim()) {
    throw new Error('A saved campaign workspace is required before updating. Nothing was installed.');
  }
  if (typeof createSafetyBackup !== 'function') {
    throw new Error('Campaign backup service is unavailable. Update cancelled.');
  }

  const backup = createSafetyBackup(workspaceRaw, 'before-update');
  if (!backup || backup.reason !== 'before-update'
      || !/^snapshot-[0-9]{13}-[a-f0-9]{8}$/.test(String(backup.id || ''))
      || !SHA256.test(String(backup.sha256?.['workspace.json'] || ''))) {
    throw new Error('Could not verify the campaign backup. Update cancelled; your program was not changed.');
  }
  return backup;
}

// One explicit Install Update action authorises a download (if needed), then
// a verified local campaign/media snapshot, then the install. A successful
// Promise from electron-updater alone is not enough: the downloaded event must
// have confirmed readiness before any backup-triggered restart is scheduled.
async function prepareVerifiedInstalledUpdate({ state, downloadUpdate, getState, createSafetyBackup, workspaceRaw }) {
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
  return requireVerifiedUpdateBackup(createSafetyBackup, workspaceRaw);
}

module.exports = { requireVerifiedUpdateBackup, prepareVerifiedInstalledUpdate };

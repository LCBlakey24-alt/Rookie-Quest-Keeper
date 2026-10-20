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

module.exports = { requireVerifiedUpdateBackup };

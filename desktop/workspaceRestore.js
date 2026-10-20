'use strict';

const BACKUP_ID = /^snapshot-[0-9]{13}-[a-f0-9]{8}$/;

// Filesystem restore finishes before Chromium's saved workspace is committed.
// If Chromium rejects that commit (for example, storage quota is exhausted),
// put the prior media back using the verified before-restore snapshot. The
// commit callback must keep its previous workspace intact when it rejects.
async function commitRestoredWorkspace({ result, commitWorkspace, restoreSafetyBackup }) {
  try {
    if (!result || typeof result.workspace !== 'string' || typeof commitWorkspace !== 'function') {
      throw new Error('The restored workspace could not be saved.');
    }
    await commitWorkspace(result.workspace);
    return { ...result, workspace_saved: true };
  } catch (commitError) {
    const safetyId = result?.safety_backup?.id;
    if (!BACKUP_ID.test(String(safetyId || ''))) {
      throw new Error('Keeper could not save the restored campaigns. No safety backup was available for automatic media recovery. Close Keeper and review the backup before trying again.', { cause: commitError });
    }
    try {
      if (typeof restoreSafetyBackup !== 'function') throw new Error('Recovery service unavailable.');
      await restoreSafetyBackup(safetyId);
    } catch (recoveryError) {
      const error = new Error('Keeper could not save the restored campaigns, and automatic media recovery could not finish. Your before-restore backup is still saved. Close Keeper and recover that backup before using the campaign.', { cause: recoveryError });
      error.recovery_backup_id = safetyId;
      throw error;
    }
    const error = new Error('Keeper could not save the restored campaigns. Your previous campaign media was restored and the safety backup was kept. Free some disk space or export a backup, then try again.', { cause: commitError });
    error.recovery_backup_id = safetyId;
    throw error;
  }
}

module.exports = { commitRestoredWorkspace };

'use strict';

const { createBackup, listBackups, restoreBackup, exportPortableBackup,
  previewPortableBackup, restorePortableBackup } = require('./backup');
const { readCurrentSnapshot, writeCurrentSnapshot } = require('./workspaceSnapshot');
const { beginWorkspaceRestore, readPendingWorkspaceRestore, finishWorkspaceRestore, preserveBrowserOnRecovery } = require('./restoreJournal');

const RECOVERY_URL = 'rqk://desktop/__keeper_restore_recovery__';

// Recover before the real renderer starts. A process interruption may have
// changed several localStorage values or media files; the retained verified
// snapshot is the conservative source of truth until the restore is committed.
async function recoverPendingRestore({ app, BrowserWindow }) {
  const userData = app.getPath('userData');
  const pending = readPendingWorkspaceRestore(userData);
  if (!pending) return false;
  const saved = restoreBackup(userData, pending.safety_backup_id, null);
  if (pending.preserve_browser) {
    finishWorkspaceRestore(userData, pending.id);
    return true;
  }
  const window = new BrowserWindow({ show: false, webPreferences: {
    sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  try {
    await window.loadURL(RECOVERY_URL);
    await writeCurrentSnapshot(window, window.webContents, saved.workspace, saved.browser_storage);
    finishWorkspaceRestore(userData, pending.id);
    return true;
  } finally { if (!window.isDestroyed()) window.destroy(); }
}

function registerDesktopMaintenance({ app, ipcMain, dialog, getPrimaryWindow, portable, createCopiedProfileBackup }) {
  const userData = () => app.getPath('userData');
  let restoring = false;
  let pendingMigration = null;
  const currentSnapshot = (event, raw) => readCurrentSnapshot(getPrimaryWindow(), event.sender, raw);

  function assertCanMutate() {
    if (restoring || readPendingWorkspaceRestore(userData())) {
      throw new Error('Keeper is restoring saved information. Finish recovery before starting another change.');
    }
  }

  async function restore(event, fallbackRaw, operation) {
    assertCanMutate();
    restoring = true;
    let receipt = null;
    try {
      const latest = await currentSnapshot(event, fallbackRaw);
      const prepared = result => {
        receipt = beginWorkspaceRestore(userData(), result.safety_backup?.id);
      };
      const result = operation(latest, prepared);
      await writeCurrentSnapshot(getPrimaryWindow(), event.sender, result.workspace, result.browser_storage, latest);
      finishWorkspaceRestore(userData(), receipt.id);
      receipt = null;
      return { ...result, workspace_saved: true };
    } catch (error) {
      if (receipt) {
        try {
          const preserveBrowser = error.code === 'WORKSPACE_CHANGED_DURING_RESTORE';
          if (preserveBrowser) preserveBrowserOnRecovery(userData(), receipt.id);
          const safety = restoreBackup(userData(), receipt.safety_backup_id, null);
          if (!preserveBrowser) await writeCurrentSnapshot(getPrimaryWindow(), event.sender, safety.workspace, safety.browser_storage);
          finishWorkspaceRestore(userData(), receipt.id);
          receipt = null;
        } catch {
          throw new Error('Restore could not finish. Keeper retained its before-restore backup and recovery record. Close and reopen Keeper to recover before editing.', { cause: error });
        }
      }
      throw error;
    } finally { restoring = false; }
  }

  ipcMain.handle('rqk:create-backup', async (event, raw, reason = 'manual') => {
    assertCanMutate();
    const saved = await currentSnapshot(event, raw);
    assertCanMutate();
    return createBackup(userData(), saved.workspace, reason, saved.browserStorage);
  });
  ipcMain.handle('rqk:list-backups', () => listBackups(userData()));
  ipcMain.handle('rqk:restore-backup', (event, id, raw) => restore(event, raw,
    (latest, prepared) => restoreBackup(userData(), id, latest.workspace, latest.browserStorage, prepared)));
  ipcMain.handle('rqk:export-portable-backup', async (event, raw) => {
    assertCanMutate();
    const choice = await dialog.showOpenDialog({ title: 'Choose where to save a Keeper backup',
      properties: ['openDirectory', 'createDirectory'] });
    if (choice.canceled || !choice.filePaths?.[0]) return { canceled: true };
    assertCanMutate();
    const saved = await currentSnapshot(event, raw);
    assertCanMutate();
    return { canceled: false, ...exportPortableBackup(userData(), saved.workspace, choice.filePaths[0], saved.browserStorage) };
  });
  ipcMain.handle('rqk:restore-portable-backup', async (event, raw) => {
    const choice = await dialog.showOpenDialog({ title: 'Choose your saved Keeper backup folder', properties: ['openDirectory'] });
    if (choice.canceled || !choice.filePaths?.[0]) return { canceled: true };
    return { canceled: false, ...await restore(event, raw,
      (latest, prepared) => restorePortableBackup(userData(), choice.filePaths[0], latest.workspace, null, latest.browserStorage, prepared)) };
  });

  function rememberMigration(folder) {
    const preview = previewPortableBackup(folder);
    if (!preview.checksummed) throw new Error('This backup has no complete file checksums. Export a fresh backup, then inspect it again.');
    pendingMigration = { folder, backup_sha256: preview.backup_sha256 };
    return preview;
  }
  ipcMain.handle('rqk:preview-older-keeper-backup', async () => {
    if (portable) throw new Error('Use migration in the new installed Windows Keeper.');
    pendingMigration = null;
    const choice = await dialog.showOpenDialog({ title: 'Select a backup exported from your earlier Keeper', properties: ['openDirectory'] });
    if (choice.canceled || !choice.filePaths?.[0]) return { canceled: true };
    return { canceled: false, ...rememberMigration(choice.filePaths[0]) };
  });
  ipcMain.handle('rqk:prepare-copied-profile-backup', async () => {
    if (portable) throw new Error('Use migration in the new installed Windows Keeper.');
    assertCanMutate();
    pendingMigration = null;
    const source = await dialog.showOpenDialog({ title: 'Choose a closed COPY of the earlier RookieQuestKeeperData folder', properties: ['openDirectory'] });
    if (source.canceled || !source.filePaths?.[0]) return { canceled: true };
    const approval = await dialog.showMessageBox({ type: 'question', title: 'Read a copied earlier Keeper profile',
      message: 'Prepare a backup from this copied data folder?',
      detail: 'Keeper will copy the selected files into an isolated temporary folder, read supported campaign records there, and save a new backup. Select a closed disposable copy, not your live OneDrive installation. Nothing is imported until you inspect and approve the result.',
      buttons: ['Prepare backup', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true });
    if (approval.response !== 0) return { canceled: true };
    const destination = await dialog.showOpenDialog({ title: 'Choose where to save the new migration backup', properties: ['openDirectory', 'createDirectory'] });
    if (destination.canceled || !destination.filePaths?.[0]) return { canceled: true };
    const result = await createCopiedProfileBackup({ sourceDataRoot: source.filePaths[0], destinationDir: destination.filePaths[0] });
    return { canceled: false, ...rememberMigration(result.export_path),
      omitted_key_count: result.omitted_key_count, omitted_keys: result.omitted_keys,
      temporary_cleanup_pending: result.temporary_cleanup_pending };
  });
  ipcMain.handle('rqk:import-older-keeper-backup', async (event, raw) => {
    if (portable) throw new Error('Use the installed Windows Keeper for migration.');
    if (!pendingMigration) throw new Error('Choose and inspect an earlier backup first.');
    const chosen = pendingMigration;
    const result = await restore(event, raw, (latest, prepared) => restorePortableBackup(userData(), chosen.folder,
      latest.workspace, chosen.backup_sha256, latest.browserStorage, prepared));
    pendingMigration = null;
    return { canceled: false, ...result };
  });
  return { assertCanMutate, currentSnapshot };
}

module.exports = { RECOVERY_URL, recoverPendingRestore, registerDesktopMaintenance };

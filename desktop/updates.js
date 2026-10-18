'use strict';

const { autoUpdater } = require('electron-updater');
const path = require('path');
const { portableExePath, inspectPortableUpdate, stagePortableUpdate, discardStagedPortableUpdate, launchPortableUpdate, readLastPortableUpdate } = require('./portableProgramUpdate');

// Updates are offered, never installed without an explicit click.
// The installed Electron app reads the GitHub provider from app-update.yml.
function registerDesktopUpdater({ app, ipcMain, BrowserWindow, dialog, portableRoot = null, createSafetyBackup, portable = false }) {
  const runningPortableExe = portable ? portableExePath(portableRoot) : null;
  const previousInstall = portable ? readLastPortableUpdate(app.getPath('userData')) : null;
  let selectedProgram = null;
  const status = {
    state: portable ? 'portable' : 'idle',
    installed_version: app.getVersion(),
    available_version: null,
    progress: 0,
    message: portable
      ? previousInstall?.state === 'failed'
        ? 'Previous program update failed: ' + String(previousInstall.reason || 'See your program backup.') 
        : previousInstall?.state === 'installed' && previousInstall.version === app.getVersion()
          ? 'Keeper was updated successfully. Your campaign data stayed in RookieQuestKeeperData.'
          : 'Portable edition: select a newer Keeper .exe and verify its trusted SHA-256 checksum to update here.'
      : 'Ready to check for updates.',
  };
  let busy = false;

  function announce(patch) {
    Object.assign(status, patch);
    const snapshot = { ...status };
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('rqk:update-status', snapshot);
    }
    return snapshot;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => announce({ state: 'checking', message: 'Checking for a published Windows update…' }));
  autoUpdater.on('update-available', (info) => announce({
    state: 'available', available_version: info.version, progress: 0,
    message: `Version ${info.version} is available. Download it when you are ready.`,
  }));
  autoUpdater.on('update-not-available', () => announce({
    state: 'current', available_version: null, progress: 0, message: 'This version is up to date.',
  }));
  autoUpdater.on('download-progress', (progress) => announce({
    state: 'downloading',
    progress: Math.min(100, Math.max(0, Math.round(Number(progress.percent) || 0))),
    message: 'Downloading the verified update…',
  }));
  autoUpdater.on('update-downloaded', (info) => announce({
    state: 'downloaded', available_version: info.version, progress: 100,
    message: 'Update ready. Keeper will back up your campaign before installing.',
  }));
  autoUpdater.on('error', () => {
    busy = false;
    announce({ state: 'error', message: 'Update service unavailable or download failed. Your saved campaigns have not been changed.' });
  });

  async function checkForUpdates() {
    if (portable) return announce({ state: 'portable', message: 'Portable edition: choose a newer Keeper program and verify its SHA-256 checksum. Your campaign data stays separate.' });
    if (!app.isPackaged) return announce({
      state: 'development', message: 'Update checks work in an installed Windows version of Keeper.',
    });
    if (busy || status.state === 'downloading' || status.state === 'downloaded') return { ...status };
    busy = true;
    announce({ state: 'checking', message: 'Checking GitHub Releases…', progress: 0 });
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      announce({ state: 'error', message: 'Could not check updates. Check your internet connection or try again later.' });
    } finally {
      busy = false;
    }
    return { ...status };
  }

  // Offline portable upgrades: the EXE is only replaced after Keeper closes.
  // A separately provided checksum establishes the identity of the chosen
  // file; the checksum displayed by Keeper itself is not a trusted reference.
  ipcMain.handle('rqk:select-program-update', async () => {
    if (!portable) throw new Error('Use the installed Windows updater on this edition.');
    if (!runningPortableExe) throw new Error('Could not locate the portable EXE. Start the official portable program from File Explorer and try again.');
    const picked = await dialog.showOpenDialog({
      title: 'Choose your new Rookie Quest Keeper Portable program',
      properties: ['openFile'],
      filters: [{ name: 'Rookie Quest Keeper Portable Windows program', extensions: ['exe'] }],
    });
    if (picked.canceled || !picked.filePaths?.[0]) return { canceled: true };
    selectedProgram = null;
    const inspected = await inspectPortableUpdate(picked.filePaths[0], app.getVersion(), runningPortableExe);
    selectedProgram = inspected;
    return {
      canceled: false, file_name: inspected.file_name, version: inspected.version,
      size_bytes: inspected.size_bytes, sha256: inspected.sha256,
    };
  });
  ipcMain.handle('rqk:install-program-update', async (_event, workspaceRaw, expectedSha256) => {
    if (!portable) throw new Error('Use the normal installed Windows update buttons.');
    if (!selectedProgram) throw new Error('Select a newer Keeper program update first.');
    if (!runningPortableExe) throw new Error('Could not locate the portable EXE. No files changed.');
    if (busy) throw new Error('Keeper is already working on another update.');
    busy = true;
    let staged = null;
    let helperStarted = false;
    try {
      // Validation and staging must finish successfully before backing up or
      // asking the current process to close.
      staged = await stagePortableUpdate({
        selection: selectedProgram, expectedSha256, runningExe: runningPortableExe,
        userData: app.getPath('userData'), currentVersion: app.getVersion(),
      });
      // An absent, invalid or unbacked-up workspace fails the install closed.
      if (!workspaceRaw) throw new Error('Back up your active campaign workspace before updating.');
      const backup = createSafetyBackup(workspaceRaw, 'before-update');
      if (!backup) throw new Error('Could not verify the campaign backup; installation cancelled.');
      await launchPortableUpdate(staged.scriptPath);
      helperStarted = true;
      selectedProgram = null;
      announce({
        state: 'installing', available_version: staged.version,
        message: 'Campaign backup created. Closing Keeper to install the verified program and restart…',
      });
      setTimeout(() => app.quit(), 650);
      return { started: true, backup, version: staged.version };
    } catch (error) {
      if (!helperStarted) await discardStagedPortableUpdate(staged);
      announce({ state: 'portable', message: 'Program update not started: ' + String(error?.message || error) });
      throw error;
    } finally {
      busy = false;
    }
  });

  ipcMain.handle('rqk:get-update-status', () => ({ ...status }));
  ipcMain.handle('rqk:check-updates', () => checkForUpdates());
  ipcMain.handle('rqk:download-update', async () => {
    if (portable) throw new Error('USB portable apps are updated manually, not with the Windows installed-app updater.');
    if (status.state !== 'available') throw new Error('Check for an available update first.');
    if (busy) return { ...status };
    busy = true;
    announce({ state: 'downloading', progress: 0, message: 'Downloading update…' });
    try {
      await autoUpdater.downloadUpdate();
    } catch {
      announce({ state: 'error', message: 'The download failed. Existing campaign data is unchanged.' });
    } finally {
      busy = false;
    }
    return { ...status };
  });
  ipcMain.handle('rqk:install-update', (event, workspaceRaw) => {
    if (portable) throw new Error('Back up the USB data and replace the program executable with the newer portable download.');
    if (status.state !== 'downloaded') throw new Error('Download the new version before installing.');
    // A failed backup prevents installation. This is intentional.
    const backup = createSafetyBackup(workspaceRaw, 'before-update');
    announce({
      state: 'installing',
      message: backup ? 'Campaign backup saved. Installing update and restarting…' : 'No saved campaign yet. Installing update…',
    });
    setImmediate(() => {
      try { autoUpdater.quitAndInstall(false, true); }
      catch {
        announce({ state: 'error', message: 'Installer could not start. Your saved campaign backup is still available.' });
      }
    });
    return { installed: true, backup };
  });

  // An optional background *check* only. Never downloads or installs without user approval.
  if (app.isPackaged && !portable) setTimeout(() => { if (status.state === 'idle') checkForUpdates(); }, 15000);
  return { getStatus: () => ({ ...status }) };
}

module.exports = { registerDesktopUpdater };

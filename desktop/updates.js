'use strict';

const { autoUpdater } = require('electron-updater');

// Updates are offered, never installed without an explicit click.
// The installed Electron app reads the GitHub provider from app-update.yml.
function registerDesktopUpdater({ app, ipcMain, BrowserWindow, createSafetyBackup }) {
  const status = {
    state: 'idle',
    installed_version: app.getVersion(),
    available_version: null,
    progress: 0,
    message: 'Ready to check for updates.',
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

  ipcMain.handle('rqk:get-update-status', () => ({ ...status }));
  ipcMain.handle('rqk:check-updates', () => checkForUpdates());
  ipcMain.handle('rqk:download-update', async () => {
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
  if (app.isPackaged) setTimeout(() => { if (status.state === 'idle') checkForUpdates(); }, 15000);
  return { getStatus: () => ({ ...status }) };
}

module.exports = { registerDesktopUpdater };

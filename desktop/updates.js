'use strict';

const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { readPackage, hash } = require('./signedProgramPackage');
const { requireVerifiedUpdateBackup, prepareVerifiedInstalledUpdate,
  recordInstalledUpdateAttempt, readInstalledUpdateAttempt } = require('./updateSafety');
const { stageAppPackage, activateApp, readLastAppResult } = require('./programRelease');
const pinnedKeys = global.__rqkProgramTrust || require('./programTrust.json');
const { portableExePath, inspectPortableUpdate, stagePortableUpdate, discardStagedPortableUpdate, launchPortableUpdate, readLastPortableUpdate } = require('./portableProgramUpdate');

// Updates are offered, never installed without an explicit click.
// The installed Electron app reads the GitHub provider from app-update.yml.
function registerDesktopUpdater({ app, ipcMain, BrowserWindow, dialog, portableRoot = null, createSafetyBackup, getCurrentWorkspaceRaw, portable = false }) {
  const runningPortableExe = portable ? portableExePath(portableRoot) : null;
  const previousInstall = portable ? readLastPortableUpdate(app.getPath('userData')) : null;
  const previousApp = portable ? readLastAppResult(app.getPath('userData')) : null;
  const previousInstalled = portable ? null : readInstalledUpdateAttempt(app.getPath('userData'), app.getVersion());
  let selectedProgram = null;
  const compatibility = () => ({ currentVersion: app.getVersion(),
    bootstrapVersion: global.__rqkBootstrapVersion || app.getVersion(),
    electron: process.versions.electron, platform: process.platform, arch: process.arch });
  const status = {
    state: portable ? 'portable' : 'idle',
    installed_version: app.getVersion(),
    available_version: null,
    release_notes: null,
    recovery_backup_id: previousInstalled?.backup_id || null,
    previous_install_state: previousInstalled?.state || null,
    progress: 0,
    message: portable
      ? previousApp?.state === 'rolled_back'
        ? previousApp.reason
        : previousInstall?.state === 'failed'
        ? 'Previous program update failed: ' + String(previousInstall.reason || 'See your program backup.') 
        : previousInstall?.state === 'installed' && previousInstall.version === app.getVersion()
          ? 'Keeper was updated successfully. Your campaign data stayed in RookieQuestKeeperData.'
          : 'Choose a signed .rqkprogram update. Keep all its parts in the same folder.'
      : previousInstalled?.state === 'incomplete'
        ? `The previous update to ${previousInstalled.to_version} did not complete. Keeper is still on ${app.getVersion()}. Your saved data and before-update backup are available in Updates & Backups.`
        : previousInstalled?.state === 'installed'
          ? `Keeper updated to ${app.getVersion()}. Your before-update campaign backup is available in Updates & Backups.`
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
    release_notes: typeof info.releaseNotes === 'string' ? info.releaseNotes.slice(0, 3000) : null,
    message: `Version ${info.version} is available. Download it when you are ready.`,
  }));
  autoUpdater.on('update-not-available', () => announce({
    state: 'current', available_version: null, release_notes: null, progress: 0, message: 'This version is up to date.',
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
    // Keep the in-progress operation locked until its own finally handler
    // runs; releasing busy here could allow a second install mid-download.
    announce({ state: 'error', message: 'Update service unavailable or download failed. Your saved campaigns have not been changed.' });
  });

  async function checkForUpdates() {
    if (portable) return announce({ state: 'portable', message: 'Choose a signed .rqkprogram file with all its parts available locally.' });
    if (!app.isPackaged) return announce({
      state: 'development', message: 'Update checks work in an installed Windows version of Keeper.',
    });
    if (busy || ['downloading', 'downloaded', 'installing'].includes(status.state)) return { ...status };
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

  // Only packages authenticated by a bootstrap-pinned signing key can install.
  ipcMain.handle('rqk:select-program-update', async () => {
    if (busy) throw new Error('Keeper is already preparing an update.');
    if (!portable) throw new Error('Use the installed Windows updater on this edition.');
    if (!runningPortableExe) throw new Error('Could not locate the portable EXE. Start the official portable program from File Explorer and try again.');
    const picked = await dialog.showOpenDialog({
      title: 'Choose a signed Keeper program update',
      properties: ['openFile'],
      filters: [{ name: 'Signed Keeper program update', extensions: ['rqkprogram'] }],
    });
    if (picked.canceled || !picked.filePaths?.[0]) return { canceled: true };
    selectedProgram = null;
    const source = picked.filePaths[0];
    const inspected = readPackage(source, pinnedKeys, compatibility());
    selectedProgram = { file_path: source, sha256: inspected.manifest.sha256, version: inspected.manifest.version };
    return {
      canceled: false, file_name: path.basename(source), version: inspected.manifest.version,
      size_bytes: inspected.manifest.size, sha256: inspected.manifest.sha256, authenticated: true,
      kind: inspected.manifest.kind, parts: inspected.manifest.parts.length,
    };
  });
  ipcMain.handle('rqk:install-program-update', async (_event, workspaceRaw) => {
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
      const verified = readPackage(selectedProgram.file_path, pinnedKeys, compatibility());
      if (verified.manifest.sha256 !== selectedProgram.sha256 || verified.manifest.version !== selectedProgram.version) throw new Error('Selected program changed. Select it again.');
      // An absent, invalid or unbacked-up workspace fails the install closed.
      const backup = requireVerifiedUpdateBackup(createSafetyBackup, workspaceRaw);
      if (verified.manifest.kind === 'app') {
        const release = stageAppPackage(selectedProgram.file_path, pinnedKeys, compatibility(), app.getPath('userData'));
        // Relaunch is registered before activation; activation uses one atomic
        // pointer write and never replaces the running Windows executable.
        app.relaunch({ execPath: runningPortableExe, args: [] });
        activateApp(app.getPath('userData'), release);
        helperStarted = true;
        selectedProgram = null;
        announce({ state: 'installing', available_version: release.version,
          message: 'Verified backup saved. Restarting Keeper with the signed program update…' });
        setTimeout(() => app.exit(0), 650);
        return { started: true, backup, version: release.version };
      }
      // Runtime updates retain the reviewed post-exit EXE replacement helper.
      const source = path.join(app.getPath('userData'), 'program-updates', 'Rookie Quest Keeper Portable ' + verified.manifest.version + '.exe');
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, verified.payload, { flag: 'wx' });
      try {
        const selection = await inspectPortableUpdate(source, app.getVersion(), runningPortableExe);
        staged = await stagePortableUpdate({ selection, expectedSha256: hash(verified.payload), runningExe: runningPortableExe,
          userData: app.getPath('userData'), currentVersion: app.getVersion() });
      } finally { fs.rmSync(source, { force: true }); }
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

  ipcMain.handle('rqk:get-update-status', () => {
    // DesktopMaintenance requests this after React mounts, so a mere loaded
    // HTML document cannot acknowledge a renderer that failed to initialise.
    global.__rqkMarkProgramHealthy?.();
    return { ...status };
  });
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
  // Installed-edition updates are a single deliberate action in the UI:
  // download -> confirmed downloaded event -> verified campaign/media backup
  // -> ask electron-updater to install after the current app exits.
  ipcMain.handle('rqk:install-update', async (_event, workspaceRaw) => {
    if (portable) throw new Error('Portable Keeper uses signed .rqkprogram updates, not the installed Windows updater.');
    if (!app.isPackaged) throw new Error('Install updates in the signed Windows version of Keeper.');
    if (busy) throw new Error('Keeper is already preparing an update.');
    const initialState = status.state;
    if (!['available', 'downloaded'].includes(initialState)) {
      throw new Error('Check for a newer published version before installing.');
    }
    busy = true;
    try {
      const backup = await prepareVerifiedInstalledUpdate({
        state: initialState,
        getState: () => status.state,
        downloadUpdate: async () => {
          announce({ state: 'downloading', progress: 0, message: 'Downloading the published Keeper update…' });
          await autoUpdater.downloadUpdate();
        },
        createSafetyBackup,
        workspaceRaw,
        getCurrentWorkspaceRaw: typeof getCurrentWorkspaceRaw === 'function'
          ? () => getCurrentWorkspaceRaw(_event, workspaceRaw)
          : undefined,
      });
      const installVersion = status.available_version;
      recordInstalledUpdateAttempt(app.getPath('userData'), {
        fromVersion: app.getVersion(), toVersion: installVersion, backup,
      });
      announce({
        state: 'installing',
        recovery_backup_id: backup.id,
        message: 'Verified campaign backup saved. Installing the update and restarting…',
      });
      setImmediate(() => {
        // A late updater error must still cancel the restart, even when it
        // arrives after backup preparation and before this queued callback.
        if (status.state !== 'installing' || status.available_version !== installVersion) {
          announce({ state: 'error', message: 'Installation was stopped because the update is no longer ready. Your campaign backup is still available.' });
          return;
        }
        // Consent was already given for this update. Run the update installer
        // unattended and force restart; the first installation keeps its wizard.
        try { autoUpdater.quitAndInstall(true, true); }
        catch {
          announce({ state: 'error', message: 'Installer could not start. Your campaign backup is still available.' });
        }
      });
      return { started: true, backup };
    } catch (error) {
      // A failed download or snapshot must not close Keeper. If the update
      // downloaded successfully, keep it ready for a later backup retry.
      if (status.state === 'downloaded') {
        announce({ state: 'downloaded', message: 'Update ready, but installation was stopped: ' + String(error?.message || error) });
      } else {
        announce({ state: 'error', message: 'Update not installed: ' + String(error?.message || error) });
      }
      throw error;
    } finally {
      busy = false;
    }
  });

  // An optional background *check* only. Never downloads or installs without user approval.
  if (app.isPackaged && !portable) {
    setTimeout(() => { if (status.state === 'idle') checkForUpdates(); }, 15000);
    // Background checks never trigger download, installation or restart.
    const timer = setInterval(() => {
      if (['idle', 'current', 'error'].includes(status.state)) checkForUpdates();
    }, 6 * 60 * 60 * 1000);
    timer.unref?.();
  }
  return { getStatus: () => ({ ...status }) };
}

module.exports = { registerDesktopUpdater };

const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell, screen, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createBackup, recoverInterruptedMediaRestore } = require('./backup');
const { readCurrentSnapshot } = require('./workspaceSnapshot');
const { RECOVERY_URL, recoverPendingRestore, registerDesktopMaintenance } = require('./maintenance');
const { createCopiedProfileBackup } = require('./copiedProfileMigration');
const { registerDesktopUpdater } = require('./updates');
const { isSafePlayerDisplayUrl, playerDisplayBounds } = require('./playerDisplayWindow');
const { preparePortableStorage } = require('./portable');
const { rendererResponse } = require('./rendererProtocol');
const { resolveAttachmentFile, canOpenAttachmentExternally } = require('./attachmentSafety');

const APP_SCHEME = 'rqk';
const APP_HOST = 'desktop';
const ATTACHMENT_SCHEME = 'rqk-attachment';
const START_URL = `${APP_SCHEME}://${APP_HOST}/home`;
const PACK_FORMAT = 'rookie-quest-keeper-campaign-pack';
let startingKeeper = true;
let maintenance = null;

// Must run before app.whenReady and before Chromium initialises storage.
// A portable launch must fail closed if the USB is read-only/unavailable;
// silently falling back to C: would risk 'missing' campaigns.
const portableStorage = preparePortableStorage(app);

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: ATTACHMENT_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function safeSegment(value, fallback = 'item') {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
}

function attachmentRoot() {
  return path.join(app.getPath('userData'), 'campaign-packs');
}

function attachmentFileFor(requestUrl) {
  return resolveAttachmentFile(attachmentRoot(), requestUrl);
}

async function installLocalProtocols() {
  protocol.handle(APP_SCHEME, (request) => {
    if (request.url === RECOVERY_URL) return new Response('<!doctype html><title>Keeper recovery</title>', { headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'none'" } });
    return rendererResponse(path.join(__dirname, 'renderer'), request.url);
  });

  protocol.handle(ATTACHMENT_SCHEME, (request) => {
    const filePath = attachmentFileFor(request.url);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response('Attachment not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function writePackAttachments(pack) {
  const packId = safeSegment(pack.pack_id, 'imported-pack');
  const packDir = path.join(attachmentRoot(), packId);
  // Content patches are incremental: never delete older maps/music simply
  // because they were not included in this smaller update.
  fs.mkdirSync(packDir, { recursive: true });

  const attachmentUrls = {};
  const attachments = Array.isArray(pack.attachments) ? pack.attachments : [];
  const seen = new Set();
  for (const [index, attachment] of attachments.entries()) {
    if (!attachment || typeof attachment !== 'object') continue;
    const id = safeSegment(attachment.id, `attachment-${index + 1}`);
    if (seen.has(id)) throw new Error(`Duplicate attachment ID: ${id}`);
    seen.add(id);
    const originalName = String(attachment.file_name || attachment.relative_path || attachment.title || id);
    const ext = path.extname(originalName).slice(0, 12);
    const fileName = `${id}${ext}`;
    const target = path.join(packDir, fileName);
    const base64 = String(attachment.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!base64) continue;
    if (base64.length > 36 * 1024 * 1024) {
      throw new Error(`Attachment "${originalName}" exceeds Keeper's pack size limit.`);
    }
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > 25 * 1024 * 1024) {
      throw new Error(`Attachment "${originalName}" is larger than the 25 MB desktop pack limit.`);
    }
    // Write each asset atomically. A failed write must not leave a half-file
    // masquerading as a valid campaign image or audio track.
    const pending = `${target}.${process.pid}.${index}.pending`;
    try {
      fs.writeFileSync(pending, bytes, { flag: 'wx' });
      fs.renameSync(pending, target);
    } finally {
      if (fs.existsSync(pending)) fs.rmSync(pending, { force: true });
    }
    attachmentUrls[String(attachment.id || id)] = `${ATTACHMENT_SCHEME}://${packId}/${encodeURIComponent(fileName)}`;
  }
  return attachmentUrls;
}

async function importCampaignPack(_event, workspaceRaw) {
  const result = await dialog.showOpenDialog({
    title: 'Import Campaign or Campaign Update',
    properties: ['openFile'],
    filters: [
      { name: 'Keeper Campaign and Update Packs', extensions: ['rqkpack', 'rqkupdate', 'json'] },
    ],
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };

  const sourcePath = result.filePaths[0];
  let pack;
  try {
    pack = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch {
    throw new Error('Keeper could not read that campaign pack.');
  }

  if (!pack || pack.format !== PACK_FORMAT || pack.version !== 1 || !pack.workspace) {
    throw new Error('That file is not a supported Rookie Quest Keeper campaign pack.');
  }
  const isUpdate = pack.pack_type === 'campaign-update';
  if (pack.pack_type && !isUpdate) {
    throw new Error('Unknown Keeper package type.');
  }
  if (isUpdate && !/^[a-zA-Z0-9._-]{1,120}$/.test(String(pack.pack_id || ''))) {
    throw new Error('Campaign update is missing a safe, stable pack ID.');
  }
  if (isUpdate) {
    const confirmation = await dialog.showMessageBox({
      type: 'question',
      title: 'Apply Campaign Update',
      message: `Apply "${String(pack.pack_name || 'Campaign Update').slice(0, 160)}" to your offline library?`,
      detail: 'Keeper will keep your existing characters and session notes, add or refresh campaign reference material and back up your workspace first. This is a content update, not an application update.',
      buttons: ['Apply update', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (confirmation.response !== 0) return { canceled: true };
  }

  // Back up before an import can overwrite local attachments with matching pack IDs.
  maintenance.assertCanMutate();
  const saved = await readCurrentSnapshot(primaryWindow, _event.sender, workspaceRaw);
  maintenance.assertCanMutate();
  createBackup(app.getPath('userData'), saved.workspace, 'before-import', saved.browserStorage);
  const attachmentUrls = writePackAttachments(pack);
  return {
    canceled: false,
    file_name: path.basename(sourcePath),
    pack: {
      format: pack.format,
      version: pack.version,
      pack_id: String(pack.pack_id || ''),
      pack_name: String(pack.pack_name || 'Campaign Pack'),
      pack_type: isUpdate ? 'campaign-update' : 'campaign-pack',
      created_at: pack.created_at || null,
      workspace: pack.workspace,
      attachment_urls: attachmentUrls,
    },
  };
}

let playerDisplayViewer = null;
let primaryWindow = null;
// bootstrap.js already owns the per-profile single-instance lock. Reopening
// the shortcut focuses that process instead of leaving the user waiting.
app.on('second-instance', () => {
  if (!primaryWindow || primaryWindow.isDestroyed()) return;
  if (primaryWindow.isMinimized()) primaryWindow.restore();
  primaryWindow.show();
  primaryWindow.focus();
});
function openPlayerDisplayWindow(requestUrl) {
  if (playerDisplayViewer && !playerDisplayViewer.isDestroyed()) {
    if (playerDisplayViewer.webContents.getURL() !== requestUrl) playerDisplayViewer.loadURL(requestUrl);
    if (playerDisplayViewer.isMinimized()) playerDisplayViewer.restore();
    playerDisplayViewer.show();
    playerDisplayViewer.focus();
    return playerDisplayViewer;
  }
  const secondaryBounds = playerDisplayBounds(screen.getAllDisplays(), screen.getPrimaryDisplay().id);
  const viewer = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 480,
    ...(secondaryBounds || {}),
    show: false,
    title: 'Rookie Quest Keeper · Player Display',
    backgroundColor: '#07131f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  playerDisplayViewer = viewer;
  viewer.once('ready-to-show', () => {
    if (secondaryBounds) viewer.maximize();
    viewer.show();
  });
  viewer.on('closed', () => { if (playerDisplayViewer === viewer) playerDisplayViewer = null; });

  // The dedicated audience screen is read-only navigation; it must never become
  // another GM workspace or open an external page from untrusted display data.
  viewer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  viewer.webContents.on('will-navigate', (event, nextUrl) => {
    if (!isSafePlayerDisplayUrl(nextUrl)) event.preventDefault();
  });
  viewer.loadURL(requestUrl);
  return viewer;
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: 'Rookie Quest Keeper',
    backgroundColor: '#101827',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  primaryWindow = window;
  window.on('closed', () => { if (primaryWindow === window) primaryWindow = null; });
  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafePlayerDisplayUrl(url)) {
      // In Windows Extend mode the audience window can be dragged to the TV.
      // Keep the GM's main window, workspace and keyboard focus intact.
      openPlayerDisplayWindow(url);
      return { action: 'deny' };
    }
    if (url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
      window.loadURL(url);
      return { action: 'deny' };
    }
    if (url.startsWith(`${ATTACHMENT_SCHEME}://`)) {
      const filePath = attachmentFileFor(url);
      if (filePath && canOpenAttachmentExternally(filePath)) shell.openPath(filePath);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  window.loadURL(START_URL);
  return window;
}

app.whenReady().then(async () => {
  recoverInterruptedMediaRestore(app.getPath('userData'));
  await installLocalProtocols();
  await recoverPendingRestore({ app, BrowserWindow });
  ipcMain.handle('rqk:import-campaign-pack', importCampaignPack);
  maintenance = registerDesktopMaintenance({
    app, ipcMain, dialog, getPrimaryWindow: () => primaryWindow, portable: Boolean(portableStorage),
    createCopiedProfileBackup: options => createCopiedProfileBackup({ ...options, app, BrowserWindow, session }),
  });

  registerDesktopUpdater({
    app, ipcMain, BrowserWindow, dialog, portable: Boolean(portableStorage),
    portableRoot: portableStorage ? path.dirname(portableStorage.dataRoot) : null,
    getCurrentWorkspaceSnapshot: (event, fallbackRaw) => readCurrentSnapshot(primaryWindow, event.sender, fallbackRaw),
    createSafetyBackup: (raw, reason, extras) => {
      maintenance.assertCanMutate();
      return createBackup(app.getPath('userData'), raw, reason, extras);
    },
  });
  createMainWindow();
  startingKeeper = false;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}).catch(error => {
  dialog.showErrorBox('Keeper needs recovery before it can start',
    `${String(error?.message || error)}\n\nKeep your application data folder and backups. Do not clear saved data; request recovery help before trying again.`);
  app.quit();
});

app.on('window-all-closed', () => {
  if (!startingKeeper && process.platform !== 'darwin') app.quit();
});

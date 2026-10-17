const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createBackup, listBackups, restoreBackup, exportPortableBackup, restorePortableBackup } = require('./backup');
const { registerDesktopUpdater } = require('./updates');
const { isSafePlayerDisplayUrl } = require('./playerDisplayWindow');
const { preparePortableStorage } = require('./portable');

const APP_SCHEME = 'rqk';
const APP_HOST = 'desktop';
const ATTACHMENT_SCHEME = 'rqk-attachment';
const START_URL = `${APP_SCHEME}://${APP_HOST}/home`;
const PACK_FORMAT = 'rookie-quest-keeper-campaign-pack';

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

function rendererFileFor(requestUrl) {
  const url = new URL(requestUrl);
  const rendererRoot = path.resolve(__dirname, 'renderer');
  let relativePath = decodeURIComponent(url.pathname || '/').replace(/^\/+/, '');

  if (!relativePath || !path.extname(relativePath)) {
    relativePath = 'index.html';
  }

  let candidate = path.resolve(rendererRoot, relativePath);
  if (!candidate.startsWith(rendererRoot)) {
    candidate = path.join(rendererRoot, 'index.html');
  }

  if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) {
    candidate = path.join(rendererRoot, 'index.html');
  }

  return candidate;
}

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
  const url = new URL(requestUrl);
  const packId = safeSegment(url.hostname, 'pack');
  const relativePath = decodeURIComponent(url.pathname || '/').replace(/^\/+/, '');
  const root = path.resolve(attachmentRoot(), packId);
  const candidate = path.resolve(root, relativePath);
  if (!candidate.startsWith(root)) return null;
  return candidate;
}

async function installLocalProtocols() {
  protocol.handle(APP_SCHEME, (request) => {
    const filePath = rendererFileFor(request.url);
    return net.fetch(pathToFileURL(filePath).toString());
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
  if (workspaceRaw != null) createBackup(app.getPath('userData'), workspaceRaw, 'before-import');
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

function openPlayerDisplayWindow(requestUrl) {
  const viewer = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 480,
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
      if (filePath && fs.existsSync(filePath)) shell.openPath(filePath);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  window.loadURL(START_URL);
  return window;
}

app.whenReady().then(async () => {
  await installLocalProtocols();
  ipcMain.handle('rqk:import-campaign-pack', importCampaignPack);
  ipcMain.handle('rqk:create-backup', (_event, raw, reason = 'manual') =>
    createBackup(app.getPath('userData'), raw, reason));
  ipcMain.handle('rqk:list-backups', () => listBackups(app.getPath('userData')));
  ipcMain.handle('rqk:restore-backup', (_event, id, currentRaw) =>
    restoreBackup(app.getPath('userData'), id, currentRaw));
  ipcMain.handle('rqk:export-portable-backup', async (_event, raw) => {
    const choice = await dialog.showOpenDialog({
      title: 'Choose where to save a portable Keeper backup',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (choice.canceled || !choice.filePaths?.[0]) return { canceled: true };
    return { canceled: false, ...exportPortableBackup(app.getPath('userData'), raw, choice.filePaths[0]) };
  });
  ipcMain.handle('rqk:restore-portable-backup', async (_event, currentRaw) => {
    const choice = await dialog.showOpenDialog({
      title: 'Choose your saved Rookie Quest Keeper backup folder',
      properties: ['openDirectory'],
    });
    if (choice.canceled || !choice.filePaths?.[0]) return { canceled: true };
    return { canceled: false, ...restorePortableBackup(app.getPath('userData'), choice.filePaths[0], currentRaw) };
  });
  registerDesktopUpdater({
    app, ipcMain, BrowserWindow, portable: Boolean(portableStorage),
    createSafetyBackup: (raw, reason) => raw == null
      ? null
      : createBackup(app.getPath('userData'), raw, reason),
  });
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

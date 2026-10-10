const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_SCHEME = 'rqk';
const APP_HOST = 'desktop';
const ATTACHMENT_SCHEME = 'rqk-attachment';
const START_URL = `${APP_SCHEME}://${APP_HOST}/home`;
const PACK_FORMAT = 'rookie-quest-keeper-campaign-pack';

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
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const attachmentUrls = {};
  for (const [index, attachment] of (Array.isArray(pack.attachments) ? pack.attachments : []).entries()) {
    if (!attachment || typeof attachment !== 'object') continue;
    const id = safeSegment(attachment.id, `attachment-${index + 1}`);
    const originalName = String(attachment.file_name || attachment.relative_path || attachment.title || id);
    const ext = path.extname(originalName).slice(0, 12);
    const fileName = `${id}${ext}`;
    const target = path.join(packDir, fileName);
    const base64 = String(attachment.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!base64) continue;
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > 25 * 1024 * 1024) {
      throw new Error(`Attachment "${originalName}" is larger than the 25 MB desktop pack limit.`);
    }
    fs.writeFileSync(target, bytes);
    attachmentUrls[String(attachment.id || id)] = `${ATTACHMENT_SCHEME}://${packId}/${encodeURIComponent(fileName)}`;
  }
  return attachmentUrls;
}

async function importCampaignPack() {
  const result = await dialog.showOpenDialog({
    title: 'Import Rookie Quest Keeper Campaign Pack',
    properties: ['openFile'],
    filters: [
      { name: 'Rookie Quest Keeper Campaign Pack', extensions: ['rqkpack', 'json'] },
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

  const attachmentUrls = writePackAttachments(pack);
  return {
    canceled: false,
    file_name: path.basename(sourcePath),
    pack: {
      format: pack.format,
      version: pack.version,
      pack_id: String(pack.pack_id || ''),
      pack_name: String(pack.pack_name || 'Campaign Pack'),
      created_at: pack.created_at || null,
      workspace: pack.workspace,
      attachment_urls: attachmentUrls,
    },
  };
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
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

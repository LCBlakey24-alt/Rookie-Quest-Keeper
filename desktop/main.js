const { app, BrowserWindow, net, protocol } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_SCHEME = 'rqk';
const APP_HOST = 'desktop';
const START_URL = `${APP_SCHEME}://${APP_HOST}/home`;

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

async function installLocalProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const filePath = rendererFileFor(request.url);
    return net.fetch(pathToFileURL(filePath).toString());
  });
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
    }
    return { action: 'deny' };
  });

  window.loadURL(START_URL);
  return window;
}

app.whenReady().then(async () => {
  await installLocalProtocol();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

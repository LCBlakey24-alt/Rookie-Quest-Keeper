'use strict';

// Chromium only opens a newly created temporary COPY. The selected earlier
// Keeper folder is read with ordinary filesystem calls and is never passed to
// Electron as userData/sessionData/a persistent partition.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { checkWorkspace, exportPortableBackup, previewPortableBackup } = require('./backup');
const { SUPPLEMENTAL_POLICY, validateBrowserStorage, MAX_BROWSER_STORAGE_KEYS } = require('./browserStorage');

const WORKSPACE_KEY = 'rqk.desktopWorkspace.v1';
const READ_URL = 'rqk://desktop/__copied_profile_read__';
const MAX_PROFILE_BYTES = 512 * 1024 * 1024;
const MAX_TREE_FILES = 100000;

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}

function ordinaryDirectory(directory) {
  const info = fs.lstatSync(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Choose an ordinary copied Keeper folder. Links and junctions are not supported.');
}

function digestFile(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('The copied Keeper folder contains a link or unsupported file.');
  const flags = fs.constants.O_RDONLY | (process.platform === 'win32' ? 0 : (fs.constants.O_NOFOLLOW || 0));
  const descriptor = fs.openSync(file, flags);
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let size = 0;
  try {
    if (!fs.fstatSync(descriptor).isFile()) throw new Error('The copied Keeper file changed while it was read.');
    let count;
    while ((count = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, count)); size += count;
    }
  } finally { fs.closeSync(descriptor); }
  return { size, sha256: hash.digest('hex') };
}

function inspectOrdinaryTree(root, maxBytes = Infinity) {
  ordinaryDirectory(root);
  const entries = [];
  let totalBytes = 0;
  function visit(directory, prefix = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const relative = prefix + name;
      const file = path.join(directory, name);
      const info = fs.lstatSync(file);
      if (info.isSymbolicLink()) throw new Error('The copied Keeper folder contains a link or junction. No source files were changed.');
      if (info.isDirectory()) {
        entries.push({ name: relative, type: 'directory' });
        visit(file, relative + '/');
      } else if (info.isFile()) {
        if (totalBytes + info.size > maxBytes) throw new Error('The copied browser-storage folder exceeds the 512 MB inspection limit.');
        const digest = digestFile(file);
        totalBytes += digest.size;
        if (totalBytes > maxBytes) throw new Error('The copied browser-storage folder exceeds the 512 MB inspection limit.');
        entries.push({ name: relative, type: 'file', ...digest });
      } else throw new Error('The copied Keeper folder contains an unsupported file.');
      if (entries.length > MAX_TREE_FILES) throw new Error('The copied Keeper folder has too many files to inspect safely.');
    }
  }
  visit(root);
  return entries;
}

function assertUnchanged(root, expected, maxBytes = Infinity) {
  if (JSON.stringify(inspectOrdinaryTree(root, maxBytes)) !== JSON.stringify(expected)) {
    throw new Error('The selected copy changed during inspection. Close the earlier Keeper, make a fresh copy, then try again.');
  }
}

function copyOrdinaryTree(source, destination, maxBytes = Infinity) {
  const before = inspectOrdinaryTree(source, maxBytes);
  fs.mkdirSync(destination, { recursive: false, mode: 0o700 });
  for (const entry of before) {
    const incoming = path.join(source, ...entry.name.split('/'));
    const outgoing = path.join(destination, ...entry.name.split('/'));
    if (entry.type === 'directory') fs.mkdirSync(outgoing, { mode: 0o700 });
    else {
      if (fs.lstatSync(incoming).isSymbolicLink()) throw new Error('The selected copy changed while files were being copied.');
      fs.copyFileSync(incoming, outgoing, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(outgoing, 0o600);
      const copied = digestFile(outgoing);
      if (copied.size !== entry.size || copied.sha256 !== entry.sha256) {
        throw new Error('The copied Keeper files could not be verified. No source files were changed.');
      }
    }
  }
  assertUnchanged(source, before, maxBytes);
  assertUnchanged(destination, before, maxBytes);
  return before;
}

function browserReadExpression() {
  // Filter key names BEFORE getItem. Cookies, account tokens and unknown key
  // values never cross from the isolated renderer into the application.
  return `(() => {
    const policy = ${JSON.stringify(SUPPLEMENTAL_POLICY)};
    const supported = key => typeof key === 'string' && key.length <= 512
      && !/[\\u0000-\\u001f\\u007f]/.test(key)
      && (policy.exactKeys.includes(key) || policy.prefixKeys.some(prefix => key.startsWith(prefix) && key.length > prefix.length));
    if (localStorage.length > ${MAX_BROWSER_STORAGE_KEYS + 1}) throw new Error('Too many browser records in the selected copy.');
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(key => typeof key === 'string');
    const selected = keys.filter(key => key !== ${JSON.stringify(WORKSPACE_KEY)} && supported(key)).sort();
    return {
      workspace: localStorage.getItem(${JSON.stringify(WORKSPACE_KEY)}),
      browser_storage: Object.fromEntries(selected.map(key => [key, localStorage.getItem(key)])),
      omitted_keys: keys.filter(key => key !== ${JSON.stringify(WORKSPACE_KEY)} && !supported(key)).map(key => key.slice(0, 512)).sort()
    };
  })()`;
}

async function withTimeout(operation, message) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 30000); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function readIsolatedBrowserStorage({ copiedSessionRoot, BrowserWindow, session }) {
  const isolated = session.fromPath(copiedSessionRoot, { cache: false });
  let window;
  try {
    isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    isolated.setPermissionCheckHandler(() => false);
    isolated.setDevicePermissionHandler?.(() => false);
    isolated.on('will-download', event => event.preventDefault());
    isolated.webRequest.onBeforeRequest((details, callback) => callback({ cancel: details.url !== READ_URL }));
    isolated.protocol.handle('rqk', request => request.url === READ_URL
      ? new Response('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'" },
      })
      : new Response('Not found', { status: 404 }));
    window = new BrowserWindow({
      show: false,
      webPreferences: { session: isolated, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, devTools: false },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (url !== READ_URL) event.preventDefault(); });
    window.webContents.on('will-redirect', event => event.preventDefault());
    await withTimeout(window.loadURL(READ_URL), 'The copied browser profile could not be opened safely.');
    const result = await withTimeout(window.webContents.executeJavaScript(browserReadExpression()), 'The copied campaign records could not be read safely.');
    checkWorkspace(result?.workspace);
    const browserStorage = validateBrowserStorage(result.browser_storage);
    if (!Array.isArray(result.omitted_keys) || result.omitted_keys.some(key => typeof key !== 'string')) {
      throw new Error('The copied browser-storage inspection returned invalid results.');
    }
    return { workspace: result.workspace, browser_storage: browserStorage, omitted_keys: result.omitted_keys };
  } finally {
    if (window && !window.isDestroyed()) window.destroy();
    // Only the isolated temporary profile is cleared. Electron sessions have
    // no destroy API, so Windows can retain handles until this app exits.
    try { await isolated.clearStorageData({ storages: ['localstorage'] }); } catch { /* Best-effort cleanup of our temporary copy. */ }
    try { await isolated.closeAllConnections(); } catch { /* No network was allowed. */ }
    try { isolated.protocol.unhandle('rqk'); } catch { /* This session is never reused. */ }
  }
}

async function createCopiedProfileBackup({ sourceDataRoot, destinationDir, app, BrowserWindow, session }) {
  if (!app || !BrowserWindow || !session?.fromPath) throw new Error('Copied Keeper inspection is unavailable in this application.');
  ordinaryDirectory(sourceDataRoot);
  ordinaryDirectory(destinationDir);
  const source = fs.realpathSync(sourceDataRoot);
  const destination = fs.realpathSync(destinationDir);
  const current = fs.realpathSync(app.getPath('userData'));
  const temporaryParent = fs.realpathSync(app.getPath('temp'));
  if (isWithin(source, destination) || isWithin(source, temporaryParent)
      || isWithin(current, source) || isWithin(source, current) || isWithin(current, destination)) {
    throw new Error('Choose a separate earlier-Keeper copy and an export folder outside Keeper application data.');
  }
  const selectedProfile = path.join(source, 'session-data', 'Local Storage');
  ordinaryDirectory(path.join(source, 'session-data'));
  ordinaryDirectory(selectedProfile);
  const temporary = fs.mkdtempSync(path.join(temporaryParent, 'rqk-copied-keeper-'));
  let exported;
  let result;
  try {
    const copiedSessionRoot = path.join(temporary, 'isolated-session');
    fs.mkdirSync(copiedSessionRoot, { mode: 0o700 });
    const profileBefore = copyOrdinaryTree(selectedProfile, path.join(copiedSessionRoot, 'Local Storage'), MAX_PROFILE_BYTES);
    const stagingData = path.join(temporary, 'export-staging');
    fs.mkdirSync(stagingData, { mode: 0o700 });
    const selectedMedia = path.join(source, 'campaign-packs');
    const mediaBefore = fs.existsSync(selectedMedia) ? copyOrdinaryTree(selectedMedia, path.join(stagingData, 'campaign-packs')) : null;
    const read = await readIsolatedBrowserStorage({ copiedSessionRoot, BrowserWindow, session });
    assertUnchanged(selectedProfile, profileBefore, MAX_PROFILE_BYTES);
    if (mediaBefore) assertUnchanged(selectedMedia, mediaBefore);
    else if (fs.existsSync(selectedMedia)) throw new Error('The selected copy changed during inspection. Make a fresh closed copy.');
    exported = exportPortableBackup(stagingData, read.workspace, destination, read.browser_storage);
    const preview = previewPortableBackup(exported.export_path);
    assertUnchanged(selectedProfile, profileBefore, MAX_PROFILE_BYTES);
    if (mediaBefore) assertUnchanged(selectedMedia, mediaBefore);
    else if (fs.existsSync(selectedMedia)) throw new Error('The selected copy changed during inspection. Make a fresh closed copy.');
    result = {
      export_path: exported.export_path,
      preview,
      omitted_key_count: read.omitted_keys.length,
      omitted_keys: read.omitted_keys,
      temporary_cleanup_pending: false,
    };
  } catch (error) {
    // This path was freshly generated by exportPortableBackup for this call.
    // Never remove anything from the selected source or an earlier export.
    if (exported?.export_path) fs.rmSync(exported.export_path, { recursive: true, force: true });
    throw error;
  } finally {
    try { fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
    catch { if (result) result.temporary_cleanup_pending = true; }
  }
  return result;
}

module.exports = { createCopiedProfileBackup, inspectOrdinaryTree, copyOrdinaryTree, browserReadExpression, readIsolatedBrowserStorage };

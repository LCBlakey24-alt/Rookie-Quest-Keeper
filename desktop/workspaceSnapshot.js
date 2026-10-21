'use strict';

// This must agree with frontend/src/preview/previewMode.js. Read only the
// campaign workspace; never export authentication or unrelated browser keys.
const DESKTOP_STORAGE_KEY = 'rqk.desktopWorkspace.v1';
const { SUPPLEMENTAL_POLICY, validateBrowserStorage } = require('./browserStorage');
const EMPTY_WORKSPACE = JSON.stringify({ version: 1, campaigns: [], characters: [], notes: [], recaps: [], homebrew: [], collections: {}, objects: {}, receipts: {} });

function workspaceContents(window, sender) {
  const contents = window?.webContents;
  if (!window || window.isDestroyed() || !contents || contents.isDestroyed()
      || sender !== contents || !contents.getURL().startsWith('rqk://desktop/')) {
    throw new Error('The main Keeper window is unavailable. Nothing was installed.');
  }
  return contents;
}

async function readCurrentWorkspace(window, sender, firstRunWorkspace) {
  const contents = workspaceContents(window, sender);
  // A click may precede a lengthy download. Query again after the download,
  // then request a Chromium flush before the verified safety snapshot. Electron
  // does not provide a disk-durability acknowledgement for this flush request.
  const raw = await contents.executeJavaScript(`localStorage.getItem(${JSON.stringify(DESKTOP_STORAGE_KEY)})`);
  contents.session.flushStorageData();
  if (raw === null) return firstRunWorkspace;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Keeper could not read the latest saved workspace. Nothing was installed.');
  }
  return raw;
}

async function writeCurrentWorkspace(window, sender, raw) {
  const contents = workspaceContents(window, sender);
  const key = JSON.stringify(DESKTOP_STORAGE_KEY);
  // localStorage.setItem is atomic on quota failure. Capture the previous
  // value in the same renderer task so a failed flush can also be undone.
  const previous = await contents.executeJavaScript(`(() => {
    const previous = localStorage.getItem(${key});
    localStorage.setItem(${key}, ${JSON.stringify(raw)});
    return previous;
  })()`);
  try { contents.session.flushStorageData(); }
  catch (error) {
    try {
      await contents.executeJavaScript(previous === null
        ? `localStorage.removeItem(${key})`
        : `localStorage.setItem(${key}, ${JSON.stringify(previous)})`);
    } catch { /* The before-restore snapshot remains available for recovery. */ }
    throw error;
  }
}

// These functions run in the isolated renderer. Select names before reading
// values so authentication/unknown storage never enters a campaign snapshot.
function captureTask(policy, workspaceKey) {
  const supported = key => typeof key === 'string' && key.length <= 512 && !/[\u0000-\u001f\u007f]/.test(key)
    && (policy.exactKeys.includes(key)
    || policy.prefixKeys.some(prefix => key.startsWith(prefix) && key.length > prefix.length));
  const browserStorage = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (typeof key === 'string' && supported(key)) browserStorage[key] = localStorage.getItem(key);
  }
  return { workspace: localStorage.getItem(workspaceKey), browserStorage };
}

function replaceTask(policy, workspaceKey, workspace, incoming, expected = null) {
  const supported = key => typeof key === 'string' && key.length <= 512 && !/[\u0000-\u001f\u007f]/.test(key)
    && (policy.exactKeys.includes(key)
    || policy.prefixKeys.some(prefix => key.startsWith(prefix) && key.length > prefix.length));
  const keys = () => {
    const result = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (typeof key === 'string' && supported(key)) result.push(key);
    }
    return result;
  };
  const previous = { workspace: localStorage.getItem(workspaceKey), browserStorage: {} };
  for (const key of keys()) previous.browserStorage[key] = localStorage.getItem(key);
  const canonical = map => JSON.stringify(Object.keys(map).sort().map(key => [key, map[key]]));
  if (expected && (previous.workspace !== (expected.workspaceMissing ? null : expected.workspace)
      || canonical(previous.browserStorage) !== canonical(expected.browserStorage))) {
    return { ok: false, stale: true };
  }
  const apply = (raw, extras) => {
    // Free the space occupied by the replaced keys before writing. All changes
    // and quota rollback occur in this single, non-interleaved renderer task.
    if (extras !== null) for (const key of keys()) localStorage.removeItem(key);
    localStorage.removeItem(workspaceKey);
    if (raw !== null) localStorage.setItem(workspaceKey, raw);
    if (extras !== null) for (const [key, value] of Object.entries(extras)) localStorage.setItem(key, value);
  };
  try { apply(workspace, incoming); }
  catch (error) {
    let rolledBack = true;
    try { apply(previous.workspace, incoming === null ? null : previous.browserStorage); }
    catch { rolledBack = false; }
    return { ok: false, rolledBack, message: String(error?.message || error) };
  }
  return { ok: true, previous };
}

async function readCurrentSnapshot(window, sender, firstRunWorkspace = EMPTY_WORKSPACE) {
  const contents = workspaceContents(window, sender);
  const snapshot = await contents.executeJavaScript(`(${captureTask.toString()})(${JSON.stringify(SUPPLEMENTAL_POLICY)}, ${JSON.stringify(DESKTOP_STORAGE_KEY)})`);
  contents.session.flushStorageData(); // Request only; Electron does not acknowledge disk durability.
  if (!snapshot || (snapshot.workspace !== null && (typeof snapshot.workspace !== 'string' || !snapshot.workspace.trim()))) {
    throw new Error('Keeper could not read the latest saved workspace. No saved data was changed.');
  }
  return { workspace: snapshot.workspace === null ? (firstRunWorkspace ?? EMPTY_WORKSPACE) : snapshot.workspace,
    browserStorage: validateBrowserStorage(snapshot.browserStorage), workspaceMissing: snapshot.workspace === null };
}

async function writeCurrentSnapshot(window, sender, workspace, browserStorage = null, expected = null) {
  const contents = workspaceContents(window, sender);
  const extras = browserStorage === null ? null : validateBrowserStorage(browserStorage);
  const invoke = (raw, values, guard = null) => contents.executeJavaScript(`(${replaceTask.toString()})(${JSON.stringify(SUPPLEMENTAL_POLICY)}, ${JSON.stringify(DESKTOP_STORAGE_KEY)}, ${JSON.stringify(raw)}, ${JSON.stringify(values)}, ${JSON.stringify(guard)})`);
  const result = await invoke(workspace, extras, expected);
  if (!result?.ok) {
    if (result?.stale) {
      const error = new Error('Your saved information changed while the restore was being prepared. Newer saved values were kept. Pause editing and try the restore again.');
      error.code = 'WORKSPACE_CHANGED_DURING_RESTORE';
      throw error;
    }
    throw new Error(result?.rolledBack
      ? 'Keeper could not save the restored workspace and browser records. Previous saved values were restored.'
      : 'Keeper could not complete browser-storage recovery. The before-restore backup must be recovered before editing.');
  }
  try { contents.session.flushStorageData(); }
  catch (error) {
    try { await invoke(result.previous.workspace, extras === null ? null : result.previous.browserStorage); }
    catch { /* A durable restore journal keeps the safety snapshot available. */ }
    throw error;
  }
}

module.exports = { readCurrentWorkspace, writeCurrentWorkspace, readCurrentSnapshot, writeCurrentSnapshot, EMPTY_WORKSPACE };

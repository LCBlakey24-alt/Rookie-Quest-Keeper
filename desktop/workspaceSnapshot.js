'use strict';

// This must agree with frontend/src/preview/previewMode.js. Read only the
// campaign workspace; never export authentication or unrelated browser keys.
const DESKTOP_STORAGE_KEY = 'rqk.desktopWorkspace.v1';

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

module.exports = { readCurrentWorkspace, writeCurrentWorkspace };

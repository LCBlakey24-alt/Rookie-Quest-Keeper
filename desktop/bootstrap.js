'use strict';

// This trust boundary remains inside the manually installed bootstrap EXE.
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const keys = require('./programTrust.json');
const { preparePortableStorage } = require('./portable');
const { selectApp } = require('./programRelease');
const bootstrapVersion = require('./package.json').version;
global.__rqkProgramTrust = keys;
global.__rqkBootstrapVersion = bootstrapVersion;
const storage = preparePortableStorage(app);
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
  return;
}
let release;
try {
  if (storage) release = selectApp(storage.dataRoot, keys, {
    electron: process.versions.electron, platform: process.platform, arch: process.arch,
    bootstrapVersion,
  });
} catch (error) {
  // Authentication/storage failures do not silently run a different version.
  dialog.showErrorBox('Keeper program update could not start', error.message + '\nYour campaign files have not been changed.');
  app.exit(1);
}
if (release) {
  // Signed app-only updates reuse the dependencies shipped in this bootstrap.
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  Module._initPaths();
  app.getVersion = () => release.version;
  global.__rqkMarkProgramHealthy = release.markHealthy;
  require(path.join(release.folder, 'main.js'));
} else {
  global.__rqkMarkProgramHealthy = () => {
    if (!storage) return;
    const file = path.join(storage.dataRoot, 'program-updates', 'last-install.json');
    try {
      const entry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
      if (entry.state === 'starting' && entry.version === bootstrapVersion) {
        require('./programRelease').atomicJson(file, { ...entry, state: 'installed' });
      }
    } catch { /* No pending full-runtime installation. */ }
  };
  require('./main');
}

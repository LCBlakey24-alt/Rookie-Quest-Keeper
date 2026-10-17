'use strict';

const fs = require('fs');
const path = require('path');

const PORTABLE_DIR_ENV = 'PORTABLE_EXECUTABLE_DIR';

/**
 * electron-builder's Windows portable executable sets this variable when
 * launched. Never enable portable mode merely because an installer happens
 * to be copied to a USB drive.
 */
function portableRoot(env = process.env) {
  const root = env?.[PORTABLE_DIR_ENV];
  return typeof root === 'string' && path.isAbsolute(root) && root.trim()
    ? path.resolve(root) : null;
}

function preparePortableStorage(app, env = process.env) {
  const root = portableRoot(env);
  if (!root) return null;
  const dataRoot = path.join(root, 'RookieQuestKeeperData');
  const sessionRoot = path.join(dataRoot, 'session-data');
  fs.mkdirSync(sessionRoot, { recursive: true });
  fs.accessSync(sessionRoot, fs.constants.R_OK | fs.constants.W_OK);
  app.setPath('userData', dataRoot);
  app.setPath('sessionData', sessionRoot);
  return { dataRoot, sessionRoot };
}

module.exports = { PORTABLE_DIR_ENV, portableRoot, preparePortableStorage };

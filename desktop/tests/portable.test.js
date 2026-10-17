'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { portableRoot, preparePortableStorage } = require('../portable');

test('regular installed Windows app does not redirect local user data to a USB', () => {
  assert.equal(portableRoot({}), null);
  const events = [];
  assert.equal(preparePortableStorage({ setPath: (...args) => events.push(args) }, {}), null);
  assert.deepEqual(events, []);
});

test('USB edition keeps both main campaign workspace and browser storage beside portable exe', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-usb-edition-'));
  try {
    const paths = {};
    const app = { setPath: (key, val) => { paths[key] = val; } };
    const result = preparePortableStorage(app, { PORTABLE_EXECUTABLE_DIR: root });
    assert.equal(result.dataRoot, path.join(root, 'RookieQuestKeeperData'));
    assert.equal(paths.userData, result.dataRoot);
    assert.equal(paths.sessionData, path.join(result.dataRoot, 'session-data'));
    assert.equal(fs.statSync(paths.sessionData).isDirectory(), true);
    const marker = path.join(paths.userData, 'marker.txt');
    fs.writeFileSync(marker, 'saved campaign');
    assert.equal(fs.readFileSync(marker, 'utf8'), 'saved campaign');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('portable mode needs absolute launch directory (not arbitrary relative path)', () => {
  assert.equal(portableRoot({ PORTABLE_EXECUTABLE_DIR: 'somewhere' }), null);
  assert.equal(portableRoot({ PORTABLE_EXECUTABLE_DIR: '' }), null);
});

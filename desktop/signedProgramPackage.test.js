'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { build } = require('./tools/build-program-package');
const { hash, readPackage, verifyEnvelope, decodeApp, safeAppPath } = require('./signedProgramPackage');
const { stageAppPackage, activateApp, selectApp, readActive, readLastAppResult } = require('./programRelease');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-signed-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const keys = { release: publicKey.export({ type: 'spki', format: 'pem' }) };
  const input = path.join(root, 'source');
  fs.mkdirSync(path.join(input, 'renderer'), { recursive: true });
  for (const [file, data] of Object.entries({ 'main.js': 'module.exports = 1;', 'preload.js': '', 'package.json': '{}', 'renderer/index.html': '<h1>Keeper</h1>' })) fs.writeFileSync(path.join(input, file), data);
  const output = path.join(root, 'downloads');
  build({ kind: 'app', input, output, version: '0.4.1', bootstrapMin: '0.4.0', electron: '44.6.0', privateKey, keyId: 'release' });
  return { root, keys, privateKey, file: path.join(output, 'Keeper-0.4.1.rqkprogram'), compatibility: {
    currentVersion: '0.4.0', bootstrapVersion: '0.4.0', electron: '44.6.0', platform: 'win32', arch: 'x64',
  } };
}

test('signed app package round trip stages all files, authenticates and commits startup health', t => {
  const f = fixture(t);
  const data = path.join(f.root, 'userData');
  fs.mkdirSync(data);
  fs.writeFileSync(path.join(data, 'campaign.json'), 'keep Eldritch Heralds');
  const staged = stageAppPackage(f.file, f.keys, f.compatibility, data);
  assert.equal(readActive(data), null);
  activateApp(data, staged);
  assert.equal(readActive(data).state, 'pending');
  const selected = selectApp(data, f.keys, f.compatibility);
  assert.equal(selected.version, '0.4.1');
  assert.equal(readActive(data).state, 'trying');
  selected.markHealthy();
  assert.equal(readActive(data).state, 'healthy');
  assert.equal(fs.readFileSync(path.join(data, 'campaign.json'), 'utf8'), 'keep Eldritch Heralds');
});

test('failed first start rolls back to bundled app without changing campaigns', t => {
  const f = fixture(t);
  const data = path.join(f.root, 'data');
  activateApp(data, stageAppPackage(f.file, f.keys, f.compatibility, data));
  selectApp(data, f.keys, f.compatibility);
  assert.equal(selectApp(data, f.keys, f.compatibility), null);
  assert.equal(readActive(data), null);
  assert.equal(readLastAppResult(data).state, 'rolled_back');
});

test('unknown publisher, unsigned and altered manifests cannot install', t => {
  const f = fixture(t);
  assert.throws(() => readPackage(f.file, {}, f.compatibility), /publisher/);
  const e = JSON.parse(fs.readFileSync(f.file));
  e.manifest = e.manifest.replace('0.4.1', '9.0.0');
  assert.throws(() => verifyEnvelope(e, f.keys), /signature/);
  e.signature = '';
  assert.throws(() => verifyEnvelope(e, f.keys), /signature/);
});

test('changed or missing parts and incompatible versions fail closed', t => {
  const f = fixture(t);
  for (const patch of [{ currentVersion: '0.4.1' }, { electron: '43.0.0' }, { arch: 'arm64' }, { bootstrapVersion: '0.3.8' }]) {
    assert.throws(() => readPackage(f.file, f.keys, { ...f.compatibility, ...patch }), /newer|different/);
  }
  const p = path.join(path.dirname(f.file), 'Keeper-0.4.1-1.rqkpart');
  fs.appendFileSync(p, 'tampered');
  assert.throws(() => readPackage(f.file, f.keys, f.compatibility), /changed/);
  fs.unlinkSync(p);
  assert.throws(() => readPackage(f.file, f.keys, f.compatibility), /ENOENT/);
});

test('unsafe paths, duplicate files and malformed compressed bundles are rejected', () => {
  for (const p of ['../main.js', 'renderer/../../evil.js', 'renderer/C:/evil', 'renderer/foo:bar', 'renderer/NUL.txt', 'renderer/a./b', '/main.js']) assert.equal(safeAppPath(p), false, p);
  const file = { name: 'renderer/../main.js', base64: '', sha256: hash(Buffer.alloc(0)) };
  assert.throws(() => decodeApp(zlib.gzipSync(JSON.stringify({ files: [file] }))), /Unsafe/);
  assert.throws(() => decodeApp(Buffer.from('not gzip')));
});

test('modified installed code is detected before require executes it', t => {
  const f = fixture(t);
  const data = path.join(f.root, 'data');
  const staged = stageAppPackage(f.file, f.keys, f.compatibility, data);
  activateApp(data, staged);
  fs.appendFileSync(path.join(staged.folder, 'main.js'), 'evil();');
  assert.throws(() => selectApp(data, f.keys, f.compatibility), /changed/);
});

test('unlisted dependency injection is rejected before loading an app', t => {
  const f = fixture(t);
  const data = path.join(f.root, 'data');
  const staged = stageAppPackage(f.file, f.keys, f.compatibility, data);
  activateApp(data, staged);
  const rogue = path.join(staged.folder, 'node_modules', 'electron-updater');
  fs.mkdirSync(rogue, { recursive: true });
  fs.writeFileSync(path.join(rogue, 'index.js'), 'evil();');
  assert.throws(() => selectApp(data, f.keys, f.compatibility), /Unexpected/);
});

test('signed traversal part names and duplicate part names are rejected', t => {
  const f = fixture(t);
  const e = JSON.parse(fs.readFileSync(f.file));
  const m = JSON.parse(e.manifest);
  m.parts[0].name = '../escape.rqkpart';
  e.manifest = JSON.stringify(m);
  e.signature = crypto.sign(null, Buffer.from(e.manifest), f.privateKey).toString('base64');
  assert.throws(() => verifyEnvelope(e, f.keys), /Unsafe/);
});

test('multiple signed parts reassemble in manifest order and reject changed individual parts', t => {
  const f = fixture(t);
  const output = path.join(f.root, 'split');
  const input = path.join(f.root, 'source');
  const result = build({ kind: 'app', input, output, version: '0.4.2', bootstrapMin: '0.4.0', electron: '44.6.0', privateKey: f.privateKey, keyId: 'release', partBytes: 100 });
  assert.ok(result.parts > 1);
  const file = path.join(output, 'Keeper-0.4.2.rqkprogram');
  assert.equal(readPackage(file, f.keys, f.compatibility).manifest.version, '0.4.2');
  fs.writeFileSync(path.join(output, 'Keeper-0.4.2-2.rqkpart'), Buffer.alloc(100));
  assert.throws(() => readPackage(file, f.keys, f.compatibility), /changed/);
});

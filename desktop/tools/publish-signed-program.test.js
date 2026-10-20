'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { build } = require('./build-program-package');
const { publish } = require('./publish-signed-program');

function fixtures(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-publisher-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'artifact');
  const updatesFolder = path.join(root, 'OneDrive', 'Keeper', 'Updates', 'Program Updates');
  const protectedKeyFile = path.join(root, 'local-dpapi-key.txt');
  fs.mkdirSync(path.join(source, 'renderer'), { recursive: true });
  fs.mkdirSync(path.join(source, 'tools'), { recursive: true });
  fs.mkdirSync(updatesFolder, { recursive: true });
  for (const name of [
    'main.js', 'preload.js', 'signedProgramPackage.js',
    'tools/sign-local-program.js', 'tools/build-program-package.js',
  ]) fs.writeFileSync(path.join(source, name), "'use strict';\n");
  fs.writeFileSync(path.join(source, 'renderer', 'index.html'), '<!doctype html><html><body>Keeper</body></html>');
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({
    name: 'keeper-test', version: '0.4.0', devDependencies: { electron: '44.6.0' },
  }));
  fs.writeFileSync(protectedKeyFile, 'test fake DPAPI envelope, not a private key');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const keyId = crypto.createHash('sha256').update(publicPem).digest('hex').slice(0, 16);
  const keys = { [keyId]: publicPem };
  fs.writeFileSync(path.join(source, 'programTrust.json'), JSON.stringify(keys));
  const dataFolder = path.join(root, 'real-campaign-data');
  fs.mkdirSync(dataFolder);
  const dataFile = path.join(dataFolder, 'never-change.txt');
  fs.writeFileSync(dataFile, 'campaigns stay untouched');
  const args = { source, updatesFolder, protectedKeyFile, releaseVersion: '0.4.4' };
  const signer = ({ mode, output, version, bootstrap, electron }) => {
    if (mode === 'check') return;
    build({ kind: 'app', input: source, output, version, bootstrapMin: bootstrap,
      electron, privateKey, keyId });
  };
  return { root, args, keys, signer, dataFile };
}

test('publisher creates a fresh signed release, leaves campaigns untouched, and refuses overwrite', t => {
  const f = fixtures(t);
  const folder = publish(f.args, { signer: f.signer, keys: f.keys });
  assert.equal(folder, path.join(f.args.updatesFolder, 'Keeper-0.4.4'));
  assert.ok(fs.existsSync(path.join(folder, 'Keeper-0.4.4.rqkprogram')));
  assert.ok(fs.existsSync(path.join(folder, 'Keeper-0.4.4-1.rqkpart')));
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), 'campaigns stay untouched');
  assert.throws(() => publish(f.args, { signer: f.signer, keys: f.keys }), /already exists/);
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), 'campaigns stay untouched');
});

test('publisher will not release a package signed with an untrusted key', t => {
  const f = fixtures(t);
  const { privateKey: wrongKey } = crypto.generateKeyPairSync('ed25519');
  const wrongSigner = ({ mode, output, version, bootstrap, electron }) => {
    if (mode === 'check') return;
    build({ kind: 'app', input: f.args.source, output, version,
      bootstrapMin: bootstrap, electron, privateKey: wrongKey, keyId: Object.keys(f.keys)[0] });
  };
  assert.throws(() => publish(f.args, { signer: wrongSigner, keys: f.keys }), /signature is invalid/);
  assert.deepEqual(fs.readdirSync(f.args.updatesFolder), []);
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), 'campaigns stay untouched');
});

test('publisher rejects wrong folder, a missing signing key and unsupported versions', t => {
  const f = fixtures(t);
  const other = path.join(f.root, 'wrong-folder');
  fs.mkdirSync(other);
  assert.throws(() => publish({ ...f.args, updatesFolder: other }, { signer: f.signer, keys: f.keys }), /Updates\/Program Updates/);
  assert.throws(() => publish({ ...f.args, releaseVersion: '0.4.0' }, { signer: f.signer, keys: f.keys }), /unsupported/);
  assert.throws(() => publish({ ...f.args, protectedKeyFile: path.join(f.root, 'no-key') }, { signer: f.signer, keys: f.keys }), /ENOENT/);
  assert.deepEqual(fs.readdirSync(f.args.updatesFolder), []);
});


test('publisher recognises an existing package in a descriptive OneDrive version folder', t => {
  const f = fixtures(t);
  const previous = path.join(f.args.updatesFolder, '0.4.4 - Offline Bestiary Safety');
  fs.mkdirSync(previous);
  fs.writeFileSync(path.join(previous, 'Keeper-0.4.4.rqkprogram'), 'existing signed descriptor');
  assert.throws(() => publish(f.args, { signer: f.signer, keys: f.keys }), /already present/);
  assert.equal(fs.readFileSync(path.join(previous, 'Keeper-0.4.4.rqkprogram'), 'utf8'), 'existing signed descriptor');
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), 'campaigns stay untouched');
});

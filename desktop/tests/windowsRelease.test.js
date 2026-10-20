'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const YAML = require('yaml');
const { verifyWindowsRelease } = require('../tools/verify-windows-release.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'keeper-release-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const installer = 'Rookie Quest Keeper Setup 0.5.0.exe';
  const payload = Buffer.from('synthetic installer; never a real executable');
  const sha512 = crypto.createHash('sha512').update(payload).digest('base64');
  const manifest = { version: '0.5.0', files: [{ url: installer, sha512, size: payload.length }], path: installer, sha512 };
  const config = { provider: 'github', owner: 'LCBlakey24-alt', repo: 'Rookie-Quest-Keeper', publisherName: ['Approved Test Publisher'] };
  const saveManifest = () => fs.writeFileSync(path.join(directory, 'latest.yml'), YAML.stringify(manifest));
  const saveConfig = () => fs.writeFileSync(path.join(directory, 'win-unpacked/resources/app-update.yml'), YAML.stringify(config));
  fs.mkdirSync(path.join(directory, 'win-unpacked/resources'), { recursive: true });
  fs.writeFileSync(path.join(directory, installer), payload);
  fs.writeFileSync(path.join(directory, `${installer}.blockmap`), 'synthetic blockmap');
  saveManifest(); saveConfig();
  return { directory, installer, manifest, config, saveManifest, saveConfig, verify: () => verifyWindowsRelease(directory, 'Approved Test Publisher', '0.5.0') };
}

test('release manifest matches the installer, pinned publisher and official feed', t => {
  const f = fixture(t);
  f.manifest.files[0].url = encodeURIComponent(f.installer); f.saveManifest();
  const verified = f.verify();
  assert.deepEqual(verified.assets, [f.installer, `${f.installer}.blockmap`, 'latest.yml']);
  assert.match(verified.sha256[f.installer], /^[a-f0-9]{64}$/);
});

for (const [name, mutate] of [
  ['tampered installer', f => fs.appendFileSync(path.join(f.directory, f.installer), 'tampered')],
  ['wrong hash', f => { f.manifest.files[0].sha512 = 'wrong'; f.saveManifest(); }],
  ['wrong size', f => { f.manifest.files[0].size++; f.saveManifest(); }],
  ['old version', f => { f.manifest.version = '0.4.9'; f.saveManifest(); }],
  ['remote asset', f => { f.manifest.files[0].url = 'https://example.test/installer.exe'; f.saveManifest(); }],
  ['path traversal', f => { f.manifest.files[0].url = '..%2Finstaller.exe'; f.saveManifest(); }],
  ['portable edition', f => { f.manifest.files[0].url = 'Keeper Portable.exe'; f.saveManifest(); }],
  ['mismatched legacy asset', f => { f.manifest.path = 'other.exe'; f.saveManifest(); }],
  ['additional installer', f => { f.manifest.files.push(f.manifest.files[0]); f.saveManifest(); }],
  ['missing blockmap', f => fs.unlinkSync(path.join(f.directory, `${f.installer}.blockmap`))],
  ['missing publisher', f => { delete f.config.publisherName; f.saveConfig(); }],
  ['additional unapproved publisher', f => { f.config.publisherName.push('Other Publisher'); f.saveConfig(); }],
  ['unofficial feed', f => { f.config.owner = 'someone-else'; f.saveConfig(); }],
  ['unofficial GitHub host', f => { f.config.host = 'untrusted.example'; f.saveConfig(); }],
  ['insecure feed protocol', f => { f.config.protocol = 'http'; f.saveConfig(); }],
  ['private feed', f => { f.config.private = true; f.saveConfig(); }],
  ['packaged feed credential', f => { f.config.token = 'synthetic-do-not-package'; f.saveConfig(); }],
]) {
  test(`release refuses ${name}`, t => {
    const f = fixture(t); mutate(f); assert.throws(f.verify);
  });
}

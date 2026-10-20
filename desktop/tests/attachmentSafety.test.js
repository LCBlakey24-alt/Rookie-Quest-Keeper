'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveAttachmentFile, canOpenAttachmentExternally } = require('../attachmentSafety');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-attachment-safety-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const media = path.join(root, 'campaign-packs');
  fs.mkdirSync(path.join(media, 'pack'), { recursive: true });
  fs.writeFileSync(path.join(media, 'pack', 'map one.png'), 'synthetic map');
  return { root, media };
}

test('resolves an existing encoded attachment within its campaign pack', t => {
  const { media } = fixture(t);
  assert.equal(resolveAttachmentFile(media, 'rqk-attachment://pack/map%20one.png'), path.join(media, 'pack', 'map one.png'));
  assert.equal(resolveAttachmentFile(media, 'rqk-attachment://pack/missing.png'), null);
  assert.equal(resolveAttachmentFile(media, 'rqk-attachment://pack/'), null);
});

test('rejects dot hosts, traversal, sibling-prefix paths and Windows special paths', t => {
  const { root, media } = fixture(t);
  fs.mkdirSync(path.join(media, 'pack-other'));
  fs.writeFileSync(path.join(media, 'pack-other', 'other.txt'), 'other pack');
  fs.writeFileSync(path.join(root, 'workspace.json'), 'private workspace');
  for (const url of [
    'rqk-attachment://../workspace.json',
    'rqk-attachment://./workspace.json',
    'rqk-attachment://pack/%2e%2e%2fpack-other/other.txt',
    'rqk-attachment://pack/%2e%2e%5cworkspace.json',
    'rqk-attachment://pack/C%3A/Windows/system.ini',
    'rqk-attachment://pack/map.png%3Arun.exe',
    'rqk-attachment://pack/CON.pdf',
    'rqk-attachment://pack/map%20one.png%20',
    'rqk-attachment://pack/map%20one.png.',
    'rqk-attachment://pack/%00map.png',
    'rqk-attachment://pack/%zz',
    'https://pack/map%20one.png',
    'rqk-attachment://user@pack/map%20one.png',
    'rqk-attachment://pack/map%20one.png?open=program',
  ]) assert.equal(resolveAttachmentFile(media, url), null, url);
});

test('rejects symbolic-link attachment files', { skip: process.platform === 'win32' }, t => {
  // Standard Windows runners do not normally grant symbolic-link creation.
  const { root, media } = fixture(t);
  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'private.txt'), 'private test data');
  fs.symlinkSync(path.join(outside, 'private.txt'), path.join(media, 'pack', 'linked.txt'));
  assert.equal(resolveAttachmentFile(media, 'rqk-attachment://pack/linked.txt'), null);
});

test('rejects linked pack directories including Windows junctions', t => {
  const { root, media } = fixture(t);
  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'private.txt'), 'private test data');
  // Windows junctions do not require symbolic-link creation privileges.
  fs.symlinkSync(outside, path.join(media, 'linked-pack'), 'junction');
  assert.equal(resolveAttachmentFile(media, 'rqk-attachment://linked-pack/private.txt'), null);
});

test('opens supported media and documents but never invokes imported software', () => {
  for (const name of ['map.PNG', 'notes.txt', 'handout.pdf', 'music.mp3', 'scene.webm']) {
    assert.equal(canOpenAttachmentExternally(name), true, name);
  }
  for (const name of ['program.exe', 'update.cmd', 'update.bat', 'script.ps1', 'script.js', 'shortcut.lnk', 'shortcut.url', 'page.html', 'image.svg', 'installer.msi', 'macro.docm', 'program.exe. ', 'notes.txt:run.exe', 'CON.pdf']) {
    assert.equal(canOpenAttachmentExternally(name), false, name);
  }
});

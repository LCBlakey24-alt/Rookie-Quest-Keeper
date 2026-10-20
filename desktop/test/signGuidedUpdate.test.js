'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { isWithin, plainPath, findStageRoot, readConfig } = require('../tools/sign-guided-update');

test('only finds complete, extracted staging directories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keeper-sign-stage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'Keeper-Application-For-Signing', 'desktop');
  fs.mkdirSync(path.join(app, 'renderer'), { recursive: true });
  assert.throws(() => findStageRoot(root), /Extract/);
  for (const file of ['main.js', 'preload.js', 'package.json']) fs.writeFileSync(path.join(app, file), '{}');
  fs.writeFileSync(path.join(app, 'renderer', 'index.html'), '<!doctype html>');
  assert.equal(findStageRoot(root), app);
  assert.equal(findStageRoot(app), app);
});

test('checks safe path boundaries and handles pasted quoted paths', () => {
  const root = path.resolve('some-dir');
  assert.equal(isWithin(path.join(root, 'sub'), root), true);
  assert.equal(isWithin(path.resolve('some-directory'), root), false);
  assert.equal(plainPath(' "C:\\A B\\file" '), 'C:\\A B\\file');
  assert.equal(plainPath('simple path'), 'simple path');
});

test('invalid or nonexistent path-only config has safe defaults', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'keeper-sign-config-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const file = path.join(temp, 'config.json');
  assert.deepEqual(readConfig(file), { keyFile: '', outputRoot: '' });
  fs.writeFileSync(file, '{broken');
  assert.deepEqual(readConfig(file), { keyFile: '', outputRoot: '' });
  fs.writeFileSync(file, JSON.stringify({ keyFile: 'C:\\private\\key', outputRoot: 'D:\\OneDrive', rawKey: 'MUST NOT BE USED' }));
  assert.deepEqual(readConfig(file), { keyFile: 'C:\\private\\key', outputRoot: 'D:\\OneDrive' });
});
